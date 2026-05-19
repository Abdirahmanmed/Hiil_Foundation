import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
    >
      <option value="fr">{t("common.langFr")}</option>
      <option value="en">{t("common.langEn")}</option>
      <option value="ar">{t("common.langAr")}</option>
      <option value="so">{t("common.langSo")}</option>
    </select>
  );
}
