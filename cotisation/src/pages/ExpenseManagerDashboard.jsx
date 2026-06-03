import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Brand from "../components/Brand";
import Card from "../components/ui/Card";
import Drawer from "../components/ui/Drawer";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { logPerf } from "../utils/perf";
import { SimpleBarChart, SimplePieChart } from "../components/DashboardCharts";
import { statusRowsToChart } from "../components/chartUtils";
import { useAuth } from "../context/AuthContext";
import { createExpense, getExpenses, getExpensesDashboard } from "../api/expenses.api";

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  type: "ALIMENTATION",
  label: "",
  quantity: 1,
  unitPrice: 1,
  amount: 1,
  beneficiaryName: "",
  beneficiaryCountry: "DJIBOUTI",
  beneficiaryCity: "",
};

const statusTones = { EN_ATTENTE: "yellow", APPROUVER: "blue", EFFECTUER: "green", REJETER: "red" };
const fmtDate = (value) => (value ? new Date(value).toLocaleDateString("fr-FR") : "-");
const fmtMoney = (value) => Number(value || 0).toLocaleString("fr-FR");

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-sm font-bold text-slate-700">
      <span>{label}</span>{children}
    </label>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
      <div className="text-xs font-black text-slate-600">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function ExpensesTable({ expenses, t }) {
  const headers = [
    t("common.date"),
    t("common.type"),
    t("expenses.label"),
    t("expenses.quantity"),
    t("expenses.unitPrice"),
    t("common.amount"),
    t("expenses.beneficiary"),
    t("common.country"),
    t("common.city"),
    t("status"),
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-emerald-100">
      <table className="min-w-full divide-y divide-emerald-100 text-sm">
        <thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600">
          <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-emerald-50 bg-white">
          {expenses.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3">{fmtDate(e.date)}</td>
              <td className="px-4 py-3">{t(`expenseTypes.${e.type}`, e.type)}</td>
              <td className="px-4 py-3 font-semibold">{e.label}</td>
              <td className="px-4 py-3">{e.quantity}</td>
              <td className="px-4 py-3">{fmtMoney(e.unitPrice)}</td>
              <td className="px-4 py-3 font-black">{fmtMoney(e.amount)}</td>
              <td className="px-4 py-3">{e.beneficiaryName}</td>
              <td className="px-4 py-3">{e.beneficiaryCountry}</td>
              <td className="px-4 py-3">{e.beneficiaryCity}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge>
              </td>
            </tr>
          ))}
          {!expenses.length && (
            <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">{t("expenses.empty")}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ExpenseManagerDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const qStats = useQuery({ queryKey: ["expenses-dashboard"], queryFn: getExpensesDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses"], queryFn: getExpenses, enabled: tab === "expenses" });

  useEffect(() => {
    if (qStats.isSuccess) {
      logPerf("dashboard.expenseManager.firstDataLoad", {
        endpoint: "/api/expenses/dashboard",
        latestExpenses: qStats.data?.stats?.latestExpenses?.length || 0,
      });
    }
  }, [qStats.isSuccess, qStats.data]);

  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];
  const latestExpenses = stats?.latestExpenses || [];
  const byStatus = useMemo(() => stats?.expensesByStatus || [], [stats]);

  const expenseStatusChartData = useMemo(
    () => statusRowsToChart(byStatus, (status) => t(`enumStatus.${status}`, status)),
    [byStatus, t],
  );
  const expenseTotalsChartData = useMemo(() => [
    { name: t("expenses.stats.monthAmount"), value: Number(stats?.monthExpensesAmount || 0) },
    { name: t("expenses.stats.totalAmount"), value: Number(stats?.totalExpenses || 0) },
  ], [stats, t]);

  const createMut = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      toast.success(t("expenses.createSuccess"));
      setOpen(false);
      setForm(initialForm);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-dashboard"] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || t("expenses.createError")),
  });

  function setField(name, value) {
    const next = { ...form, [name]: value };
    if (name === "quantity" || name === "unitPrice") {
      next.amount = Number(next.quantity || 0) * Number(next.unitPrice || 0);
    }
    setForm(next);
  }

  function submit(e) {
    e.preventDefault();
    createMut.mutate({
      ...form,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
      amount: Number(form.amount),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white">
      {/* Header */}
      <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Brand />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden text-xs font-bold text-slate-600 md:block">
              {user?.fullName || user?.email} • {t("expenses.roleLabel")}
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
            {t("expenses.managementTab")}
          </button>
        </div>

        {/* Dashboard tab */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{t("expenses.dashboardTitle")}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t("expenses.dashboardSubtitle")}</p>
                </div>
                {qStats.isLoading && <span className="text-sm text-slate-500">{t("common.loading")}</span>}
                {qStats.isError && <span className="text-sm font-bold text-red-600">{t("common.loadingError")}</span>}
              </div>

              {/* Stat cards */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("expenses.stats.totalExpenses")} value={stats?.totalExpensesCount} />
                <StatCard label={t("expenses.stats.approved")}      value={stats?.approvedExpenses} />
                <StatCard label={t("expenses.stats.rejected")}      value={stats?.rejectedExpenses} />
                <StatCard label={t("expenses.stats.pending")}       value={stats?.pendingExpenses} />
                <StatCard label={t("expenses.stats.completed")}     value={stats?.completedExpenses} />
                <StatCard label={t("expenses.stats.monthCount")}    value={stats?.monthExpensesCount} />
                <StatCard label={t("expenses.stats.totalAmount")}   value={fmtMoney(stats?.totalExpenses)} />
                <StatCard label={t("expenses.stats.monthAmount")}   value={fmtMoney(stats?.monthExpensesAmount)} />
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
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <SimplePieChart
                  title={t("expenseManager.charts.byStatus")}
                  data={expenseStatusChartData}
                  emptyMessage={t("expenseManager.charts.noByStatus")}
                />
                <SimpleBarChart
                  title={t("expenseManager.charts.monthVsTotal")}
                  data={expenseTotalsChartData}
                  emptyMessage={t("expenseManager.charts.noAmounts")}
                />
              </div>
            </Card>

            {/* Latest expenses */}
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-black text-slate-900">{t("expenses.latestExpenses")}</h2>
              <ExpensesTable expenses={latestExpenses} t={t} />
            </Card>
          </div>
        )}

        {/* Expenses tab */}
        {tab === "expenses" && (
          <Card className="p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-2xl font-black text-slate-900">{t("expenses.myExpenses")}</h1>
              <button onClick={() => setOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">
                {t("expenses.newExpense")}
              </button>
            </div>
            {qExpenses.isLoading
              ? <div className="text-sm text-slate-500">{t("common.loading")}</div>
              : <ExpensesTable expenses={expenses} t={t} />
            }
          </Card>
        )}
      </main>

      {/* Drawer: new expense */}
      <Drawer open={open} onClose={() => setOpen(false)} title={t("expenses.newExpense")}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("common.date")}>
            <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          </Field>
          <Field label={t("common.type")}>
            <Select value={form.type} onChange={(e) => setField("type", e.target.value)}>
              <option value="ALIMENTATION">{t("expenseTypes.ALIMENTATION")}</option>
              <option value="CONSTRUCTION">{t("expenseTypes.CONSTRUCTION")}</option>
              <option value="MEDICAMENT">{t("expenseTypes.MEDICAMENT")}</option>
            </Select>
          </Field>
          <Field label={t("expenses.label")}>
            <Input value={form.label} onChange={(e) => setField("label", e.target.value)} required />
          </Field>
          <Field label={t("expenses.quantity")}>
            <Input type="number" min="1" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} required />
          </Field>
          <Field label={t("expenses.unitPrice")}>
            <Input type="number" min="1" value={form.unitPrice} onChange={(e) => setField("unitPrice", e.target.value)} required />
          </Field>
          <Field label={t("common.amount")}>
            <Input type="number" min="1" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required />
          </Field>
          <Field label={t("expenses.beneficiary")}>
            <Input value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} required />
          </Field>
          <Field label={t("common.country")}>
            <Select value={form.beneficiaryCountry} onChange={(e) => setField("beneficiaryCountry", e.target.value)}>
              <option value="DJIBOUTI">{t("countries.DJIBOUTI")}</option>
              <option value="ETHIOPIE">{t("countries.ETHIOPIE")}</option>
            </Select>
          </Field>
          <Field label={t("common.city")}>
            <Input value={form.beneficiaryCity} onChange={(e) => setField("beneficiaryCity", e.target.value)} required />
          </Field>
          <button disabled={createMut.isPending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            {t("common.save")}
          </button>
        </form>
      </Drawer>
    </div>
  );
}