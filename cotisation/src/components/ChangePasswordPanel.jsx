import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { changePassword } from "../api/auth.api";
import Input from "./ui/Input";
import { GhostButton, PrimaryButton } from "./ui/Button";

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-sm font-bold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({ value, onChange, autoComplete, label }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        aria-label={label}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 transition hover:bg-emerald-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        aria-label={
          visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
        }
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default function ChangePasswordPanel({ onCancel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      toast.success(data?.message || t("account.passwordChangedSuccess"));
      setForm(initialForm);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || t("account.passwordChangeError"),
      );
    },
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  function validate() {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error(t("account.requiredFields"));
      return false;
    }

    if (form.newPassword.length < 8) {
      toast.error(t("account.minimum8Characters"));
      return false;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error(t("account.passwordsDoNotMatch"));
      return false;
    }

    if (form.newPassword === form.currentPassword) {
      toast.error(t("account.newPasswordMustBeDifferent"));
      return false;
    }

    return true;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  function resetForm() {
    setForm(initialForm);
    onCancel?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-slate-600">
        <div className="font-black text-slate-900">{t("account.security")}</div>
        <p className="mt-1">{t("account.changePasswordHelp")}</p>
      </div>

      <Field label={t("account.currentPassword")}>
        <PasswordInput
          value={form.currentPassword}
          onChange={(e) => setField("currentPassword", e.target.value)}
          autoComplete="current-password"
          label={t("account.currentPassword")}
        />
      </Field>

      <Field label={t("account.newPassword")}>
        <PasswordInput
          value={form.newPassword}
          onChange={(e) => setField("newPassword", e.target.value)}
          autoComplete="new-password"
          label={t("account.newPassword")}
        />
        <p className="text-xs font-semibold text-slate-500">
          {t("account.minimum8Characters")}
        </p>
      </Field>

      <Field label={t("account.confirmNewPassword")}>
        <PasswordInput
          value={form.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          autoComplete="new-password"
          label={t("account.confirmNewPassword")}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryButton type="submit" loading={mutation.isPending}>
          {t("account.changePassword")}
        </PrimaryButton>
        <GhostButton
          type="button"
          onClick={resetForm}
          disabled={mutation.isPending}
        >
          {t("account.cancelReset")}
        </GhostButton>
      </div>
    </form>
  );
}
