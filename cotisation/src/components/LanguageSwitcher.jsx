import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
    >
      <option value="fr">🇫🇷 FR</option>
      <option value="en">🇬🇧 EN</option>
      <option value="ar">🇸🇦 AR</option>
      <option value="so">🇸🇴 SO</option>
    </select>
  );
}
