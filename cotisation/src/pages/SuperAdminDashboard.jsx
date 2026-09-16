import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import { PrimaryButton, GhostButton } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import {
  createOugasAdmin,
  getOugasAdmins,
  resendOugasInvite,
} from "../api/bootstrap.api";

/**
 * L'ecran du compte d'amorcage. Une liste, un formulaire, rien d'autre.
 *
 * Sa pauvrete est le sujet : ce compte peut nommer celui qui approuve l'argent,
 * donc il ne doit voir aucun montant. Tout ce qui ressemblerait a un tableau de
 * bord ici serait un pouvoir de plus donne a celui qui distribue les pouvoirs.
 */

const VIDE = { fullName: "", email: "", phone: "" };

const tonePerStatus = {
  ACTIVE: "green",
  PENDING_VERIFICATION: "yellow",
  SUSPENDED: "red",
  BLOCKED: "red",
};

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-");

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(VIDE);

  const qOugas = useQuery({
    queryKey: ["bootstrap", "ougas-admins"],
    queryFn: getOugasAdmins,
  });

  const ougasAdmins = qOugas.data?.ougasAdmins || [];

  const mCreate = useMutation({
    mutationFn: () => createOugasAdmin(form),
    onSuccess: (data) => {
      // Le compte existe meme quand l'email n'est pas parti : le dire, plutot
      // que d'annoncer une invitation envoyee que personne ne recevra.
      if (data?.ougasAdmin?.invitationSent === false) {
        toast(t("superAdmin.createdNoMail"), { icon: "⚠️" });
      } else {
        toast.success(t("superAdmin.created"));
      }
      setForm(VIDE);
      qc.invalidateQueries({ queryKey: ["bootstrap", "ougas-admins"] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const mResend = useMutation({
    mutationFn: (userId) => resendOugasInvite(userId),
    onSuccess: () => {
      toast.success(t("superAdmin.resent"));
      qc.invalidateQueries({ queryKey: ["bootstrap", "ougas-admins"] });
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const champManquant =
    !form.fullName.trim() || !form.email.trim() || !form.phone.trim();

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader
        userLabel={`${user?.fullName || user?.email || ""} • ${t("superAdmin.roleLabel")}`}
        onLogout={logout}
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-black text-slate-900">
          {t("superAdmin.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("superAdmin.subtitle")}
        </p>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-black text-slate-900">
            {t("superAdmin.createTitle")}
          </h2>

          <form
            className="mt-4 grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!champManquant) mCreate.mutate();
            }}
          >
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder={t("superAdmin.fullName")}
              autoComplete="off"
            />
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("superAdmin.email")}
              autoComplete="off"
            />
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={t("superAdmin.phone")}
              autoComplete="off"
            />

            <div className="md:col-span-3">
              <PrimaryButton
                type="submit"
                loading={mCreate.isPending}
                disabled={champManquant}
              >
                {t("superAdmin.submit")}
              </PrimaryButton>
            </div>
          </form>

          <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-slate-600">
            {t("superAdmin.passwordNotice")}
          </p>
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="text-lg font-black text-slate-900">
            {t("superAdmin.listTitle")}
          </h2>

          {qOugas.isLoading ? (
            <div className="mt-4 text-sm text-slate-500">{t("loading")}</div>
          ) : !ougasAdmins.length ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
              {t("superAdmin.empty")}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {ougasAdmins.map((o) => (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-slate-900">
                      {o.fullName}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {o.email}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {t("superAdmin.colCreated")} {fmtDate(o.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={tonePerStatus[o.status] || "neutral"}>
                      {t(`enumStatus.${o.status}`, o.status)}
                    </Badge>

                    {o.status === "PENDING_VERIFICATION" ? (
                      <GhostButton
                        type="button"
                        className="w-auto px-3 py-2 text-xs"
                        disabled={mResend.isPending}
                        onClick={() => mResend.mutate(o.id)}
                      >
                        {t("superAdmin.resend")}
                      </GhostButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
