import { useState } from "react";
import { useTranslation } from "react-i18next";
import Drawer from "./ui/Drawer";
import ChangePasswordPanel from "./ChangePasswordPanel";

export default function AccountSecurityButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-0 flex-1 whitespace-nowrap rounded-xl border border-emerald-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:flex-none sm:px-3"
      >
        <span className="hidden sm:inline">{t("account.changePassword")}</span>
        <span className="sm:hidden">{t("account.changePasswordShort")}</span>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={t("account.myAccount")}
        subtitle={t("account.security")}
      >
        <ChangePasswordPanel onCancel={() => setOpen(false)} />
      </Drawer>
    </>
  );
}
