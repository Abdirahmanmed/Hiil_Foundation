import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Brand() {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      className="flex items-center gap-3 min-w-0 shrink"
      style={{
        textDecoration: "none",
        maxWidth: 240,
      }}
    >
      {/* Logo */}
      <div
        className="grid place-items-center rounded-2xl shadow-glow shrink-0"
        style={{
          width: 48,
          height: 48,
        }}
      >
        <img
          src="/logoherciise.jpeg"
          alt={t("common.brandAlt")}
          style={{
            width: 44,
            height: 44,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Texte */}
      <div
        className="min-w-0"
        style={{
          overflow: "hidden",
        }}
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