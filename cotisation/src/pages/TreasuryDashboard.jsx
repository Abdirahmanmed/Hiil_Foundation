import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Brand from "../components/Brand";
import Card from "../components/ui/Card";
import Drawer from "../components/ui/Drawer";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { getExpenses, getExpensesDashboard } from "../api/expenses.api";
import { createPaymentOrder, getPaymentOrderPrint, getPaymentOrders } from "../api/paymentOrders.api";

const statusTones = { EN_ATTENTE: "yellow", APPROUVER: "blue", EFFECTUER: "green", REJETER: "red", CREE: "yellow", IMPRIME: "green" };
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-");

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="text-xs font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div></div>;
}

export default function TreasuryDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [form, setForm] = useState({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry: "DJIBOUTI", amount: 1 });

  const qStats = useQuery({ queryKey: ["expenses-dashboard", "treasury"], queryFn: getExpensesDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses", "treasury"], queryFn: getExpenses });
  const qOrders = useQuery({ queryKey: ["payment-orders"], queryFn: getPaymentOrders });
  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];
  const orders = qOrders.data?.paymentOrders || [];

  const createMut = useMutation({ mutationFn: createPaymentOrder, onSuccess: () => { toast.success("Ordre de paiement créé"); setSelectedExpense(null); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["payment-orders"] }); qc.invalidateQueries({ queryKey: ["expenses-dashboard"] }); }, onError: (e) => toast.error(e?.response?.data?.message || "Erreur ordre de paiement") });
  const printMut = useMutation({ mutationFn: getPaymentOrderPrint, onSuccess: (data) => setPrintOrder(data.paymentOrder), onError: (e) => toast.error(e?.response?.data?.message || "Erreur impression") });

  function openOrder(expense) {
    setSelectedExpense(expense);
    setForm({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry: expense.beneficiaryCountry || "DJIBOUTI", amount: expense.amount || 1 });
  }

  function submit(e) {
    e.preventDefault();
    createMut.mutate({ ...form, expenseId: selectedExpense.id, amount: Number(form.amount) });
  }

  return <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white"><header className="border-b border-emerald-100 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Brand /><div className="flex items-center gap-3"><LanguageSwitcher /><span className="hidden text-xs font-bold text-slate-600 md:block">{user?.fullName || user?.email} • Équipe trésorerie</span><button onClick={logout} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold">Déconnexion</button></div></div></header><main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap gap-2">{[["dashboard", "Dashboard"], ["expenses", "Liste des dépenses"], ["orders", "Ordres de paiement"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === key ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>{label}</button>)}</div>{tab === "dashboard" ? <Card className="p-6"><h1 className="text-2xl font-black text-slate-900">Dashboard trésorerie</h1><div className="mt-6 grid gap-4 md:grid-cols-3"><StatCard label="Associations" value={stats?.associationsCount} /><StatCard label="Adhérents" value={stats?.adherentsCount} /><StatCard label="Cotisation mensuelle" value={stats?.monthlyCotisation} /><StatCard label="Cotisation annuelle" value={stats?.annualCotisation} /><StatCard label="Dépenses à payer" value={expenses.length} /><StatCard label="Ordres de paiement" value={orders.length} /></div></Card> : null}{tab === "expenses" ? <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">Dépenses approuvées</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Date", "Libellé", "Bénéficiaire", "Pays", "Montant", "Statut", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{expenses.map((e) => <tr key={e.id}><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3 font-semibold">{e.label}</td><td className="px-4 py-3">{e.beneficiaryName}</td><td className="px-4 py-3">{e.beneficiaryCountry}</td><td className="px-4 py-3 font-black">{e.amount}</td><td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{e.status}</Badge></td><td className="px-4 py-3"><button onClick={() => openOrder(e)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Créer un ordre de paiement</button></td></tr>)}{!expenses.length ? <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-500">Aucune dépense approuvée</td></tr> : null}</tbody></table></div></Card> : null}{tab === "orders" ? <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">Ordres de paiement</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Référence", "Date", "Dépense", "Bénéficiaire", "Méthode", "Devise", "Pays", "Montant", "Status", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{orders.map((o) => <tr key={o.id}><td className="px-4 py-3 font-black">{o.referenceNumber}</td><td className="px-4 py-3">{fmtDate(o.createdAt)}</td><td className="px-4 py-3">{o.expense?.label}</td><td className="px-4 py-3">{o.expense?.beneficiaryName}</td><td className="px-4 py-3">{o.paymentMethod}</td><td className="px-4 py-3">{o.currency}</td><td className="px-4 py-3">{o.paymentCountry}</td><td className="px-4 py-3 font-black">{o.amount}</td><td className="px-4 py-3"><Badge tone={statusTones[o.status]}>{o.status}</Badge></td><td className="px-4 py-3"><button onClick={() => printMut.mutate(o.id)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black">Imprimer</button></td></tr>)}{!orders.length ? <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">Aucun ordre</td></tr> : null}</tbody></table></div></Card> : null}</main><Drawer open={!!selectedExpense} onClose={() => setSelectedExpense(null)} title="Créer un ordre de paiement"><form onSubmit={submit} className="space-y-4"><Input placeholder="Token reçu du Super Admin" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required /><Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="VIREMENT_BANCAIRE">Virement bancaire</option><option value="CASH">Cash</option><option value="CHEQUE">Chèque</option></Select><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="FRANC">Franc</option><option value="DOLLAR">Dollar</option><option value="BIRR_ETHIOPIEN">Birr Ethiopien</option></Select><Select value={form.paymentCountry} onChange={(e) => setForm({ ...form, paymentCountry: e.target.value })}><option value="DJIBOUTI">Djibouti</option><option value="ETHIOPIE">Ethiopie</option></Select><Input type="number" min="1" placeholder="Montant" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /><button disabled={createMut.isPending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Enregistrer</button></form></Drawer><Drawer open={!!printOrder} onClose={() => setPrintOrder(null)} title="Ordre de paiement imprimable" right={<button onClick={() => window.print()} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Imprimer</button>}><div className="print:bg-white rounded-2xl border border-emerald-100 p-6 text-slate-900"><div className="text-center"><img src="/logoherciise.jpeg" alt="Hiil Foundation" className="mx-auto h-20 w-20 rounded-full object-cover" /><h2 className="mt-3 text-2xl font-black">Hiil Foundation</h2><p className="text-sm text-slate-500">Ordre de paiement</p></div><div className="mt-6 grid gap-3 text-sm"><p><b>Référence :</b> {printOrder?.referenceNumber}</p><p><b>Date :</b> {fmtDate(printOrder?.createdAt)}</p><p><b>Dépense :</b> {printOrder?.expense?.label}</p><p><b>Bénéficiaire :</b> {printOrder?.expense?.beneficiaryName}</p><p><b>Méthode :</b> {printOrder?.paymentMethod}</p><p><b>Devise :</b> {printOrder?.currency}</p><p><b>Pays :</b> {printOrder?.paymentCountry}</p><p><b>Montant :</b> {printOrder?.amount}</p></div><div className="mt-14 flex justify-between text-sm font-bold"><span>Signature trésorerie</span><span>Signature validation</span></div></div></Drawer></div>;
}
