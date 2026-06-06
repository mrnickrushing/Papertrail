import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import filetrailRouter from "./filetrail.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/v1", filetrailRouter);

export default router;
