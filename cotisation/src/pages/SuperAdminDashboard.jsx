import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Brand from "../components/Brand";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";
import { approveExpense, getExpenses, getExpensesDashboard, rejectExpense } from "../api/expenses.api";

const statusTones = { EN_ATTENTE: "yellow", APPROUVER: "blue", EFFECTUER: "green", REJETER: "red" };
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("fr-FR") : "-");

function StatCard({ label, value }) {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><div className="text-xs font-black text-slate-600">{label}</div><div className="mt-2 text-2xl font-black text-slate-900">{value ?? 0}</div></div>;
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("dashboard");
  const qStats = useQuery({ queryKey: ["expenses-dashboard", "super-admin"], queryFn: getExpensesDashboard });
  const qExpenses = useQuery({ queryKey: ["expenses", "super-admin"], queryFn: getExpenses });
  const stats = qStats.data?.stats;
  const expenses = qExpenses.data?.expenses || [];
  const byStatus = useMemo(() => stats?.expensesByStatus || [], [stats]);

  const refreshExpenses = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses-dashboard"] });
  };
  const approveMut = useMutation({ mutationFn: approveExpense, onSuccess: (data) => { toast.success(data?.message || "Dépense approuvée"); refreshExpenses(); }, onError: (e) => toast.error(e?.response?.data?.message || "Erreur approbation") });
  const rejectMut = useMutation({ mutationFn: rejectExpense, onSuccess: (data) => { toast.success(data?.message || "Dépense rejetée"); refreshExpenses(); }, onError: (e) => toast.error(e?.response?.data?.message || "Erreur rejet") });
  const actionPending = approveMut.isPending || rejectMut.isPending;

  return <div className="min-h-screen bg-gradient-to-br from-white via-emerald-50 to-white"><header className="border-b border-emerald-100 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><Brand /><div className="flex items-center gap-3"><LanguageSwitcher /><span className="hidden text-xs font-bold text-slate-600 md:block">{user?.fullName || user?.email} • Super Admin</span><button onClick={logout} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-bold">Déconnexion</button></div></div></header><main className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap gap-2"><button onClick={() => setTab("dashboard")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "dashboard" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>Dashboard</button><button onClick={() => setTab("expenses")} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === "expenses" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>Liste des dépenses</button></div>{tab === "dashboard" ? <Card className="p-6"><h1 className="text-2xl font-black text-slate-900">Dashboard global</h1><div className="mt-6 grid gap-4 md:grid-cols-3"><StatCard label="Associations" value={stats?.associationsCount} /><StatCard label="Adhérents" value={stats?.adherentsCount} /><StatCard label="Cotisation mensuelle" value={stats?.monthlyCotisation} /><StatCard label="Cotisation annuelle" value={stats?.annualCotisation} /><StatCard label="Total dépenses" value={stats?.totalExpenses} /><StatCard label="Nombre dépenses" value={stats?.totalExpensesCount} /></div><div className="mt-6 grid gap-3 md:grid-cols-4">{byStatus.map((s) => <div key={s.status} className="rounded-2xl border border-emerald-100 p-4"><Badge tone={statusTones[s.status]}>{s.status}</Badge><div className="mt-2 font-black">{s.count} • {s.amount}</div></div>)}</div></Card> : <Card className="p-6"><h1 className="mb-4 text-2xl font-black text-slate-900">Toutes les dépenses</h1><div className="overflow-x-auto rounded-2xl border border-emerald-100"><table className="min-w-full divide-y divide-emerald-100 text-sm"><thead className="bg-emerald-50 text-left text-xs font-black uppercase text-slate-600"><tr>{["Date", "Type", "Libellé", "Montant", "Bénéficiaire", "Pays", "Ville", "Statut", "Créée par", "Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-emerald-50 bg-white">{expenses.map((e) => <tr key={e.id}><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3">{e.type}</td><td className="px-4 py-3 font-semibold">{e.label}</td><td className="px-4 py-3 font-black">{e.amount}</td><td className="px-4 py-3">{e.beneficiaryName}</td><td className="px-4 py-3">{e.beneficiaryCountry}</td><td className="px-4 py-3">{e.beneficiaryCity}</td><td className="px-4 py-3"><Badge tone={statusTones[e.status]}>{e.status}</Badge></td><td className="px-4 py-3">{e.createdBy?.fullName || e.createdBy?.email || "-"}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"} onClick={() => approveMut.mutate(e.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Approuver</button><button disabled={actionPending || e.status === "EFFECTUER" || e.status === "REJETER"} onClick={() => rejectMut.mutate(e.id)} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Rejeter</button></div></td></tr>)}{!expenses.length ? <tr><td colSpan="10" className="px-4 py-6 text-center text-slate-500">Aucune dépense</td></tr> : null}</tbody></table></div></Card>}</main></div>;
}
