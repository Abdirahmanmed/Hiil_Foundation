import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import DashboardTabs from "../components/DashboardTabs";
import { SimpleBarChart, SimplePieChart } from "../components/DashboardCharts";
import { statusRowsToChart } from "../components/chartUtils";
import { useAuth } from "../context/AuthContext";
import { getAdminDashboard } from "../api/admin.api";
import { approveExpense, getExpenses, rejectExpense } from "../api/expenses.api";
import { logPerf } from "../utils/perf";

const statusTones = { EN_ATTENTE: "yellow", APPROUVER: "blue", EFFECTUER: "green", REJETER: "red", CREE: "yellow", IMPRIME: "green" };
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-");
const fmtMoney = (v) => Number(v || 0).toLocaleString("fr-FR");

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
      <div className="text-xs font-black text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function MiniList({ title, items, render, t }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-xl font-black text-slate-900">{title}</h2>
      <div className="space-y-3">
        {items.map(render)}
        {!items.length && (
          <div className="rounded-2xl border border-emerald-100 px-4 py-6 text-center text-sm text-slate-500">
            {t("common.noData")}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function OugasAdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");

  const qStats = useQuery({ queryKey: ["admin-dashboard", "ougas-admin"], queryFn: getAdminDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses", "ougas-admin"], queryFn: getExpenses, enabled: tab === "expenses" });

  useEffect(() => {
    if (qStats.isSuccess) {
      logPerf("dashboard.ougasAdmin.firstDataLoad", {
        endpoint: "/api/admin/dashboard",
        latestUsers: qStats.data?.stats?.latestUsers?.length || 0,
        latestSubscriptions: qStats.data?.stats?.latestSubscriptions?.length || 0,
        latestExpenses: qStats.data?.stats?.latestExpenses?.length || 0,
      });
    }
  }, [qStats.isSuccess, qStats.data]);

  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];
  const byStatus = useMemo(() => stats?.expensesByStatus || [], [stats]);
  const paymentOrdersByStatus = useMemo(() => stats?.paymentOrdersByStatus || [], [stats]);

  const expenseStatusChartData = useMemo(
    () => statusRowsToChart(byStatus, (status) => t(`enumStatus.${status}`, status)),
    [byStatus, t],
  );
  const paymentOrderStatusChartData = useMemo(
    () => statusRowsToChart(paymentOrdersByStatus, (status) => t(`enumStatus.${status}`, status)),
    [paymentOrdersByStatus, t],
  );
  const subscriptionFrequencyChartData = useMemo(() => [
    { name: t("ougasAdmin.charts.monthly"), value: Number(stats?.monthlySubscriptionsCount || 0) },
    { name: t("ougasAdmin.charts.annual"),  value: Number(stats?.annualSubscriptionsCount  || 0) },
  ], [stats, t]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const approveMut = useMutation({
    mutationFn: ({ id, password }) => approveExpense(id, password),
    onSuccess: (data) => { toast.success(data?.message || t("validation.expenseApproved")); refresh(); },
    onError:   (e)    => toast.error(e?.response?.data?.message || t("validation.approveError")),
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, reason }) => rejectExpense(id, reason),
    onSuccess: (data) => { toast.success(data?.message || t("validation.expenseRejected")); refresh(); },
    onError:   (e)    => toast.error(e?.response?.data?.message || t("validation.rejectError")),
  });

  // Approuver engage une sortie d'argent : on redemande le mot de passe. C'est
  // le second facteur que l'ancien jeton n'apportait pas — il était généré par
  // le serveur à l'instant même de l'approbation.
  const askApprove = (expense) => {
    // Le compte à payer est affiché ICI, au moment de la décision : approuver
    // un bénéficiaire sans voir où l'argent part, c'est approuver à l'aveugle.
    const compte = expense.beneficiaryBankName
      ? `${expense.beneficiaryBankName} — ${expense.beneficiaryAccountRef || "?"} (${expense.beneficiaryAccountHolder || expense.beneficiaryName})`
      : t("validation.noAccount", "espèces / aucun compte déclaré");

    const password = window.prompt(
      `${expense.label} — ${expense.amount}\n` +
        `${t("expenses.beneficiary", "Bénéficiaire")} : ${expense.beneficiaryName}\n` +
        `${t("expenses.payTo", "Compte à payer")} : ${compte}\n\n` +
        t("validation.approvePrompt", "Confirmez votre mot de passe pour approuver :"),
    );
    if (!password) return;
    approveMut.mutate({ id: expense.id, password });
  };

  const askReject = (expense) => {
    const reason = window.prompt(
      t("validation.rejectPrompt", "Motif du rejet (3 caractères minimum) :"),
    );
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast.error(t("validation.reasonTooShort", "Motif trop court."));
      return;
    }
    rejectMut.mutate({ id: expense.id, reason: reason.trim() });
  };
  const actionPending = approveMut.isPending || rejectMut.isPending;

  const expenseTableHeaders = [
    t("common.date"),
    t("common.type"),
    t("expenses.label"),
    t("common.amount"),
    t("expenses.beneficiary"),
    t("common.country"),
    t("common.city"),
    t("status"),
    t("ougasAdmin.createdBy"),
    t("actions"),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white">
      <DashboardHeader
        maxWidth="max-w-7xl"
        userLabel={`${user?.fullName || user?.email || ""} • ${t("ougasAdmin.roleLabel")}`}
        onLogout={logout}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <DashboardTabs
          className="mb-6"
          tabs={[
            { id: "dashboard", label: t("common.dashboard") },
            { id: "expenses", label: t("expenses.listTab") },
          ]}
          activeTab={tab}
          onChange={setTab}
        />

        {/* Dashboard tab */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{t("ougasAdmin.dashboardTitle")}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t("ougasAdmin.dashboardSubtitle")}</p>
                </div>
                {qStats.isLoading && <span className="text-sm text-slate-500">{t("common.loading")}</span>}
                {qStats.isError  && <span className="text-sm font-bold text-red-600">{t("common.loadingError")}</span>}
              </div>

              {/* Stat cards */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("ougasAdmin.stats.users")}               value={stats?.totalUsers} />
                <StatCard label={t("ougasAdmin.stats.adherents")}           value={stats?.adherentsCount} />
                <StatCard label={t("ougasAdmin.stats.associations")}        value={stats?.associationsCount} />
                <StatCard label={t("ougasAdmin.stats.subscriptions")}       value={stats?.totalSubscriptions} />
                <StatCard label={t("ougasAdmin.stats.monthlySubscriptions")} value={stats?.monthlySubscriptionsCount} hint={fmtMoney(stats?.monthlyCotisation)} />
                <StatCard label={t("ougasAdmin.stats.annualSubscriptions")} value={stats?.annualSubscriptionsCount} hint={fmtMoney(stats?.annualCotisation)} />
                <StatCard label={t("ougasAdmin.stats.totalCotisation")}     value={fmtMoney(stats?.totalCotisation)} />
                <StatCard label={t("ougasAdmin.stats.totalExpenses")}       value={fmtMoney(stats?.totalExpenses)} />
                <StatCard label={t("ougasAdmin.stats.approvedExpenses")}    value={stats?.approvedExpenses} />
                <StatCard label={t("ougasAdmin.stats.rejectedExpenses")}    value={stats?.rejectedExpenses} />
                <StatCard label={t("ougasAdmin.stats.pendingExpenses")}     value={stats?.pendingExpenses} />
                <StatCard label={t("ougasAdmin.stats.completedExpenses")}   value={stats?.completedExpenses} />
                <StatCard label={t("ougasAdmin.stats.paymentOrders")}       value={stats?.totalPaymentOrders} />
                <StatCard label={t("ougasAdmin.stats.paymentOrdersAmount")} value={fmtMoney(stats?.totalPaymentOrdersAmount)} />
              </div>

              {/* By-status mini cards */}
              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {byStatus.map((s) => (
                  <div key={s.status} className="rounded-2xl border border-emerald-100 bg-white p-4">
                    <Badge tone={statusTones[s.status]}>{t(`enumStatus.${s.status}`, s.status)}</Badge>
                    <div className="mt-2 font-black">{s.count} • {fmtMoney(s.amount)}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <SimplePieChart
                  title={t("ougasAdmin.charts.expensesByStatus")}
                  data={expenseStatusChartData}
                  emptyMessage={t("ougasAdmin.charts.noExpensesByStatus")}
                />
                <SimpleBarChart
                  title={t("ougasAdmin.charts.ordersByStatus")}
                  data={paymentOrderStatusChartData}
                  emptyMessage={t("ougasAdmin.charts.noOrdersByStatus")}
                />
                <SimpleBarChart
                  title={t("ougasAdmin.charts.subscriptions")}
                  data={subscriptionFrequencyChartData}
                  emptyMessage={t("ougasAdmin.charts.noSubscriptions")}
                />
              </div>
            </Card>

            {/* Mini lists */}
            <div className="grid gap-6 lg:grid-cols-2">
              <MiniList
                title={t("ougasAdmin.latestUsers")}
                items={stats?.latestUsers || []}
                t={t}
                render={(u) => (
                  <div key={u.id} className="rounded-2xl border border-emerald-100 p-4">
                    <div className="font-black text-slate-900">{u.companyName || u.fullName || u.email}</div>
                    <div className="text-xs text-slate-500">{u.role} • {u.accountType} • {fmtDate(u.createdAt)}</div>
                  </div>
                )}
              />
              <MiniList
                title={t("ougasAdmin.latestSubscriptions")}
                items={stats?.latestSubscriptions || []}
                t={t}
                render={(s) => (
                  <div key={s.id} className="rounded-2xl border border-emerald-100 p-4">
                    <div className="font-black text-slate-900">{s.user?.companyName || s.user?.fullName || s.user?.email || "-"}</div>
                    <div className="text-xs text-slate-500">{s.frequency} • {s.status} • {fmtMoney(s.amount)} {s.currency}</div>
                  </div>
                )}
              />
              <MiniList
                title={t("ougasAdmin.latestExpenses")}
                items={stats?.latestExpenses || []}
                t={t}
                render={(e) => (
                  <div key={e.id} className="rounded-2xl border border-emerald-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900">{e.label}</span>
                      <Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">{e.beneficiaryName} • {fmtMoney(e.amount)} • {fmtDate(e.createdAt)}</div>
                  </div>
                )}
              />
              <MiniList
                title={t("ougasAdmin.latestPaymentOrders")}
                items={stats?.latestPaymentOrders || []}
                t={t}
                render={(o) => (
                  <div key={o.id} className="rounded-2xl border border-emerald-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900">{o.referenceNumber}</span>
                      <Badge tone={statusTones[o.status]}>{t(`enumStatus.${o.status}`, o.status)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">{o.expense?.beneficiaryName} • {fmtMoney(o.amount)} {o.currency}</div>
                  </div>
                )}
              />
            </div>
          </div>
        )}

        {/* Expenses tab */}
        {tab === "expenses" && (
          <Card className="p-6">
            <h1 className="mb-4 text-2xl font-black text-slate-900">{t("ougasAdmin.allExpenses")}</h1>
            <div className="overflow-x-auto rounded-2xl border border-emerald-100">
              <table className="min-w-full divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600">
                  <tr>{expenseTableHeaders.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 bg-white">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3">{t(`expenseTypes.${e.type}`, e.type)}</td>
                      <td className="px-4 py-3 font-semibold">{e.label}</td>
                      <td className="px-4 py-3 font-black">{fmtMoney(e.amount)}</td>
                      <td className="px-4 py-3">{e.beneficiaryName}</td>
                      <td className="px-4 py-3">{e.beneficiaryCountry}</td>
                      <td className="px-4 py-3">{e.beneficiaryCity}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">{e.createdBy?.fullName || e.createdBy?.email || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"}
                            onClick={() => askApprove(e)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            {t("validation.approve")}
                          </button>
                          <button
                            disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"}
                            onClick={() => askReject(e)}
                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            {t("validation.reject")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!expenses.length && (
                    <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">{t("expenses.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
