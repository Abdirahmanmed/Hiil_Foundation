import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import Input from "../components/ui/Input";
import { PrimaryButton, GhostButton } from "../components/ui/Button";

import { acceptInviteApi } from "../api/auth.api";

// Les libelles passent par t() avec une valeur de repli : la page est utilisable
// dans les quatre langues des maintenant, et les cles pourront etre traduites
// sans toucher a ce fichier.
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

export default function SetPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const m = useMutation({
    mutationFn: acceptInviteApi,
    onSuccess: () => {
      toast.success(
        t("activation.success", "Compte activé. Connectez-vous avec votre mot de passe."),
      );
      nav("/login", { replace: true });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          t("activation.error", "Lien d'invitation invalide ou expiré."),
      );
    },
  });

  const canSubmit = useMemo(
    () =>
      Boolean(token) &&
      password.length >= 8 &&
      password === confirmPassword &&
      !m.isPending,
    [token, password, confirmPassword, m.isPending],
  );

  function onSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      return toast.error(t("activation.tooShort", "Minimum 8 caractères."));
    }
    if (password !== confirmPassword) {
      return toast.error(
        t("activation.mismatch", "Les mots de passe ne correspondent pas."),
      );
    }
    m.mutate({ token, password, confirmPassword });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Brand />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="relative overflow-hidden border border-emerald-100 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.25)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />

          <div className="relative">
            <div className="text-2xl font-black tracking-tight text-slate-900">
              {t("activation.title", "Activer votre compte")}
            </div>
            <p className="mt-2 max-w-prose text-sm text-slate-600">
              {t(
                "activation.intro",
                "Choisissez votre mot de passe. Personne d'autre que vous ne le connaîtra — pas même la personne qui a créé ce compte.",
              )}
            </p>

            {!token ? (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {t(
                  "activation.missingToken",
                  "Ce lien est incomplet. Ouvrez le lien exact reçu par email, ou demandez un nouvel envoi à votre administrateur.",
                )}
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-5">
                <Field
                  label={t("activation.password", "Nouveau mot de passe")}
                  hint={t("activation.minChars", "8 caractères minimum")}
                >
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <Field label={t("activation.confirm", "Confirmer le mot de passe")}>
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <PrimaryButton
                    type="submit"
                    loading={m.isPending}
                    disabled={!canSubmit}
                  >
                    {t("activation.submit", "Activer mon compte")}
                  </PrimaryButton>

                  <GhostButton type="button" onClick={() => nav("/login")}>
                    {t("login", "Se connecter")}
                  </GhostButton>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
