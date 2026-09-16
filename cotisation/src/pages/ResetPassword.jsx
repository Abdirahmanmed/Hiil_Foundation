import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import Input from "../components/ui/Input";
import { PrimaryButton, GhostButton } from "../components/ui/Button";

import { forgotPasswordApi, resetPasswordApi } from "../api/auth.api";

/**
 * Une seule page pour les deux moitiés du parcours : sans jeton dans l'URL on
 * demande l'email, avec un jeton on choisit le nouveau mot de passe. Deux pages
 * pour un même parcours se désynchronisent toujours à la longue.
 */
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

export default function ResetPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

  const demande = useMutation({
    mutationFn: forgotPasswordApi,
    // Toujours le même retour : cette page ne doit pas permettre de savoir
    // quelles adresses ont un compte.
    onSuccess: () => setDemandeEnvoyee(true),
    onError: () => setDemandeEnvoyee(true),
  });

  const reinit = useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      toast.success(
        t("reset.success", "Mot de passe réinitialisé. Connectez-vous."),
      );
      nav("/login", { replace: true });
    },
    onError: (err) =>
      toast.error(
        err?.response?.data?.message ||
          t("reset.error", "Lien invalide ou expiré."),
      ),
  });

  function submitDemande(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error(t("email_invalid", "Adresse email invalide."));
    }
    demande.mutate({ email: email.trim() });
  }

  function submitReinit(e) {
    e.preventDefault();
    if (password.length < 8) {
      return toast.error(t("reset.tooShort", "Minimum 8 caractères."));
    }
    if (password !== confirmPassword) {
      return toast.error(
        t("reset.mismatch", "Les mots de passe ne correspondent pas."),
      );
    }
    reinit.mutate({ token, password, confirmPassword });
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
              {token
                ? t("reset.titleChoose", "Nouveau mot de passe")
                : t("reset.titleAsk", "Mot de passe oublié")}
            </div>

            {token ? (
              <form onSubmit={submitReinit} className="mt-6 space-y-5">
                <p className="max-w-prose text-sm text-slate-600">
                  {t(
                    "reset.introChoose",
                    "Choisissez votre nouveau mot de passe. Toutes vos sessions ouvertes seront fermées.",
                  )}
                </p>
                <Field
                  label={t("reset.password", "Nouveau mot de passe")}
                  hint={t("reset.minChars", "8 caractères minimum")}
                >
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <Field label={t("reset.confirm", "Confirmer")}>
                  <Input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <PrimaryButton type="submit" loading={reinit.isPending}>
                    {t("reset.submit", "Valider")}
                  </PrimaryButton>
                  <GhostButton type="button" onClick={() => nav("/login")}>
                    {t("login", "Se connecter")}
                  </GhostButton>
                </div>
              </form>
            ) : demandeEnvoyee ? (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                {t(
                  "reset.sent",
                  "Si un compte existe pour cette adresse, un email vient d'être envoyé. Le lien est valable une heure.",
                )}
              </div>
            ) : (
              <form onSubmit={submitDemande} className="mt-6 space-y-5">
                <p className="max-w-prose text-sm text-slate-600">
                  {t(
                    "reset.introAsk",
                    "Saisissez votre adresse email. Si un compte existe, vous recevrez un lien pour choisir un nouveau mot de passe.",
                  )}
                </p>
                <Field label={t("email", "Email")}>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                    required
                  />
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <PrimaryButton type="submit" loading={demande.isPending}>
                    {t("reset.send", "Envoyer le lien")}
                  </PrimaryButton>
                  <GhostButton type="button" onClick={() => nav("/login")}>
                    {t("back", "Retour")}
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
