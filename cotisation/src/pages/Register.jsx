import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { PrimaryButton, GhostButton } from "../components/ui/Button";
import Brand from "../components/Brand";
import { registerApi } from "../api/auth.api";

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

function FileBox({ title, subtitle, name, accept, required = true }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="text-sm font-extrabold text-slate-800">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      <input
        name={name}
        type="file"
        accept={accept}
        className="mt-3 w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-xs file:font-black file:text-white hover:file:bg-emerald-700"
        required={required}
      />
    </div>
  );
}

export default function Register() {
  const { t } = useTranslation();
  const nav = useNavigate();

  const [accepted, setAccepted] = useState(false);

  // ✅ Backend attendu: CLIENT_ADHERENT | ASSOCIATION
  const [accountType, setAccountType] = useState("CLIENT_ADHERENT");
  const [representativeType, setRepresentativeType] = useState("");
  const isAssociation = accountType === "ASSOCIATION";

  const m = useMutation({
    mutationFn: registerApi,
    onSuccess: (data) => {
      toast.success(t("register_success_otp_sent"));
      nav("/otp", { state: { email: data?.user?.email } });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || t("register_error"));
    },
  });

  const canSubmit = useMemo(
    () => accepted && !m.isPending,
    [accepted, m.isPending],
  );

  function onSubmit(e) {
    e.preventDefault();

    if (!accepted) {
      return toast.error(t("must_accept_terms"));
    }

    const fd = new FormData(e.currentTarget);

    if (isAssociation) {
      const password = fd.get("password");
      const confirmPassword = fd.get("confirmPassword");
      const presidentIdDoc = fd.get("presidentIdDoc");

      if (password !== confirmPassword) {
        return toast.error(t("passwords_mismatch"));
      }

      if (!fd.get("country")) {
        return toast.error(t("country_required"));
      }

      if (!fd.get("representativeType")) {
        return toast.error(t("representative_type_required"));
      }

      const representativeRequiredFields = [
        "representativeName",
        "representativePhone",
        "representativeAddress",
        "representativeEmail",
      ];

      if (representativeRequiredFields.some((field) => !fd.get(field))) {
        return toast.error(t("representative_fields_required"));
      }

      if (!presidentIdDoc || presidentIdDoc.size === 0) {
        return toast.error(t("president_id_doc_required"));
      }
    }

    // ✅ NOMS EXACTS BACKEND
    fd.set("accountType", accountType);
    fd.set("acceptedConditions", "true");

    if (isAssociation) {
      fd.delete("fullName");
      fd.delete("phone2");
      fd.delete("idDoc");
      fd.delete("selfie");
      fd.delete("consentAccepted");
    } else {
      fd.delete("companyName");
      fd.delete("phone2");
      fd.delete("commune");
      fd.delete("associationStatus");
      fd.delete("representativeType");
      fd.delete("representativeName");
      fd.delete("representativePhone");
      fd.delete("representativeAddress");
      fd.delete("representativeEmail");
      fd.delete("presidentIdDoc");
      fd.delete("confirmPassword");
    }

    m.mutate(fd);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Brand />
          <div className="hidden text-xs font-semibold text-slate-500 md:block">
            {t("step_1_2")}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card className="relative overflow-hidden border border-emerald-100 bg-white p-7 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.25)]">
          {/* soft gradient */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight text-slate-900">
                {t("register_title")}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {t("register_subtitle")}
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500 md:hidden">
              {t("step_1_2")}
            </div>
          </div>

          <form onSubmit={onSubmit} className="relative mt-8 space-y-6">
            {/* Account Type */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("account_type")} hint={t("required")}>
                <Select
                  value={accountType}
                  onChange={(e) => {
                    setAccountType(e.target.value);
                    setRepresentativeType("");
                  }}
                  className="border-emerald-100 bg-white text-slate-800 focus:border-emerald-400 focus:ring-emerald-200"
                >
                  <option value="CLIENT_ADHERENT">
                    {t("account_type_client")}
                  </option>
                  <option value="ASSOCIATION">
                    {t("account_type_association")}
                  </option>
                </Select>
              </Field>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-slate-600">
                {isAssociation ? t("association_hint") : t("client_hint")}
              </div>
            </div>

            {/* =========================
                ASSOCIATION
               ========================= */}
            {isAssociation ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("association_name")} hint={t("required")}>
                    <Input
                      name="companyName"
                      placeholder={t("association_name_ph")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("association_phone")} hint={t("required")}>
                    <Input
                      name="phone"
                      placeholder={t("phone_placeholder")}
                      inputMode="tel"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("email")} hint={t("required")}>
                    <Input
                      name="email"
                      placeholder={t("email_placeholder")}
                      type="email"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("country")} hint={t("required")}>
                    <Select
                      name="country"
                      defaultValue=""
                      required
                      className="border-emerald-100 bg-white text-slate-800 focus:border-emerald-400 focus:ring-emerald-200"
                    >
                      <option value="" disabled>
                        {t("choose_country_first")}
                      </option>
                      <option value="Djibouti">Djibouti</option>
                      <option value="Ethiopie">Ethiopie</option>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("city")} hint={t("required")}>
                    <Input
                      name="city"
                      placeholder={t("city_placeholder")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("commune")} hint={t("optional")}>
                    <Input
                      name="commune"
                      placeholder={t("commune_ph")}
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("representative_type")} hint={t("required")}>
                    <Select
                      name="representativeType"
                      value={representativeType}
                      onChange={(e) => setRepresentativeType(e.target.value)}
                      required
                      className="border-emerald-100 bg-white text-slate-800 focus:border-emerald-400 focus:ring-emerald-200"
                    >
                      <option value="" disabled>
                        {t("representative_type_ph")}
                      </option>
                      <option value="PRESIDENT">
                        {t("representative_president")}
                      </option>
                      <option value="SECRETAIRE_GENERAL">
                        {t("representative_secretary_general")}
                      </option>
                      <option value="VICE_PRESIDENT">
                        {t("representative_vice_president")}
                      </option>
                    </Select>
                  </Field>
                </div>

                {representativeType ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label={t("representative_name")}
                      hint={t("required")}
                    >
                      <Input
                        name="representativeName"
                        placeholder={t("representative_name_ph")}
                        required
                        className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                      />
                    </Field>

                    <Field
                      label={t("representative_phone")}
                      hint={t("required")}
                    >
                      <Input
                        name="representativePhone"
                        placeholder={t("phone_placeholder")}
                        inputMode="tel"
                        required
                        className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                      />
                    </Field>

                    <Field
                      label={t("representative_address")}
                      hint={t("required")}
                    >
                      <Input
                        name="representativeAddress"
                        placeholder={t("representative_address_ph")}
                        required
                        className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                      />
                    </Field>

                    <Field
                      label={t("representative_email")}
                      hint={t("required")}
                    >
                      <Input
                        name="representativeEmail"
                        placeholder={t("email_placeholder")}
                        type="email"
                        required
                        className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                      />
                    </Field>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("association_status")} hint={t("required")}>
                    <Input
                      name="associationStatus"
                      placeholder={t("association_status_ph")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <FileBox
                    title={t("president_id_doc")}
                    subtitle={t("president_id_doc_hint")}
                    name="presidentIdDoc"
                    accept="image/*,application/pdf"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("password")} hint={t("password_hint")}>
                    <Input
                      name="password"
                      placeholder="********"
                      type="password"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("confirm_password")} hint={t("required")}>
                    <Input
                      name="confirmPassword"
                      placeholder="********"
                      type="password"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>
              </>
            ) : (
              /* =========================
                  CLIENT_ADHERENT
                 ========================= */
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("full_name")} hint={t("required")}>
                    <Input
                      name="fullName"
                      placeholder={t("full_name_placeholder")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("phone")} hint={t("phone_hint")}>
                    <Input
                      name="phone"
                      placeholder={t("phone_placeholder")}
                      inputMode="tel"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("email")} hint={t("required")}>
                    <Input
                      name="email"
                      placeholder={t("email_placeholder")}
                      type="email"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("password")} hint={t("password_hint")}>
                    <Input
                      name="password"
                      placeholder="********"
                      type="password"
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t("country")} hint={t("required")}>
                    <Input
                      name="country"
                      placeholder={t("country_placeholder")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>

                  <Field label={t("city")} hint={t("required")}>
                    <Input
                      name="city"
                      placeholder={t("city_placeholder")}
                      required
                      className="border-emerald-100 bg-white text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-200"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FileBox
                    title={t("id_doc")}
                    subtitle={t("id_doc_hint")}
                    name="idDoc"
                    accept="image/*,application/pdf"
                    required
                  />
                  <FileBox
                    title={t("selfie")}
                    subtitle={t("selfie_hint")}
                    name="selfie"
                    accept="image/*"
                    required
                  />
                </div>
              </>
            )}

            {/* Terms */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-emerald-200 bg-white text-emerald-600 focus:ring-emerald-200"
                />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {t("accept_terms")}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {t("accept_terms_hint")}
                  </div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="grid gap-3 md:grid-cols-2">
              <PrimaryButton
                type="submit"
                loading={m.isPending}
                disabled={!canSubmit}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {t("submit_register")}
              </PrimaryButton>

              <GhostButton
                type="button"
                onClick={() => nav(-1)}
                className="border-emerald-200 text-slate-800 hover:bg-emerald-50"
              >
                {t("back")}
              </GhostButton>
            </div>

            <p className="text-xs text-slate-500">
              {t("register_footer_note")}
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
