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
const bankOptionsByCountry = {
  DJIBOUTI: [
    "CAC Bank",
    "Salaam African Bank",
    "East Africa Bank",
    "Banque de Dépôt et Crédit Djibouti",
    "Banque pour le Commerce et l’Industrie Mer Rouge",
    "International Commercial Bank Djibouti",
  ],
  ETHIOPIE: [
    "Commercial Bank of Ethiopia",
    "Awash Bank",
    "Dashen Bank",
    "Abyssinia Bank",
    "Hibret Bank",
    "Zemen Bank",
  ],
};

function Field({ label, children }) {
  return <label className="block space-y-1 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="text-xs font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div></div>;
}

export default function TreasuryDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [form, setForm] = useState({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry: "DJIBOUTI", amount: 1, bankName: "CAC Bank", bankReference: "", bankAccountHolder: "" });

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
    const paymentCountry = expense.beneficiaryCountry || "DJIBOUTI";
    setForm({ token: "", paymentMethod: "VIREMENT_BANCAIRE", currency: "FRANC", paymentCountry, amount: expense.amount || 1, bankName: bankOptionsByCountry[paymentCountry][0], bankReference: "", bankAccountHolder: expense.beneficiaryName || "" });
  }

  function setPaymentMethod(paymentMethod) {
    if (paymentMethod === "CASH") {
      setForm({ ...form, paymentMethod, bankName: "", bankReference: "", bankAccountHolder: "" });
      return;
    }
    const paymentCountry = form.paymentCountry || "DJIBOUTI";
    const banks = bankOptionsByCountry[paymentCountry] || bankOptionsByCountry.DJIBOUTI;
    setForm({ ...form, paymentMethod, bankName: banks.includes(form.bankName) ? form.bankName : banks[0] });
  }

  function setPaymentCountry(paymentCountry) {
    const banks = bankOptionsByCountry[paymentCountry] || bankOptionsByCountry.DJIBOUTI;
    setForm({
      ...form,
      paymentCountry,
      bankName: form.paymentMethod === "CASH" || banks.includes(form.bankName) ? form.bankName : banks[0],
    });
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

  return <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white"><header className="border-b border-emerald-100 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Brand /><div className="flex items-center gap-3"><LanguageSwitcher /><span className="hidden text-xs font-bold text-slate-600 md:block">{user?.fullName || user?.email} • Équipe trésorerie</span><button onClick={logout} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold">Déconnexion</button></div></div></header><main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap gap-2">{[["dashboard", "Dashboard"], ["expenses", "Liste des dépenses"], ["orders", "Ordres de paiement"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === key ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>{label}</button>)}</div>{tab === "dashboard" ? <Card className="p-6"><h1 className="text-2xl font-black text-slate-900">Dashboard trésorerie</h1><div className="mt-6 grid gap-4 md:grid-cols-3"><StatCard label="Associations" value={stats?.associationsCount} /><StatCard label="Adhérents" value={stats?.adherentsCount} /><StatCard label="Cotisation mensuelle" value={stats?.monthlyCotisation} /><StatCard label="Cotisation annuelle" value={stats?.annualCotisation} /><StatCard label="Dépenses à payer" value={expenses.length} /><StatCard label="Ordres de paiement" value={orders.length} /></div></Card> : null}{tab === "expenses" ? <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">Dépenses approuvées</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Date", "Libellé", "Bénéficiaire", "Pays", "Montant", "Statut", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{expenses.map((e) => <tr key={e.id}><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3 font-semibold">{e.label}</td><td className="px-4 py-3">{e.beneficiaryName}</td><td className="px-4 py-3">{e.beneficiaryCountry}</td><td className="px-4 py-3 font-black">{e.amount}</td><td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{e.status}</Badge></td><td className="px-4 py-3"><button onClick={() => openOrder(e)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Créer un ordre de paiement</button></td></tr>)}{!expenses.length ? <tr><td colSpan="7" className="px-4 py-6 text-center text-slate-500">Aucune dépense approuvée</td></tr> : null}</tbody></table></div></Card> : null}{tab === "orders" ? <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">Ordres de paiement</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Référence", "Date", "Dépense", "Bénéficiaire", "Méthode", "Devise", "Pays", "Montant", "Status", "Action"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{orders.map((o) => <tr key={o.id}><td className="px-4 py-3 font-black">{o.referenceNumber}</td><td className="px-4 py-3">{fmtDate(o.createdAt)}</td><td className="px-4 py-3">{o.expense?.label}</td><td className="px-4 py-3">{o.expense?.beneficiaryName}</td><td className="px-4 py-3">{o.paymentMethod}</td><td className="px-4 py-3">{o.currency}</td><td className="px-4 py-3">{o.paymentCountry}</td><td className="px-4 py-3 font-black">{o.amount}</td><td className="px-4 py-3"><Badge tone={statusTones[o.status]}>{o.status}</Badge></td><td className="px-4 py-3"><button onClick={() => printMut.mutate(o.id)} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black">Imprimer</button></td></tr>)}{!orders.length ? <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">Aucun ordre</td></tr> : null}</tbody></table></div></Card> : null}</main><Drawer open={!!selectedExpense} onClose={() => setSelectedExpense(null)} title="Créer un ordre de paiement"><form onSubmit={submit} className="space-y-4"><Field label="Token reçu du Super Admin"><Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required /></Field><Field label="Méthode de paiement"><Select value={form.paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="VIREMENT_BANCAIRE">Virement bancaire</option><option value="CASH">Cash</option><option value="CHEQUE">Chèque</option></Select></Field><Field label="Devise"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="FRANC">Franc</option><option value="DOLLAR">Dollar</option><option value="BIRR_ETHIOPIEN">Birr Ethiopien</option></Select></Field><Field label="Pays de paiement"><Select value={form.paymentCountry} onChange={(e) => setPaymentCountry(e.target.value)}><option value="DJIBOUTI">Djibouti</option><option value="ETHIOPIE">Ethiopie</option></Select></Field><Field label="Montant"><Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>{form.paymentMethod !== "CASH" ? <><Field label="Nom de la banque"><Select value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}>{bankOptionsByCountry[form.paymentCountry || "DJIBOUTI"].map((bank) => <option key={bank} value={bank}>{bank}</option>)}</Select></Field><Field label="Référence bancaire / numéro chèque"><Input value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} required /></Field><Field label="Nom du titulaire / bénéficiaire bancaire"><Input value={form.bankAccountHolder} onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })} /></Field></> : null}<button disabled={createMut.isPending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Enregistrer</button></form></Drawer><Drawer open={!!printOrder} onClose={() => setPrintOrder(null)} title="Ordre de paiement imprimable" right={<button onClick={() => window.print()} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Imprimer</button>}><div className="print:bg-white rounded-2xl border border-emerald-100 p-6 text-slate-900"><div className="text-center"><img src="/logoherciise.jpeg" alt="Hiil Foundation" className="mx-auto h-20 w-20 rounded-full object-cover" /><h2 className="mt-3 text-2xl font-black">Hiil Foundation</h2><p className="text-sm text-slate-500">Ordre de paiement</p></div><div className="mt-6 grid gap-3 text-sm"><p><b>Référence :</b> {printOrder?.referenceNumber}</p><p><b>Date :</b> {fmtDate(printOrder?.createdAt)}</p><p><b>Dépense :</b> {printOrder?.expense?.label}</p><p><b>Bénéficiaire :</b> {printOrder?.expense?.beneficiaryName}</p><p><b>Méthode :</b> {printOrder?.paymentMethod}</p><p><b>Devise :</b> {printOrder?.currency}</p><p><b>Pays :</b> {printOrder?.paymentCountry}</p><p><b>Montant :</b> {printOrder?.amount}</p></div><div className="mt-14 flex justify-between text-sm font-bold"><span>Signature trésorerie</span><span>Signature validation</span></div></div></Drawer></div>;
}
