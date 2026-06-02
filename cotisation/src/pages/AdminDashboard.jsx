import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/ui/Badge";
import SectionTitle from "../components/ui/SectionTitle";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import Drawer from "../components/ui/Drawer";
import { useTranslation } from "react-i18next";

import {
  getAdminDashboard,
  getAdminUsers,
  createAdminUser,
  getAdherentsContributions,
  patchUserStatus,
  patchUserRole,
  resetUserOtp,
  getUserDetails,
  getAudit,
} from "../api/admin.api";

import { SimpleBarChart, SimplePieChart } from "../components/DashboardCharts";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { logPerf } from "../utils/perf";

const USER_STATUS_TONES = {
  PENDING_VERIFICATION: "yellow",
  ACTIVE: "green",
  SUSPENDED: "purple",
  BLOCKED: "red",
};

const SUB_STATUS_TONES = {
  DRAFT: "neutral",
  PENDING_CONSENT: "yellow",
  ACTIVE: "green",
  ACTIVE_MANUAL: "blue",
  CANCELLED: "red",
};

const ROLE_OPTIONS = ["ADMIN", "GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"];
const ADMIN_ROLE_OPTIONS = ["GESTIONNAIRE_DEPENSE", "EQUIPE_TRESORERIE"];

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "-";
  }
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
      <div className="text-xs font-black text-slate-600">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-slate-900">
        {value ?? "-"}
      </div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function SoftKpi({ label, value }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
      <div className="text-xs font-black text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">
        {value ?? "-"}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  // Tabs
  const [tab, setTab] = useState("overview"); // overview | users | adherents | audit

  // Users
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "GESTIONNAIRE_DEPENSE",
    status: "ACTIVE",
    password: "",
    confirmPassword: "",
  });

  // Adhérents
  const [subSearch, setSubSearch] = useState("");
  const [subStatus, setSubStatus] = useState("ALL");

  // Audit filters + paging
  const [auditAction, setAuditAction] = useState("");
  const [auditEntity, setAuditEntity] = useState("");
  const [auditUserId, setAuditUserId] = useState("");
  const [auditLimit, setAuditLimit] = useState(25);
  const [auditOffset, setAuditOffset] = useState(0);

  // Queries
  const qStats = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
  });
  const qUsers = useQuery({
    queryKey: ["admin-users"],
    queryFn: getAdminUsers,
    enabled: tab === "users",
  });
  const qSubs = useQuery({
    queryKey: ["admin-adherents-contributions"],
    queryFn: getAdherentsContributions,
    enabled: tab === "adherents",
  });

  const qUserDetails = useQuery({
    queryKey: ["admin-user-details", selectedUserId],
    queryFn: () => getUserDetails(selectedUserId),
    enabled: !!selectedUserId,
  });

  const qAudit = useQuery({
    queryKey: [
      "admin-audit",
      auditAction,
      auditEntity,
      auditUserId,
      auditLimit,
      auditOffset,
    ],
    queryFn: () =>
      getAudit({
        action: auditAction || undefined,
        entity: auditEntity || undefined,
        userId: auditUserId || undefined,
        limit: auditLimit,
        offset: auditOffset,
      }),
    enabled: tab === "audit",
    keepPreviousData: true,
  });

  useEffect(() => {
    if (qStats.isSuccess) {
      logPerf("dashboard.admin.firstDataLoad", {
        endpoint: "/api/admin/dashboard",
        latestUsers: qStats.data?.stats?.latestUsers?.length || 0,
        latestSubscriptions: qStats.data?.stats?.latestSubscriptions?.length || 0,
      });
    }
  }, [qStats.isSuccess, qStats.data]);

  const stats = qStats.data?.stats;
  const users = useMemo(
    () => (qUsers.data?.users || []).filter((apiUser) => apiUser.role !== "SUPER_ADMIN"),
    [qUsers.data?.users],
  );
  const subs = useMemo(() => qSubs.data?.contributions || [], [qSubs.data?.contributions]);

  // Derived data
  const usersFiltered = useMemo(() => {
    const s = userSearch.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      [
        u.fullName,
        u.companyName,
        u.email,
        u.phone,
        u.country,
        u.city,
        u.accountType,
        u.role,
        u.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [users, userSearch]);

  const subsFiltered = useMemo(() => {
    const s = subSearch.trim().toLowerCase();
    return subs.filter((sub) => {
      const matchText = !s
        ? true
        : [
            sub.name,
            sub.phone,
            sub.country,
            sub.city,
            sub.paymentMethod,
            sub.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(s);

      const matchStatus = subStatus === "ALL" ? true : sub.status === subStatus;
      return matchText && matchStatus;
    });
  }, [subs, subSearch, subStatus]);

  // Charts data
  const userStatusData = useMemo(() => {
    const map = new Map();
    for (const u of users) map.set(u.status, (map.get(u.status) || 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [users]);

  const subFrequencyData = useMemo(() => [
    { name: "Mensuelles", value: Number(stats?.monthlySubscriptionsCount || 0) },
    { name: "Annuelles", value: Number(stats?.annualSubscriptionsCount || 0) },
  ], [stats]);

  const subMethodData = useMemo(() => {
    const map = new Map();
    for (const s of subs)
      map.set(s.paymentMethod, (map.get(s.paymentMethod) || 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [subs]);

  // Mutations
  const mUserStatus = useMutation({
    mutationFn: ({ userId, status }) => patchUserStatus(userId, status),
    onSuccess: () => {
      toast.success(t("admin_user_status_updated"));
      qUsers.refetch();
      if (selectedUserId) qUserDetails.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const mUserRole = useMutation({
    mutationFn: ({ userId, role }) => patchUserRole(userId, role),
    onSuccess: () => {
      toast.success(t("admin_role_updated"));
      qUsers.refetch();
      if (selectedUserId) qUserDetails.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const mResetOtp = useMutation({
    mutationFn: (userId) => resetUserOtp(userId),
    onSuccess: () => {
      toast.success(t("admin_otp_reset_ok"));
      qUsers.refetch();
      if (selectedUserId) qUserDetails.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const mCreateUser = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success(t("user_created_success"));
      setCreateUserOpen(false);
      setCreateUserForm({
        fullName: "",
        email: "",
        phone: "",
        role: user?.role === "SUPER_ADMIN" ? "ADMIN" : "GESTIONNAIRE_DEPENSE",
        status: "ACTIVE",
        password: "",
        confirmPassword: "",
      });
      qUsers.refetch();
      qStats.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("error_generic")),
  });

  const canCreateAdminUser = user?.role === "SUPER_ADMIN";
  const createUserRoleOptions = canCreateAdminUser ? ROLE_OPTIONS : ADMIN_ROLE_OPTIONS;

  function updateCreateUserForm(field, value) {
    setCreateUserForm((current) => ({ ...current, [field]: value }));
  }

  function submitCreateUser(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createUserForm.email)) {
      toast.error(t("email_invalid"));
      return;
    }
    if (createUserForm.password !== createUserForm.confirmPassword) {
      toast.error(t("password_mismatch"));
      return;
    }
    mCreateUser.mutate(createUserForm);
  }

  const auditTotal = qAudit.data?.total ?? 0;
  const auditItems = qAudit.data?.items ?? [];
  const canPrev = auditOffset > 0;
  const canNext = auditOffset + auditLimit < auditTotal;

  return (
    <div className="min-h-screen bg-white">
      {/* Top header */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Brand />

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <div className="hidden text-xs text-slate-500 md:block">
              {user?.fullName} •{" "}
              <span className="font-bold text-slate-900">{user?.role}</span>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "overview", label: t("admin_overview") },
            { id: "users", label: t("users") },
            { id: "adherents", label: t("adherents") },
            { id: "audit", label: t("admin_audit") },
          ].map((tt) => (
            <button
              key={tt.id}
              onClick={() => setTab(tt.id)}
              className={[
                "rounded-full border px-4 py-2 text-xs font-black transition",
                tab === tt.id
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-emerald-100 bg-white text-slate-600 hover:bg-emerald-50",
              ].join(" ")}
            >
              {tt.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="p-7 lg:col-span-7 border border-emerald-100 bg-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.2)]">
              <SectionTitle
                title={t("admin_kpi")}
                subtitle={t("admin_kpi_sub")}
                right={
                  <div className="text-xs text-slate-500">
                    {qStats.isLoading ? t("loading") : "OK"}
                  </div>
                }
              />

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <StatCard label={t("admin_internal_users")} value={stats?.internalUsersCount} />
                <StatCard label={t("admin_adherents_count")} value={stats?.adherentsCount} />
                <StatCard label={t("admin_associations_count")} value={stats?.associationsCount} />
                <StatCard label={t("admin_expense_managers_count")} value={stats?.expenseManagersCount} />
                <StatCard label={t("admin_treasury_users_count")} value={stats?.treasuryUsersCount} />
                <StatCard label={t("admin_monthly_contributions")} value={stats?.monthlySubscriptionsCount} hint={stats?.monthlyCotisation} />
                <StatCard label={t("admin_annual_contributions")} value={stats?.annualSubscriptionsCount} hint={stats?.annualCotisation} />
                <StatCard label={t("admin_total_contributions_amount")} value={stats?.totalCotisation} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <SimpleBarChart
                  title={t("admin_users_by_status")}
                  data={userStatusData}
                  emptyMessage="Aucun utilisateur à afficher"
                />
                <SimplePieChart
                  title="Cotisations mensuelles vs annuelles"
                  data={subFrequencyData}
                  emptyMessage="Aucune cotisation mensuelle ou annuelle"
                />
              </div>
            </Card>

            <Card className="p-7 lg:col-span-5 border border-emerald-100 bg-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.2)]">
              <SectionTitle
                title={t("admin_payment_split")}
                subtitle={t("admin_payment_split_sub")}
              />

              <div className="mt-4">
                <SimpleBarChart
                  title={t("admin_payment_split")}
                  data={subMethodData}
                  emptyMessage="Aucune cotisation par méthode de paiement"
                />
              </div>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs text-slate-600">
                {t("admin_tip_pending")}
              </div>
            </Card>
          </div>
        ) : null}

        {/* USERS */}
        {tab === "users" ? (
          <Card className="p-7 border border-emerald-100 bg-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.2)]">
            <SectionTitle
              title={t("users")}
              subtitle={t("admin_users_sub")}
              right={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    onClick={() => setCreateUserOpen(true)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100"
                  >
                    {t("add_user")}
                  </button>
                  <div className="w-72">
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder={t("admin_search_user")}
                    />
                  </div>
                </div>
              }
            />

            <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100">
              <div className="grid grid-cols-12 gap-2 bg-emerald-50 px-4 py-3 text-xs font-black text-slate-600">
                <div className="col-span-2">{t("name")}</div>
                <div className="col-span-2">{t("email")}</div>
                <div className="col-span-2">{t("phone")}</div>
                <div className="col-span-2">{t("role")}</div>
                <div className="col-span-1">{t("status")}</div>
                <div className="col-span-1">{t("created_at")}</div>
                <div className="col-span-2 text-right">{t("actions")}</div>
              </div>

              {qUsers.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("loading")}
                </div>
              ) : usersFiltered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("no_results")}
                </div>
              ) : (
                usersFiltered.map((u) => {
                  const canEditRole = user?.role === "SUPER_ADMIN" && u.id !== user?.id;
                  const editableRoles = ROLE_OPTIONS;

                  return (
                    <div
                      key={u.id}
                      className="grid grid-cols-12 items-center gap-2 border-t border-emerald-100 px-4 py-3 text-sm hover:bg-emerald-50/40"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="col-span-2 text-left"
                        title={t("admin_user_details")}
                      >
                        <div className="font-extrabold text-slate-900">
                          {u.fullName || "—"}
                        </div>
                      </button>

                      <div className="col-span-2 truncate text-slate-700">{u.email}</div>
                      <div className="col-span-2 text-slate-700">{u.phone}</div>

                      <div className="col-span-2">
                        {canEditRole && editableRoles.includes(u.role) ? (
                          <Select
                            value={u.role}
                            onChange={(e) =>
                              mUserRole.mutate({
                                userId: u.id,
                                role: e.target.value,
                              })
                            }
                          >
                            {editableRoles.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge tone="neutral">{u.role}</Badge>
                        )}
                      </div>

                      <div className="col-span-1">
                        <Badge tone={USER_STATUS_TONES[u.status] || "neutral"}>
                          {u.status}
                        </Badge>
                      </div>

                      <div className="col-span-1 text-xs text-slate-500">
                        {fmtDate(u.createdAt)}
                      </div>

                      <div className="col-span-2 flex justify-end gap-2">
                        <Select
                          value={u.status}
                          onChange={(e) =>
                            mUserStatus.mutate({
                              userId: u.id,
                              status: e.target.value,
                            })
                          }
                          className="max-w-[160px]"
                        >
                          {["ACTIVE", "SUSPENDED"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>

                        {u.otpLockedUntil || u.otpSendCountHour ? (
                          <button
                            onClick={() => mResetOtp.mutate(u.id)}
                            className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50"
                            title="Reset OTP lock/counters"
                          >
                            Reset OTP
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        ) : null}

        {/* ADHERENTS */}
        {tab === "adherents" ? (
          <Card className="p-7 border border-emerald-100 bg-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.2)]">
            <SectionTitle
              title={t("adherents")}
              subtitle={t("admin_adherents_sub")}
              right={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="w-72">
                    <Input
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      placeholder={t("admin_search_adherent")}
                    />
                  </div>
                  <div className="w-56">
                    <Select
                      value={subStatus}
                      onChange={(e) => setSubStatus(e.target.value)}
                    >
                      <option value="ALL">{t("admin_all")}</option>
                      {[
                        "DRAFT",
                        "PENDING_CONSENT",
                        "ACTIVE",
                        "ACTIVE_MANUAL",
                        "CANCELLED",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              }
            />

            <div className="mt-5 overflow-x-auto rounded-2xl border border-emerald-100">
              <div className="grid min-w-[980px] grid-cols-12 gap-2 bg-emerald-50 px-4 py-3 text-xs font-black text-slate-600">
                <div className="col-span-2">{t("name")}</div>
                <div className="col-span-2">{t("phone")}</div>
                <div className="col-span-1">{t("country")}</div>
                <div className="col-span-1">{t("city")}</div>
                <div className="col-span-2">{t("payment_method")}</div>
                <div className="col-span-1">{t("payment_amount")}</div>
                <div className="col-span-1">{t("status")}</div>
                <div className="col-span-2 text-right">{t("payment_date")}</div>
              </div>

              {qSubs.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("loading")}
                </div>
              ) : subsFiltered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("no_results")}
                </div>
              ) : (
                subsFiltered.map((s) => (
                  <div
                    key={s.id}
                    className="grid min-w-[980px] grid-cols-12 items-center gap-2 border-t border-emerald-100 px-4 py-3 text-sm"
                  >
                    <div className="col-span-2 font-extrabold text-slate-900">
                      {s.name || "—"}
                    </div>
                    <div className="col-span-2 text-slate-700">{s.phone || "—"}</div>
                    <div className="col-span-1 text-slate-700">{s.country || "—"}</div>
                    <div className="col-span-1 text-slate-700">{s.city || "—"}</div>
                    <div className="col-span-2 font-black text-slate-900">
                      {s.paymentMethod || "—"}
                    </div>
                    <div className="col-span-1 font-black text-emerald-700">
                      {s.amount} {s.currency}
                    </div>
                    <div className="col-span-1">
                      <Badge tone={SUB_STATUS_TONES[s.status] || "neutral"}>
                        {s.status}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right text-xs text-slate-500">
                      {fmtDate(s.paidAt || s.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : null}

        {/* AUDIT */}
        {tab === "audit" ? (
          <Card className="p-7 border border-emerald-100 bg-white shadow-[0_20px_60px_-30px_rgba(16,185,129,0.2)]">
            <SectionTitle
              title={t("admin_audit_title")}
              subtitle={t("admin_audit_sub")}
              right={
                <button
                  onClick={() => qAudit.refetch()}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50"
                >
                  {t("refresh")}
                </button>
              }
            />

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Input
                value={auditAction}
                onChange={(e) => setAuditAction(e.target.value)}
                placeholder={t("admin_action_ph")}
              />
              <Input
                value={auditEntity}
                onChange={(e) => setAuditEntity(e.target.value)}
                placeholder={t("admin_entity_ph")}
              />
              <Input
                value={auditUserId}
                onChange={(e) => setAuditUserId(e.target.value)}
                placeholder={t("admin_userid_ph")}
              />
              <Select
                value={auditLimit}
                onChange={(e) => {
                  setAuditLimit(Number(e.target.value));
                  setAuditOffset(0);
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} {t("per_page")}
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {t("total_label")}:{" "}
                <span className="font-black text-slate-900">{auditTotal}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canPrev}
                  onClick={() =>
                    setAuditOffset((o) => Math.max(0, o - auditLimit))
                  }
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("previous")}
                </button>
                <button
                  disabled={!canNext}
                  onClick={() => setAuditOffset((o) => o + auditLimit)}
                  className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("next")}
                </button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100">
              <div className="grid grid-cols-12 gap-2 bg-emerald-50 px-4 py-3 text-xs font-black text-slate-600">
                <div className="col-span-3">{t("admin")}</div>
                <div className="col-span-3">{t("admin_action")}</div>
                <div className="col-span-2">{t("entity")}</div>
                <div className="col-span-2">{t("date")}</div>
                <div className="col-span-2 text-right">{t("ip")}</div>
              </div>

              {qAudit.isLoading ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("loading")}
                </div>
              ) : auditItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-600">
                  {t("no_logs")}
                </div>
              ) : (
                auditItems.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-12 items-center gap-2 border-t border-emerald-100 px-4 py-3 text-sm"
                  >
                    <div className="col-span-3">
                      <div className="font-extrabold text-slate-900">
                        {a.user?.fullName || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {a.user?.email || a.userId || "—"}
                      </div>
                    </div>

                    <div className="col-span-3">
                      <div className="font-black text-slate-900">
                        {a.action}
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">
                        {a.entityId ? `#${a.entityId}` : "—"}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Badge tone="neutral">{a.entity}</Badge>
                    </div>

                    <div className="col-span-2 text-xs text-slate-500">
                      {fmtDate(a.createdAt)}
                    </div>

                    <div className="col-span-2 text-right text-xs text-slate-500">
                      {a.ip || "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        ) : null}
      </div>

      {/* CREATE INTERNAL USER DRAWER */}
      <Drawer
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        title={t("add_user")}
        subtitle={t("admin_users_sub")}
      >
        <form onSubmit={submitCreateUser} className="space-y-4">
          <div>
            <div className="mb-1 text-xs font-black text-slate-600">
              {t("full_name")}
            </div>
            <Input
              value={createUserForm.fullName}
              onChange={(e) => updateCreateUserForm("fullName", e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-black text-slate-600">
              {t("email")}
            </div>
            <Input
              type="email"
              value={createUserForm.email}
              onChange={(e) => updateCreateUserForm("email", e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-black text-slate-600">
              {t("phone")}
            </div>
            <Input
              value={createUserForm.phone}
              onChange={(e) => updateCreateUserForm("phone", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-black text-slate-600">
                {t("role")}
              </div>
              <Select
                value={createUserForm.role}
                onChange={(e) => updateCreateUserForm("role", e.target.value)}
              >
                {createUserRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <div className="mb-1 text-xs font-black text-slate-600">
                {t("status")}
              </div>
              <Select
                value={createUserForm.status}
                onChange={(e) => updateCreateUserForm("status", e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
              </Select>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-black text-slate-600">
              {t("password")}
            </div>
            <Input
              type="password"
              minLength={8}
              value={createUserForm.password}
              onChange={(e) => updateCreateUserForm("password", e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-black text-slate-600">
              {t("confirm_password")}
            </div>
            <Input
              type="password"
              minLength={8}
              value={createUserForm.confirmPassword}
              onChange={(e) =>
                updateCreateUserForm("confirmPassword", e.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            disabled={mCreateUser.isPending}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mCreateUser.isPending ? t("loading") : t("add_user")}
          </button>
        </form>
      </Drawer>

      {/* USER DETAILS DRAWER */}
      <Drawer
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        title={t("admin_user_details")}
        subtitle={selectedUserId}
      >
        {qUserDetails.isLoading ? (
          <div className="text-sm text-slate-600">{t("loading")}</div>
        ) : qUserDetails.isError ? (
          <div className="text-sm text-red-600">{t("error_details")}</div>
        ) : (
          <>
            {(() => {
              const u = qUserDetails.data?.user;
              if (!u)
                return (
                  <div className="text-sm text-slate-600">
                    {t("no_details")}
                  </div>
                );

              return (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <SoftKpi label={t("name")} value={u.companyName || u.fullName} />
                    <SoftKpi label={t("account_type")} value={u.accountType} />
                    <SoftKpi label={t("role")} value={u.role} />
                    <SoftKpi label={t("email")} value={u.email} />
                    <SoftKpi label={t("phone")} value={u.phone} />
                    <SoftKpi label={t("country")} value={u.country} />
                    <SoftKpi label={t("city")} value={u.city} />
                  </div>

                  {u.accountType === "ASSOCIATION" ? (
                    <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                      <div className="text-xs font-black text-slate-600">
                        {t("account_type_association")}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <SoftKpi
                          label={t("association_status")}
                          value={
                            u.associationStatusDocPath
                              ? u.associationStatusDocPath.split("/").pop()
                              : "—"
                          }
                        />
                        <SoftKpi
                          label={t("representative_type")}
                          value={u.representativeType}
                        />
                        <SoftKpi
                          label={t("representative_name")}
                          value={u.representativeName}
                        />
                        <SoftKpi
                          label={t("representative_phone")}
                          value={u.representativePhone}
                        />
                        <SoftKpi
                          label={t("representative_email")}
                          value={u.representativeEmail}
                        />
                        <SoftKpi
                          label={t("representative_address")}
                          value={u.representativeAddress}
                        />
                        <SoftKpi
                          label={t("association_document_reference")}
                          value={
                            u.presidentIdDocPath
                              ? u.presidentIdDocPath.split("/").pop()
                              : "—"
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-slate-600">
                        {t("status")}
                      </div>
                      <Badge tone={USER_STATUS_TONES[u.status] || "neutral"}>
                        {u.status}
                      </Badge>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      {t("created")}: {fmtDate(u.createdAt)} • {t("updated")}:{" "}
                      {fmtDate(u.updatedAt)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                    <div className="text-xs font-black text-slate-600">
                      {t("subscriptions")}
                    </div>
                    <div className="mt-3 space-y-2">
                      {u.subscriptions?.length ? (
                        u.subscriptions.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-black text-slate-900">
                                {s.amount} {s.currency} • {s.frequency}
                              </div>
                              <Badge
                                tone={SUB_STATUS_TONES[s.status] || "neutral"}
                              >
                                {s.status}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {s.paymentMethod} • {s.bankCountry} • {s.bankName}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              {fmtDate(s.createdAt)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500">
                          {t("no_subs")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-100 bg-white p-4">
                    <div className="text-xs font-black text-slate-600">
                      {t("last_otps")}
                    </div>
                    <div className="mt-3 space-y-2">
                      {u.otps?.length ? (
                        u.otps.map((o) => (
                          <div
                            key={o.id}
                            className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-black text-slate-800">
                                {o.channel}
                              </div>
                              <div className="text-xs text-slate-500">
                                {fmtDate(o.createdAt)}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {t("expires")}: {fmtDate(o.expiresAt)} •{" "}
                              {t("attempts")}: {o.attempts} • {t("used")}:{" "}
                              {o.usedAt ? "✅" : "❌"}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500">
                          {t("no_otps")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </Drawer>
    </div>
  );
}
