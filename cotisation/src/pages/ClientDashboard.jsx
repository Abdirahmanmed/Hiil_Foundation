import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Card from "../components/ui/Card";
import Brand from "../components/Brand";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { PrimaryButton } from "../components/ui/Button";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createSubscriptionApi,
  listSubscriptionsApi,
  consentApi,
} from "../api/subscriptions.api";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";

const BANKS_BY_COUNTRY = {
  Djibouti: ["Salaam Bank", "EXIM Bank", "BCIMR", "BRED", "CAC Bank"],
  Ethiopie: ["Commercial Bank of Ethiopia", "Dashen Bank", "Awash Bank"],
  France: ["BNP Paribas", "Société Générale", "Crédit Agricole", "Boursorama"],
};

const WALLET_PROVIDERS = [
  { id: "WAAFI", label: "Waafi" },
  { id: "CAC_PAY", label: "CAC Pay" },
  { id: "D_MONEY", label: "D-Money" },
  { id: "SABAPAY", label: "SabaPay" },
  { id: "DAHABPLACE", label: "Dahabplace" },
];

export default function ClientDashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  // =========================
  // STATE
  // =========================
  const [bankCountry, setBankCountry] = useState("Djibouti");
  const [bankName, setBankName] = useState("Salaam Bank");
  const [currency, setCurrency] = useState("DJF");

  const [paymentMethod, setPaymentMethod] = useState("WALLET"); // WALLET | BANK_TRANSFER
  const [mode, setMode] = useState("MANUAL"); // AUTOMATIC | MANUAL
  const [accountNumber, setAccountNumber] = useState("");

  const [walletProvider, setWalletProvider] = useState("WAAFI");
  const [walletAccount, setWalletAccount] = useState(user?.phone || "");

  const [amount, setAmount] = useState("6000");
  const [frequency, setFrequency] = useState("MONTHLY");

  // =========================
  // DERIVED
  // =========================
  const countries = useMemo(() => Object.keys(BANKS_BY_COUNTRY), []);
  const banksForCountry = useMemo(
    () => BANKS_BY_COUNTRY[bankCountry] || [],
    [bankCountry],
  );

  const isDjibouti = useMemo(
    () => bankCountry.trim().toLowerCase() === "djibouti",
    [bankCountry],
  );

  // =========================
  // EFFECTS
  // =========================
  useEffect(() => {
    if (!banksForCountry.length) {
      setBankName("");
      return;
    }
    if (!banksForCountry.includes(bankName)) {
      setBankName(banksForCountry[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCountry, banksForCountry]);

  useEffect(() => {
    if (!isDjibouti && paymentMethod === "WALLET") {
      setPaymentMethod("BANK_TRANSFER");
    }
  }, [isDjibouti, paymentMethod]);

  // =========================
  // QUERIES
  // =========================
  const q = useQuery({
    queryKey: ["my-subs"],
    queryFn: listSubscriptionsApi,
  });

  const createM = useMutation({
    mutationFn: createSubscriptionApi,
    onSuccess: () => {
      toast.success(t("sub_created"));
      q.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("sub_create_error")),
  });

  const consentM = useMutation({
    mutationFn: ({ id }) => consentApi(id, true),
    onSuccess: () => {
      toast.success(t("consent_accepted"));
      q.refetch();
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || t("consent_error")),
  });

  // =========================
  // SUBMIT
  // =========================
  function onSubmit(e) {
    e.preventDefault();

    const payload = {
      bankCountry,
      bankName,
      currency,
      paymentMethod,
      amount: Number(amount || 0),
      frequency,
    };

    if (!payload.amount || payload.amount <= 0) {
      return toast.error(t("amount_required"));
    }

    if (paymentMethod === "BANK_TRANSFER") {
      if (!accountNumber.trim()) return toast.error(t("account_required"));
      payload.mode = mode;
      payload.accountNumber = accountNumber.trim();
    } else {
      if (!isDjibouti) return toast.error(t("wallet_only_dj"));
      if (!walletAccount.trim()) return toast.error(t("wallet_required"));
      payload.walletProvider = walletProvider;
      payload.walletAccount = walletAccount.trim();
    }

    createM.mutate(payload);
  }

  const subs = q.data?.subscriptions || [];
  const submitDisabled =
    createM.isPending ||
    (paymentMethod === "BANK_TRANSFER"
      ? !accountNumber.trim()
      : !walletAccount.trim());

  const roleKey =
    user?.accountType === "CLIENT_ADHERENT"
      ? "role_adherent"
      : user?.accountType === "ASSOCIATION"
        ? "role_association"
        : "role_unknown";

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-emerald-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Brand />

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <button
              onClick={() => nav("/invite")}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              {t("invite_community")}
            </button>

            <div className="hidden text-xs text-slate-500 md:block">
              {user?.fullName} •{" "}
              <span className="font-bold text-slate-800">{t(roleKey)}</span>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              {t("logout")}
            </button>
          </div>
        </div>

        {/* mobile user */}
        <div className="mx-auto max-w-6xl px-4 pb-4 md:hidden">
          <div className="text-xs text-slate-500">
            {user?.fullName} •{" "}
            <span className="font-bold text-slate-800">{t(roleKey)}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* FORM */}
          <Card className="relative overflow-hidden p-7 lg:col-span-7">
            {/* soft gradients */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />

            <div className="relative">
              <div className="text-2xl font-black text-slate-900">
                {t("client_create_sub")}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {t("client_sub_desc")}
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {/* Currency + PaymentMethod */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="DJF">DJF</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </Select>

                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="BANK_TRANSFER">{t("bank_transfer")}</option>
                    <option value="WALLET" disabled={!isDjibouti}>
                      {t("wallet_djibouti")}
                    </option>
                  </Select>
                </div>

                {/* BANK TRANSFER */}
                {paymentMethod === "BANK_TRANSFER" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      value={bankCountry}
                      onChange={(e) => setBankCountry(e.target.value)}
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>

                    <Select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={!banksForCountry.length}
                    >
                      {banksForCountry.length ? (
                        banksForCountry.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))
                      ) : (
                        <option value="">{t("choose_country_first")}</option>
                      )}
                    </Select>

                    <Select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="AUTOMATIC">AUTOMATIC</option>
                      <option value="MANUAL">MANUAL</option>
                    </Select>

                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={t("account_number")}
                    />
                  </div>
                ) : (
                  /* WALLET */
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      value={walletProvider}
                      onChange={(e) => setWalletProvider(e.target.value)}
                    >
                      {WALLET_PROVIDERS.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.label}
                        </option>
                      ))}
                    </Select>

                    <Input
                      value={walletAccount}
                      onChange={(e) => setWalletAccount(e.target.value)}
                      placeholder={t("wallet_number")}
                    />
                  </div>
                )}

                {/* Amount + Frequency */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder={t("amount")}
                    inputMode="numeric"
                  />

                  <Select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="MONTHLY">MONTHLY</option>
                    <option value="QUARTERLY">QUARTERLY</option>
                    <option value="SEMIANNUAL">SEMIANNUAL</option>
                    <option value="ANNUAL">ANNUAL</option>
                  </Select>
                </div>

                <PrimaryButton
                  type="submit"
                  loading={createM.isPending}
                  disabled={submitDisabled}
                >
                  {t("create")}
                </PrimaryButton>
              </form>
            </div>
          </Card>

          {/* LIST */}
          <Card className="p-7 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-black text-slate-900">
                {t("my_subs")}
              </div>
              <div className="text-xs text-slate-500">
                {subs.length} {t("total")}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {q.isLoading ? (
                <div className="text-sm text-slate-600">{t("loading")}</div>
              ) : q.isError ? (
                <div className="text-sm text-red-600">{t("load_error")}</div>
              ) : subs.length === 0 ? (
                <div className="text-sm text-slate-600">{t("no_subs")}</div>
              ) : (
                subs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-extrabold text-slate-900">
                        {s.paymentMethod}
                      </div>
                      <div className="text-xs text-slate-500">{s.status}</div>
                    </div>

                    <div className="mt-2 text-xs text-slate-600">
                      {s.bankCountry} • {s.bankName} • {s.currency}
                    </div>

                    <div className="mt-2 text-sm font-black text-emerald-700">
                      {s.amount} {s.currency} • {s.frequency}
                    </div>

                    {!s.consentAccepted ? (
                      <div className="mt-3">
                        <PrimaryButton
                          loading={consentM.isPending}
                          onClick={() => consentM.mutate({ id: s.id })}
                          type="button"
                        >
                          {t("accept_conditions")}
                        </PrimaryButton>
                      </div>
                    ) : (
                      <div className="mt-3 text-xs font-semibold text-emerald-700">
                        ✅ {t("consent_ok")}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
