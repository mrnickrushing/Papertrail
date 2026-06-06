import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useState, useEffect } from "react";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/pages/DashboardLayout";
import OverviewPage from "@/pages/OverviewPage";
import SyncPage from "@/pages/SyncPage";
import ShareLinksPage from "@/pages/ShareLinksPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import UsersPage from "@/pages/UsersPage";
import NotificationsPage from "@/pages/NotificationsPage";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [auth, setAuth] = useState<AuthState>("loading");

  useEffect(() => {
    fetch("/api/admin/check", { credentials: "include" })
      .then((r) => setAuth(r.ok ? "authenticated" : "unauthenticated"))
      .catch(() => setAuth("unauthenticated"));
  }, []);

  if (auth === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink1)", color: "var(--ash)" }}>
        Loading…
      </div>
    );
  }

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/">
          {auth === "authenticated" ? <Redirect to="/dashboard" /> : <LoginPage onLogin={() => setAuth("authenticated")} />}
        </Route>
        <Route path="/dashboard">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><OverviewPage /></DashboardLayout>}
        </Route>
        <Route path="/dashboard/sync">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><SyncPage /></DashboardLayout>}
        </Route>
        <Route path="/dashboard/share-links">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><ShareLinksPage /></DashboardLayout>}
        </Route>
        <Route path="/dashboard/analytics">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><AnalyticsPage /></DashboardLayout>}
        </Route>
        <Route path="/dashboard/users">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><UsersPage /></DashboardLayout>}
        </Route>
        <Route path="/dashboard/notifications">
          {auth === "unauthenticated" ? <Redirect to="/" /> : <DashboardLayout onLogout={() => setAuth("unauthenticated")}><NotificationsPage /></DashboardLayout>}
        </Route>
      </Switch>
    </WouterRouter>
  );
}
