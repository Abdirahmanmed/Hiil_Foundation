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

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");

  const qStats = useQuery({ queryKey: ["admin-dashboard", "super-admin"], queryFn: getAdminDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses", "super-admin"], queryFn: getExpenses, enabled: tab === "expenses" });

  useEffect(() => {
    if (qStats.isSuccess) {
      logPerf("dashboard.superAdmin.firstDataLoad", {
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
    { name: t("superAdmin.charts.monthly"), value: Number(stats?.monthlySubscriptionsCount || 0) },
    { name: t("superAdmin.charts.annual"),  value: Number(stats?.annualSubscriptionsCount  || 0) },
  ], [stats, t]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const approveMut = useMutation({
    mutationFn: approveExpense,
    onSuccess: (data) => { toast.success(data?.message || t("validation.expenseApproved")); refresh(); },
    onError:   (e)    => toast.error(e?.response?.data?.message || t("validation.approveError")),
  });
  const rejectMut = useMutation({
    mutationFn: rejectExpense,
    onSuccess: (data) => { toast.success(data?.message || t("validation.expenseRejected")); refresh(); },
    onError:   (e)    => toast.error(e?.response?.data?.message || t("validation.rejectError")),
  });
  const actionPending = approveMut.isPending || rejectMut.isPending;

<<<<<<< HEAD
  const expenseTableHeaders = [
    t("common.date"),
    t("common.type"),
    t("expenses.label"),
    t("common.amount"),
    t("expenses.beneficiary"),
    t("common.country"),
    t("common.city"),
    t("status"),
    t("superAdmin.createdBy"),
    t("actions"),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white">
      {/* Header */}
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden text-xs font-bold text-slate-600 md:block">
              {user?.fullName || user?.email} • {t("superAdmin.roleLabel")}
            </span>
            <button onClick={logout} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold">
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setTab("dashboard")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "dashboard" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
            {t("common.dashboard")}
          </button>
          <button onClick={() => setTab("expenses")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "expenses" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
            {t("expenses.listTab")}
          </button>
        </div>

        {/* Dashboard tab */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{t("superAdmin.dashboardTitle")}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t("superAdmin.dashboardSubtitle")}</p>
                </div>
                {qStats.isLoading && <span className="text-sm text-slate-500">{t("common.loading")}</span>}
                {qStats.isError  && <span className="text-sm font-bold text-red-600">{t("common.loadingError")}</span>}
              </div>

              {/* Stat cards */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("superAdmin.stats.users")}               value={stats?.totalUsers} />
                <StatCard label={t("superAdmin.stats.adherents")}           value={stats?.adherentsCount} />
                <StatCard label={t("superAdmin.stats.associations")}        value={stats?.associationsCount} />
                <StatCard label={t("superAdmin.stats.subscriptions")}       value={stats?.totalSubscriptions} />
                <StatCard label={t("superAdmin.stats.monthlySubscriptions")} value={stats?.monthlySubscriptionsCount} hint={fmtMoney(stats?.monthlyCotisation)} />
                <StatCard label={t("superAdmin.stats.annualSubscriptions")} value={stats?.annualSubscriptionsCount} hint={fmtMoney(stats?.annualCotisation)} />
                <StatCard label={t("superAdmin.stats.totalCotisation")}     value={fmtMoney(stats?.totalCotisation)} />
                <StatCard label={t("superAdmin.stats.totalExpenses")}       value={fmtMoney(stats?.totalExpenses)} />
                <StatCard label={t("superAdmin.stats.approvedExpenses")}    value={stats?.approvedExpenses} />
                <StatCard label={t("superAdmin.stats.rejectedExpenses")}    value={stats?.rejectedExpenses} />
                <StatCard label={t("superAdmin.stats.pendingExpenses")}     value={stats?.pendingExpenses} />
                <StatCard label={t("superAdmin.stats.completedExpenses")}   value={stats?.completedExpenses} />
                <StatCard label={t("superAdmin.stats.paymentOrders")}       value={stats?.totalPaymentOrders} />
                <StatCard label={t("superAdmin.stats.paymentOrdersAmount")} value={fmtMoney(stats?.totalPaymentOrdersAmount)} />
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
                  title={t("superAdmin.charts.expensesByStatus")}
                  data={expenseStatusChartData}
                  emptyMessage={t("superAdmin.charts.noExpensesByStatus")}
                />
                <SimpleBarChart
                  title={t("superAdmin.charts.ordersByStatus")}
                  data={paymentOrderStatusChartData}
                  emptyMessage={t("superAdmin.charts.noOrdersByStatus")}
                />
                <SimpleBarChart
                  title={t("superAdmin.charts.subscriptions")}
                  data={subscriptionFrequencyChartData}
                  emptyMessage={t("superAdmin.charts.noSubscriptions")}
                />
              </div>
            </Card>

            {/* Mini lists */}
            <div className="grid gap-6 lg:grid-cols-2">
              <MiniList
                title={t("superAdmin.latestUsers")}
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
                title={t("superAdmin.latestSubscriptions")}
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
                title={t("superAdmin.latestExpenses")}
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
                title={t("superAdmin.latestPaymentOrders")}
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
            <h1 className="mb-4 text-2xl font-black text-slate-900">{t("superAdmin.allExpenses")}</h1>
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
                            onClick={() => approveMut.mutate(e.id)}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                          >
                            {t("validation.approve")}
                          </button>
                          <button
                            disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"}
                            onClick={() => rejectMut.mutate(e.id)}
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
=======
  return <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-emerald-50 to-white"><DashboardHeader maxWidth="max-w-7xl" userLabel={<>{user?.fullName || user?.email} • { t("superAdmin.roleLabel") }</>} onLogout={logout} /><main className="mx-auto max-w-7xl px-4 py-8"><DashboardTabs className="mb-6" tabs={[{ id: "dashboard", label: t("common.dashboard") }, { id: "expenses", label: t("expenses.listTab") }]} activeTab={tab} onChange={setTab} />{tab === "dashboard" ? <div className="space-y-6"><Card className="p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-black text-slate-900">{t("superAdmin.dashboardTitle")}</h1><p className="mt-1 text-sm text-slate-500">{t("superAdmin.dashboardSubtitle")}</p></div>{qStats.isLoading ? <span className="text-sm text-slate-500">{t("common.loading")}</span> : null}{qStats.isError ? <span className="text-sm font-bold text-red-600">{t("common.loadingError")}</span> : null}</div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Utilisateurs" value={stats?.totalUsers} /><StatCard label="Adhérents" value={stats?.adherentsCount} /><StatCard label="Associations" value={stats?.associationsCount} /><StatCard label="Cotisations" value={stats?.totalSubscriptions} /><StatCard label="Cotisations mensuelles" value={stats?.monthlySubscriptionsCount} hint={fmtMoney(stats?.monthlyCotisation)} /><StatCard label="Cotisations annuelles" value={stats?.annualSubscriptionsCount} hint={fmtMoney(stats?.annualCotisation)} /><StatCard label="Total montant cotisations" value={fmtMoney(stats?.totalCotisation)} /><StatCard label="Dépenses totales" value={fmtMoney(stats?.totalExpenses)} /><StatCard label="Dépenses approuvées" value={stats?.approvedExpenses} /><StatCard label="Dépenses rejetées" value={stats?.rejectedExpenses} /><StatCard label="Dépenses en attente" value={stats?.pendingExpenses} /><StatCard label="Dépenses effectuées" value={stats?.completedExpenses} /><StatCard label="Ordres de paiement" value={stats?.totalPaymentOrders} /><StatCard label="Montant ordres de paiement" value={fmtMoney(stats?.totalPaymentOrdersAmount)} /></div><div className="mt-6 grid gap-3 md:grid-cols-4">{byStatus.map((s) => <div key={s.status} className="rounded-2xl border border-emerald-100 bg-white p-4"><Badge tone={statusTones[s.status]}>{t(`enumStatus.${s.status}`, s.status)}</Badge><div className="mt-2 font-black">{s.count} • {fmtMoney(s.amount)}</div></div>)}</div><div className="mt-6 grid gap-4 lg:grid-cols-3"><SimplePieChart title="Dépenses par statut" data={expenseStatusChartData} emptyMessage="Aucune dépense par statut" /><SimpleBarChart title="Ordres de paiement par statut" data={paymentOrderStatusChartData} emptyMessage="Aucun ordre de paiement par statut" /><SimpleBarChart title="Cotisations mensuelles/annuelles" data={subscriptionFrequencyChartData} emptyMessage="Aucune cotisation mensuelle ou annuelle" /></div></Card><div className="grid gap-6 lg:grid-cols-2"><MiniList title="Derniers utilisateurs inscrits" items={stats?.latestUsers || []} t={t} render={(u) => <div key={u.id} className="rounded-2xl border border-emerald-100 p-4"><div className="font-black text-slate-900">{u.companyName || u.fullName || u.email}</div><div className="text-xs text-slate-500">{u.role} • {u.accountType} • {fmtDate(u.createdAt)}</div></div>} /><MiniList title="Dernières cotisations" items={stats?.latestSubscriptions || []} t={t} render={(s) => <div key={s.id} className="rounded-2xl border border-emerald-100 p-4"><div className="font-black text-slate-900">{s.user?.companyName || s.user?.fullName || s.user?.email || "-"}</div><div className="text-xs text-slate-500">{s.frequency} • {s.status} • {fmtMoney(s.amount)} {s.currency}</div></div>} /><MiniList title="Dernières dépenses" items={stats?.latestExpenses || []} t={t} render={(e) => <div key={e.id} className="rounded-2xl border border-emerald-100 p-4"><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{e.label}</span><Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge></div><div className="text-xs text-slate-500">{e.beneficiaryName} • {fmtMoney(e.amount)} • {fmtDate(e.createdAt)}</div></div>} /><MiniList title="Derniers ordres de paiement" items={stats?.latestPaymentOrders || []} t={t} render={(o) => <div key={o.id} className="rounded-2xl border border-emerald-100 p-4"><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{o.referenceNumber}</span><Badge tone={statusTones[o.status]}>{t(`enumStatus.${o.status}`, o.status)}</Badge></div><div className="text-xs text-slate-500">{o.expense?.beneficiaryName} • {fmtMoney(o.amount)} {o.currency}</div></div>} /></div></div> : <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">{t("superAdmin.allExpenses")}</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Date", "Type", "Libellé", "Montant", "Bénéficiaire", "Pays", "Ville", "Statut", "Créée par", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{expenses.map((e) => <tr key={e.id}><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3">{t(`expenseTypes.${e.type}`, e.type)}</td><td className="px-4 py-3 font-semibold">{e.label}</td><td className="px-4 py-3 font-black">{fmtMoney(e.amount)}</td><td className="px-4 py-3">{e.beneficiaryName}</td><td className="px-4 py-3">{e.beneficiaryCountry}</td><td className="px-4 py-3">{e.beneficiaryCity}</td><td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge></td><td className="px-4 py-3">{e.createdBy?.fullName || e.createdBy?.email || "-"}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"} onClick={() => approveMut.mutate(e.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{t("validation.approve")}</button><button disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"} onClick={() => rejectMut.mutate(e.id)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{t("validation.reject")}</button></div></td></tr>)}{!expenses.length ? <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">Aucune dépense</td></tr> : null}</tbody></table></div></Card>}</main></div>;
}
>>>>>>> c5b7a69dfc590175b745e8b30e803d00736ca4a4
