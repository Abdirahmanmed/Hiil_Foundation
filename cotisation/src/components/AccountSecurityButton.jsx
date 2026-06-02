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
        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
      >
        {t("account.changePassword")}
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
