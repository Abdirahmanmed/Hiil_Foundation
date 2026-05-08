import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import Input from "../components/ui/Input";
import { PrimaryButton, GhostButton } from "../components/ui/Button";
import { verifyOtpApi } from "../api/otp.api";

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

export default function OtpVerify() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { state } = useLocation();

  const [email, setEmail] = useState(state?.email || "");
  const [code, setCode] = useState("");

  const codeRef = useRef(null);

  // Focus auto sur le champ OTP
  useEffect(() => {
    codeRef.current?.focus?.();
  }, []);

  const m = useMutation({
    mutationFn: verifyOtpApi,
    onSuccess: () => {
      toast.success(t("otp_verified"));
      localStorage.setItem("invite_after_login", "1");
      nav("/login", { state: { email } });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("otp_invalid")),
  });

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && /^\d{6}$/.test(code) && !m.isPending;
  }, [email, code, m.isPending]);

  function onSubmit(e) {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) return toast.error(t("email_required"));
    if (!/^\d{6}$/.test(code)) return toast.error(t("otp_code_6_digits"));

    m.mutate({ email: cleanEmail, code });
  }

  // UX: quand l'utilisateur atteint 6 chiffres => submit auto
  useEffect(() => {
    if (/^\d{6}$/.test(code) && email.trim() && !m.isPending) {
      const id = setTimeout(() => {
        m.mutate({ email: email.trim(), code });
      }, 120);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Brand />
          <div className="text-xs font-semibold text-slate-500">
            {t("step_2_2")}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="relative overflow-hidden border border-emerald-100 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.25)]">
          {/* soft gradient */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {t("otp_title")}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {t("otp_desc_full")}
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

              <Field label={t("otp_code")} hint={t("otp_6_digits")}>
                <Input
                  ref={codeRef}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={t("otp_placeholder")}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{t("otp_tip")}</span>
                  <span className="font-bold text-slate-700">
                    {code.length}/6
                  </span>
                </div>
              </Field>

              <div className="grid gap-3 md:grid-cols-3">
                <PrimaryButton
                  type="submit"
                  loading={m.isPending}
                  disabled={!canSubmit}
                >
                  {t("verify")}
                </PrimaryButton>

                <GhostButton
                  type="button"
                  onClick={() => nav("/login", { state: { email } })}
                >
                  {t("login")}
                </GhostButton>

                <GhostButton type="button" onClick={() => nav(-1)}>
                  {t("back")}
                </GhostButton>
              </div>

              <p className="text-xs text-slate-500">{t("otp_footer")}</p>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
