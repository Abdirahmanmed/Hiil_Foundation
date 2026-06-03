import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import DashboardHeader from "../components/DashboardHeader";
import Card from "../components/ui/Card";
import Drawer from "../components/ui/Drawer";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import DashboardTabs from "../components/DashboardTabs";
import { SimpleBarChart, SimplePieChart } from "../components/DashboardCharts";
import { statusRowsToChart } from "../components/chartUtils";
import { useAuth } from "../context/AuthContext";
import { getExpenses } from "../api/expenses.api";
import { getTreasuryDashboard } from "../api/treasury.api";
import { createPaymentOrder, getPaymentOrderPrint, getPaymentOrders, markPaymentOrderPrinted } from "../api/paymentOrders.api";
import { useTranslation } from "react-i18next";
import { logPerf } from "../utils/perf";

const statusTones = { EN_ATTENTE: "yellow", APPROUVER: "blue", EFFECTUER: "green", REJETER: "red", CREE: "yellow", IMPRIME: "green" };
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-");
const fmtMoney = (v) => Number(v || 0).toLocaleString("fr-FR");
const bankOptionsByCountry = {
  DJIBOUTI: ["CAC Bank", "Salaam African Bank", "East Africa Bank", "Banque de Dépôt et Crédit Djibouti", "Banque pour le Commerce et l'Industrie Mer Rouge", "International Commercial Bank Djibouti"],
  ETHIOPIE: ["Commercial Bank of Ethiopia", "Awash Bank", "Dashen Bank", "Abyssinia Bank", "Hibret Bank", "Zemen Bank"],
};

function Field({ label, children }) {
  return <label className="block space-y-1 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="text-xs font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div></div>;
}

function MiniItem({ title, badge, children }) {
  return <div className="rounded-2xl border border-emerald-100 p-4"><div className="flex items-center justify-between gap-2"><span className="font-black text-slate-900">{title}</span>{badge}</div><div className="mt-1 text-xs text-slate-500">{children}</div></div>;
}

export default function TreasuryDashboard() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [form, setForm] = useState({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry: "DJIBOUTI", amount: 1, bankName: "CAC Bank", bankReference: "", bankAccountHolder: "" });

  const qStats = useQuery({ queryKey: ["treasury-dashboard"], queryFn: getTreasuryDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses", "treasury"], queryFn: getExpenses, enabled: tab === "expenses" });
  const qOrders = useQuery({ queryKey: ["payment-orders"], queryFn: getPaymentOrders, enabled: tab === "orders" });

  useEffect(() => {
    if (qStats.isSuccess) {
      logPerf("dashboard.treasury.firstDataLoad", {
        endpoint: "/api/treasury/dashboard",
        latestApprovedExpenses: qStats.data?.stats?.latestApprovedExpenses?.length || 0,
        latestPaymentOrders: qStats.data?.stats?.latestPaymentOrders?.length || 0,
      });
    }
  }, [qStats.isSuccess, qStats.data]);

  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];
  const orders = qOrders.data?.paymentOrders || [];
  const paymentOrderStatusChartData = useMemo(() => statusRowsToChart(stats?.paymentOrdersByStatus, (status) => t(`enumStatus.${status}`, status)), [stats, t]);
  const expenseStatusChartData = useMemo(() => statusRowsToChart(stats?.expensesByStatus, (status) => t(`enumStatus.${status}`, status)), [stats, t]);

  const createMut = useMutation({ mutationFn: createPaymentOrder, onSuccess: () => { toast.success(t("create_payment_order") + " ✅"); setSelectedExpense(null); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["payment-orders"] }); qc.invalidateQueries({ queryKey: ["treasury-dashboard"] }); }, onError: (e) => toast.error(e?.response?.data?.message || t("sub_create_error")) });
  const printMut = useMutation({ mutationFn: getPaymentOrderPrint, onSuccess: (data) => setPrintOrder(data.paymentOrder), onError: (e) => toast.error(e?.response?.data?.message || t("error_generic")) });
  const markPrintedMut = useMutation({ mutationFn: markPaymentOrderPrinted, onSuccess: (data) => { setPrintOrder(data.paymentOrder); qc.invalidateQueries({ queryKey: ["payment-orders"] }); qc.invalidateQueries({ queryKey: ["treasury-dashboard"] }); window.print(); }, onError: (e) => toast.error(e?.response?.data?.message || t("error_generic")) });

  function openOrder(expense) {
    const paymentCountry = expense.beneficiaryCountry || "DJIBOUTI";
    setSelectedExpense(expense);
    setForm({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry, amount: expense.amount || 1, bankName: bankOptionsByCountry[paymentCountry][0], bankReference: "", bankAccountHolder: expense.beneficiaryName || "" });
  }

  function setPaymentMethod(paymentMethod) {
    if (paymentMethod === "CASH") {
      setForm({ ...form, paymentMethod, bankName: "", bankReference: "", bankAccountHolder: "" });
      return;
    }
    const banks = bankOptionsByCountry[form.paymentCountry || "DJIBOUTI"] || bankOptionsByCountry.DJIBOUTI;
    setForm({ ...form, paymentMethod, bankName: banks.includes(form.bankName) ? form.bankName : banks[0] });
  }

  function setPaymentCountry(paymentCountry) {
    const banks = bankOptionsByCountry[paymentCountry] || bankOptionsByCountry.DJIBOUTI;
    setForm({ ...form, paymentCountry, bankName: form.paymentMethod === "CASH" || banks.includes(form.bankName) ? form.bankName : banks[0] });
  }

  function submit(e) {
    e.preventDefault();
    const payload = { ...form, expenseId: selectedExpense.id, amount: Number(form.amount) };
    if (form.paymentMethod === "CASH") {
      delete payload.bankName;
      delete payload.bankReference;
      delete payload.bankAccountHolder;
    }
    createMut.mutate(payload);
  }

  function printCurrentOrder() {
    if (!printOrder?.id || markPrintedMut.isPending) return;
    markPrintedMut.mutate(printOrder.id);
  }

  const tabs = [
    ["dashboard", t("treasury.tabs.dashboard")],
    ["expenses", t("treasury.tabs.expenses")],
    ["orders", t("treasury.tabs.orders")],
  ];

  const tableHeadersExpenses = [
    t("treasury.table.date"),
    t("treasury.table.label"),
    t("treasury.table.beneficiary"),
    t("treasury.table.country"),
    t("treasury.table.amount"),
    t("treasury.table.status"),
    t("treasury.table.action"),
  ];

  const tableHeadersOrders = [
    t("treasury.table.reference"),
    t("treasury.table.date"),
    t("treasury.table.expense"),
    t("treasury.table.beneficiary"),
    t("treasury.table.method"),
    t("treasury.table.currency"),
    t("treasury.table.paymentCountry"),
    t("treasury.table.amount"),
    t("treasury.table.status"),
    t("treasury.table.action"),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white">
     <DashboardHeader
        maxWidth="max-w-7xl"
        userLabel={`${user?.fullName || user?.email || ""} • ${t("treasury.roleLabel")}`}
        onLogout={logout}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <DashboardTabs
          className="mb-6"
          tabs={tabs.map(([id, label]) => ({ id, label }))}
          activeTab={tab}
          onChange={setTab}
        />

        {/* Dashboard tab */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{t("treasury.dashboardTitle")}</h1>
                  <p className="mt-1 text-sm text-slate-500">{t("treasury.dashboardSubtitle")}</p>
                </div>
                {qStats.isLoading && <span className="text-sm text-slate-500">{t("common.loading")}</span>}
                {qStats.isError && <span className="text-sm font-bold text-red-600">{t("common.loadingError")}</span>}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={t("treasury.stats.totalExpenses")}     value={stats?.totalExpensesCount} />
                <StatCard label={t("treasury.stats.approved")}          value={stats?.approvedExpenses} />
                <StatCard label={t("treasury.stats.rejected")}          value={stats?.rejectedExpenses} />
                <StatCard label={t("treasury.stats.pending")}           value={stats?.pendingExpenses} />
                <StatCard label={t("treasury.stats.completed")}         value={stats?.completedExpenses} />
                <StatCard label={t("treasury.stats.monthCount")}        value={stats?.monthExpensesCount} />
                <StatCard label={t("treasury.stats.totalAmount")}       value={fmtMoney(stats?.totalExpenses)} />
                <StatCard label={t("treasury.stats.monthAmount")}       value={fmtMoney(stats?.monthExpensesAmount)} />
                <StatCard label={t("treasury.stats.totalOrders")}       value={stats?.totalPaymentOrders} />
                <StatCard label={t("treasury.stats.monthOrders")}       value={stats?.monthPaymentOrders} />
                <StatCard label={t("treasury.stats.totalOrdersAmount")} value={fmtMoney(stats?.totalPaymentOrdersAmount)} />
                <StatCard label={t("treasury.stats.monthOrdersAmount")} value={fmtMoney(stats?.monthPaymentOrdersAmount)} />
                <StatCard label={t("treasury.stats.createdOrders")}     value={stats?.createdPaymentOrders} />
                <StatCard label={t("treasury.stats.printedOrders")}     value={stats?.printedPaymentOrders} />
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <SimpleBarChart title={t("treasury.charts.ordersByStatus")}   data={paymentOrderStatusChartData} emptyMessage={t("treasury.charts.noOrdersByStatus")} />
                <SimplePieChart title={t("treasury.charts.expensesByStatus")} data={expenseStatusChartData}      emptyMessage={t("treasury.charts.noExpensesByStatus")} />
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <h2 className="mb-4 text-xl font-black text-slate-900">{t("treasury.latestApprovedExpenses")}</h2>
                <div className="space-y-3">
                  {(stats?.latestApprovedExpenses || []).map((e) => (
                    <MiniItem key={e.id} title={e.label} badge={<Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge>}>
                      {e.beneficiaryName} • {fmtMoney(e.amount)} • {fmtDate(e.createdAt)}
                    </MiniItem>
                  ))}
                  {(stats?.latestApprovedExpenses || []).length === 0 && (
                    <div className="rounded-2xl border border-emerald-100 px-4 py-6 text-center text-sm text-slate-500">
                      {t("treasury.noApprovedExpenses")}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="mb-4 text-xl font-black text-slate-900">{t("treasury.latestPaymentOrders")}</h2>
                <div className="space-y-3">
                  {(stats?.latestPaymentOrders || []).map((o) => (
                    <MiniItem key={o.id} title={o.referenceNumber} badge={<Badge tone={statusTones[o.status]}>{t(`enumStatus.${o.status}`, o.status)}</Badge>}>
                      {o.expense?.beneficiaryName} • {fmtMoney(o.amount)} {t(`currencies.${o.currency}`, o.currency)}
                    </MiniItem>
                  ))}
                  {(stats?.latestPaymentOrders || []).length === 0 && (
                    <div className="rounded-2xl border border-emerald-100 px-4 py-6 text-center text-sm text-slate-500">
                      {t("paymentOrders.empty")}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Expenses tab */}
        {tab === "expenses" && (
          <Card className="p-6">
            <h1 className="mb-4 text-2xl font-black text-slate-900">{t("treasury.approvedExpensesTitle")}</h1>
            <div className="overflow-x-auto rounded-2xl border border-emerald-100">
              <table className="min-w-full divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600">
                  <tr>{tableHeadersExpenses.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 bg-white">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 font-semibold">{e.label}</td>
                      <td className="px-4 py-3">{e.beneficiaryName}</td>
                      <td className="px-4 py-3">{e.beneficiaryCountry}</td>
                      <td className="px-4 py-3 font-black">{fmtMoney(e.amount)}</td>
                      <td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{t(`enumStatus.${e.status}`, e.status)}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => openOrder(e)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">
                          {t("treasury.createOrder")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!expenses.length && (
                    <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-500">{t("treasury.noApprovedExpenses2")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Orders tab */}
        {tab === "orders" && (
          <Card className="p-6">
            <h1 className="mb-4 text-2xl font-black text-slate-900">{t("treasury.paymentOrdersTitle")}</h1>
            <div className="overflow-x-auto rounded-2xl border border-emerald-100">
              <table className="min-w-full divide-y divide-emerald-100 text-sm">
                <thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600">
                  <tr>{tableHeadersOrders.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 bg-white">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3 font-black">{o.referenceNumber}</td>
                      <td className="px-4 py-3">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3">{o.expense?.label}</td>
                      <td className="px-4 py-3">{o.expense?.beneficiaryName}</td>
                      <td className="px-4 py-3">{t(`paymentMethods.${o.paymentMethod}`, o.paymentMethod)}</td>
                      <td className="px-4 py-3">{t(`currencies.${o.currency}`, o.currency)}</td>
                      <td className="px-4 py-3">{t(`countries.${o.paymentCountry}`, o.paymentCountry)}</td>
                      <td className="px-4 py-3 font-black">{fmtMoney(o.amount)}</td>
                      <td className="px-4 py-3"><Badge tone={statusTones[o.status]}>{t(`enumStatus.${o.status}`, o.status)}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => printMut.mutate(o.id)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black">
                          {t("treasury.table.print")}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && (
                    <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">{t("paymentOrders.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* Drawer: Create payment order */}
      <Drawer open={!!selectedExpense} onClose={() => setSelectedExpense(null)} title={t("treasury.order.createTitle")}>
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("treasury.order.token")}>
            <Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required />
          </Field>
          <Field label={t("treasury.order.paymentMethod")}>
            <Select value={form.paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="VIREMENT_BANCAIRE">{t("paymentMethods.VIREMENT_BANCAIRE")}</option>
              <option value="CASH">{t("paymentMethods.CASH")}</option>
              <option value="CHEQUE">{t("paymentMethods.CHEQUE")}</option>
            </Select>
          </Field>
          <Field label={t("treasury.order.currency")}>
            <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="FRANC">{t("currencies.FRANC")}</option>
              <option value="DOLLAR">{t("currencies.DOLLAR")}</option>
              <option value="BIRR_ETHIOPIEN">{t("currencies.BIRR_ETHIOPIEN")}</option>
            </Select>
          </Field>
          <Field label={t("treasury.order.paymentCountry")}>
            <Select value={form.paymentCountry} onChange={(e) => setPaymentCountry(e.target.value)}>
              <option value="DJIBOUTI">{t("countries.DJIBOUTI")}</option>
              <option value="ETHIOPIE">{t("countries.ETHIOPIE")}</option>
            </Select>
          </Field>
          <Field label={t("treasury.order.amount")}>
            <Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </Field>
          {form.paymentMethod !== "CASH" && (
            <>
              <Field label={t("treasury.order.bankName")}>
                <Select value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}>
                  {bankOptionsByCountry[form.paymentCountry || "DJIBOUTI"].map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("treasury.order.bankReference")}>
                <Input value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} required />
              </Field>
              <Field label={t("treasury.order.bankAccountHolder")}>
                <Input value={form.bankAccountHolder} onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })} />
              </Field>
            </>
          )}
          <button disabled={createMut.isPending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">
            {t("common.save")}
          </button>
        </form>
      </Drawer>

      {/* Drawer: Print payment order */}
      <Drawer
        open={!!printOrder}
        onClose={() => setPrintOrder(null)}
        title={t("treasury.order.printTitle")}
        right={
          <button onClick={printCurrentOrder} disabled={markPrintedMut.isPending} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
            {t("treasury.table.print")}
          </button>
        }
      >
        <div className="print:bg-white rounded-2xl border border-emerald-100 p-6 text-slate-900">
          <div className="text-center">
            <img src="/logoherciise.jpeg" alt="Hiil Foundation" className="mx-auto h-20 w-20 rounded-full object-cover" />
            <h2 className="mt-3 text-2xl font-black">Hiil Foundation</h2>
            <p className="text-sm text-slate-500">{t("treasury.order.printTitle")}</p>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <p><b>{t("treasury.order.reference")} :</b> {printOrder?.referenceNumber}</p>
            <p><b>{t("treasury.order.date")} :</b> {fmtDate(printOrder?.createdAt)}</p>
            <p><b>{t("treasury.order.expense")} :</b> {printOrder?.expense?.label}</p>
            <p><b>{t("treasury.order.beneficiary")} :</b> {printOrder?.expense?.beneficiaryName}</p>
            <p><b>{t("treasury.order.method")} :</b> {t(`paymentMethods.${printOrder?.paymentMethod}`, printOrder?.paymentMethod)}</p>
            <p><b>{t("treasury.order.currency2")} :</b> {t(`currencies.${printOrder?.currency}`, printOrder?.currency)}</p>
            <p><b>{t("treasury.order.country")} :</b> {t(`countries.${printOrder?.paymentCountry}`, printOrder?.paymentCountry)}</p>
            <p><b>{t("treasury.order.amount")} :</b> {fmtMoney(printOrder?.amount)}</p>
          </div>
          <div className="mt-14 flex justify-between text-sm font-bold">
            <span>{t("treasury.order.signTreasury")}</span>
            <span>{t("treasury.order.signValidation")}</span>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
