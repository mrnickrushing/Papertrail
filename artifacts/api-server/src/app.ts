import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { store } from "./routes/filetrail.js";
import { logger } from "./lib/logger.js";
import { createHash, timingSafeEqual } from "node:crypto";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const COOKIE_NAME = "pt_admin_session";
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 86400 * 7 };

function hashPassword(pw: string): string {
  return createHash("sha256").update(`pt_admin:${pw}`).digest("hex");
}

app.post("/api/admin/login", (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) { res.status(503).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  if (!password) { res.status(400).json({ error: "password required" }); return; }
  const expected = Buffer.from(hashPassword(adminPw));
  const actual = Buffer.from(hashPassword(String(password)));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }
  res.cookie(COOKIE_NAME, hashPassword(adminPw), COOKIE_OPTS);
  res.json({ ok: true });
});

app.get("/api/admin/check", (req: Request, res: Response) => {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) { res.status(503).json({ error: "ADMIN_PASSWORD not configured" }); return; }
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  const expected = Buffer.from(hashPassword(adminPw));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  res.json({ ok: true });
});

app.post("/api/admin/logout", (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.use("/api", router);

store.init().catch(err => logger.error({ err }, "Failed to initialise FileTrail store"));

export default app;
