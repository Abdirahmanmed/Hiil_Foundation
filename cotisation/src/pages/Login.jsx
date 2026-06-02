import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import Input from "../components/ui/Input";
import { PrimaryButton, GhostButton } from "../components/ui/Button";

import { loginApi } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";
import { getDashboardPath } from "../components/routeUtils";
import { logPerf, nowMs, roundDurationMs } from "../utils/perf";

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState(state?.email || "");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: async (payload) => {
      const start = nowMs();
      try {
        const data = await loginApi(payload);
        logPerf("frontend.login.api", { durationMs: roundDurationMs(start) });
        return data;
      } catch (err) {
        logPerf("frontend.login.api", {
          durationMs: roundDurationMs(start),
          status: err?.response?.status || "network_error",
        });
        throw err;
      }
    },
    onSuccess: (data) => {
      const redirectStart = nowMs();
      login(data);
      toast.success(t("login_success"));

      // ✅ si nouveau client qui vient de valider OTP → propose invitation
      const inviteAfter = localStorage.getItem("invite_after_login") === "1";
      let targetPath = getDashboardPath(data.user.role);

      if (inviteAfter && data.user.role === "CLIENT") {
        localStorage.removeItem("invite_after_login");
        targetPath = "/invite";
      }

      logPerf("frontend.login.redirect", {
        durationMs: roundDurationMs(redirectStart),
        role: data.user.role,
        targetPath,
      });
      nav(targetPath, { replace: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || t("login_error"));
    },
  });

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 0 && password.trim().length > 0 && !m.isPending
    );
  }, [email, password, m.isPending]);

  function onSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return toast.error(t("fill_required"));
    }
    logPerf("frontend.login.submit", { hasEmail: true });
    m.mutate({ email: email.trim(), password });
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Brand />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="relative overflow-hidden border border-emerald-100 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.25)]">
          {/* soft gradient */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {t("login")}
            </div>
            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <Field label={t("email")} hint={t("required")}>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("email")}
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>

              <Field label={t("password")} hint={t("required")}>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-3">
                <PrimaryButton
                  type="submit"
                  loading={m.isPending}
                  disabled={!canSubmit}
                >
                  {t("login")}
                </PrimaryButton>

                <GhostButton type="button" onClick={() => nav("/register")}>
                  {t("create_account")}
                </GhostButton>

                <GhostButton type="button" onClick={() => nav(-1)}>
                  {t("back")}
                </GhostButton>
              </div>

              {m.isPending ? (
                <p className="text-xs font-semibold text-emerald-700">
                  Connexion en cours, redirection vers votre dashboard...
                </p>
              ) : null}
              <p className="text-xs text-slate-500">{t("login_hint")}</p>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
