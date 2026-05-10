import { useMemo, useState } from "react";
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

function fmtDate(value) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "-";
}

function Field({ label, children }) {
  return <label className="block space-y-1 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="text-xs font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div></div>;
}

function ExpensesTable({ expenses }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-emerald-100">
      <table className="min-w-full divide-y divide-emerald-100 text-sm">
        <thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600">
          <tr>{["Date", "Type", "Libellé", "Quantité", "Prix unitaire", "Montant", "Bénéficiaire", "Pays", "Ville", "Statut"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-emerald-50 bg-white">
          {expenses.map((e) => <tr key={e.id}><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3">{e.type}</td><td className="px-4 py-3 font-semibold">{e.label}</td><td className="px-4 py-3">{e.quantity}</td><td className="px-4 py-3">{e.unitPrice}</td><td className="px-4 py-3 font-black">{e.amount}</td><td className="px-4 py-3">{e.beneficiaryName}</td><td className="px-4 py-3">{e.beneficiaryCountry}</td><td className="px-4 py-3">{e.beneficiaryCity}</td><td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{e.status}</Badge></td></tr>)}
          {!expenses.length ? <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">Aucune dépense</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default function ExpenseManagerDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const qStats = useQuery({ queryKey: ["expenses-dashboard"], queryFn: getExpensesDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses"], queryFn: getExpenses });
  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];

  const byStatus = useMemo(() => stats?.expensesByStatus || [], [stats]);
  const createMut = useMutation({ mutationFn: createExpense, onSuccess: () => { toast.success("Dépense enregistrée"); setOpen(false); setForm(initialForm); qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["expenses-dashboard"] }); }, onError: (e) => toast.error(e?.response?.data?.message || "Erreur création dépense") });

  function setField(name, value) {
    const next = { ...form, [name]: value };
    if (name === "quantity" || name === "unitPrice") next.amount = Number(next.quantity || 0) * Number(next.unitPrice || 0);
    setForm(next);
  }

  function submit(e) {
    e.preventDefault();
    createMut.mutate({ ...form, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice), amount: Number(form.amount) });
  }

  return <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white"><header className="border-b border-emerald-100 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Brand /><div className="flex items-center gap-3"><LanguageSwitcher /><span className="hidden text-xs font-bold text-slate-600 md:block">{user?.fullName || user?.email} • Gestionnaire dépense</span><button onClick={logout} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold">Déconnexion</button></div></div></header><main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap gap-2"><button onClick={() => setTab("dashboard")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "dashboard" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>Dashboard</button><button onClick={() => setTab("expenses")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "expenses" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>Gestion de dépense</button></div>{tab === "dashboard" ? <Card className="p-6"><h1 className="text-2xl font-black text-slate-900">Dashboard dépenses</h1><div className="mt-6 grid gap-4 md:grid-cols-3"><StatCard label="Associations" value={stats?.associationsCount} /><StatCard label="Adhérents" value={stats?.adherentsCount} /><StatCard label="Cotisation mensuelle" value={stats?.monthlyCotisation} /><StatCard label="Cotisation annuelle" value={stats?.annualCotisation} /><StatCard label="Total dépenses" value={stats?.totalExpenses} /><StatCard label="Nombre dépenses" value={stats?.totalExpensesCount} /></div><div className="mt-6 grid gap-3 md:grid-cols-4">{byStatus.map((s) => <div key={s.status} className="rounded-2xl border border-emerald-100 p-4"><Badge tone={statusTones[s.status]}>{s.status}</Badge><div className="mt-2 font-black">{s.count} • {s.amount}</div></div>)}</div></Card> : <Card className="p-6"><div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-black text-slate-900">Gestion de dépense</h1><button onClick={() => setOpen(true)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Créer une dépense</button></div><ExpensesTable expenses={expenses} /></Card>}</main><Drawer open={open} onClose={() => setOpen(false)} title="Créer une dépense"><form onSubmit={submit} className="space-y-4"><Field label="Date"><Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} required /></Field><Field label="Type de dépense"><Select value={form.type} onChange={(e) => setField("type", e.target.value)}><option value="ALIMENTATION">Alimentation</option><option value="CONSTRUCTION">Construction</option><option value="MEDICAMENT">Médicament</option></Select></Field><Field label="Libellé"><Input value={form.label} onChange={(e) => setField("label", e.target.value)} required /></Field><Field label="Quantité"><Input type="number" min="1" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} required /></Field><Field label="Prix unitaire"><Input type="number" min="1" value={form.unitPrice} onChange={(e) => setField("unitPrice", e.target.value)} required /></Field><Field label="Montant"><Input type="number" min="1" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></Field><Field label="Nom du bénéficiaire"><Input value={form.beneficiaryName} onChange={(e) => setField("beneficiaryName", e.target.value)} required /></Field><Field label="Pays du bénéficiaire"><Select value={form.beneficiaryCountry} onChange={(e) => setField("beneficiaryCountry", e.target.value)}><option value="DJIBOUTI">Djibouti</option><option value="ETHIOPIE">Ethiopie</option></Select></Field><Field label="Ville"><Input value={form.beneficiaryCity} onChange={(e) => setField("beneficiaryCity", e.target.value)} required /></Field><button disabled={createMut.isPending} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Enregistrer</button></form></Drawer></div>;
}
