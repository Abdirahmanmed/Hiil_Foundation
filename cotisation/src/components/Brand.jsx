import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Brand() {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      className="flex min-w-0 items-center gap-2 text-inherit no-underline sm:gap-3"
    >
      {/* Logo */}
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-glow sm:h-12 sm:w-12"
      >
        <img
          src="/logoherciise.jpeg"
          alt={t("common.brandAlt")}
          className="h-10 w-10 object-contain sm:h-11 sm:w-11"
        />
      </div>

      {/* Texte */}
      <div
        className="min-w-0 overflow-hidden"
      >
        <div
          className="font-black tracking-tight"
          style={{
            fontSize: "1rem",
            color: "#0f172a",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t("common.brandName")}
        </div>

        <div
          className="text-black/55"
          style={{
            fontSize: "0.72rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t("common.brandTagline")}
        </div>
      </div>
    </Link>
  );
}