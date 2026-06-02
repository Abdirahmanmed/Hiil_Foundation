import { useTranslation } from "react-i18next";
import AccountSecurityButton from "./AccountSecurityButton";
import Brand from "./Brand";
import LanguageSwitcher from "./LanguageSwitcher";

export default function DashboardHeader({
  userLabel,
  onLogout,
  maxWidth = "max-w-6xl",
  actions,
}) {
  const { t } = useTranslation();

  return (
    <header className="border-b border-emerald-100 bg-white/80 backdrop-blur">
      <div
        className={`mx-auto flex ${maxWidth} min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="min-w-0 sm:max-w-[260px]">
          <Brand />
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <LanguageSwitcher />
          {actions}

          {userLabel ? (
            <div className="order-last w-full text-xs text-slate-500 md:order-none md:w-auto md:max-w-[18rem] md:truncate">
              {userLabel}
            </div>
          ) : null}

          <AccountSecurityButton />

          <button
            type="button"
            onClick={onLogout}
            className="min-w-0 flex-1 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:flex-none sm:px-3"
          >
            {t("common.logout", t("logout"))}
          </button>
        </div>
      </div>
    </header>
  );
}
