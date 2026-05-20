import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "../context/AuthContext";

/* ─── Palette ─────────────────────────────────────────────── */
const G = {
  green: "#16a34a",
  greenMid: "#22c55e",
  greenLight: "#f0fdf4",
  greenBorder: "rgba(22,163,74,0.18)",
  gold: "#b8860b",
  goldLight: "#fffdf0",
  slate: "#1e293b",
  slateMid: "#475569",
  slateLight: "#94a3b8",
  border: "#e2e8f0",
  white: "#ffffff",
  offWhite: "#f8fafc",
};

/* ─── Animations ─────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut", delay: i * 0.1 },
  }),
};
const floaty = {
  animate: {
    y: [0, -9, 0],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ─── SectionLabel ───────────────────────────────────────── */
function SectionLabel({ children, color = G.green }) {
  const bg = color === G.green ? G.greenLight : G.goldLight;
  const bord = color === G.green ? G.greenBorder : "rgba(184,134,11,0.2)";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "0.7rem",
        fontWeight: 800,
        color,
        background: bg,
        border: `1px solid ${bord}`,
        padding: "0.25rem 0.9rem",
        borderRadius: "99px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

/* ─── NosActions ─────────────────────────────────────────── */
const THEMATIQUES = [
  { icon: "🏥", label: "Santé", count: 12, color: "#ef4444" },
  { icon: "📚", label: "Éducation", count: 18, color: "#3b82f6" },
  { icon: "🌾", label: "Lutte contre la pauvreté", count: 9, color: "#f59e0b" },
  { icon: "🌿", label: "Environnement", count: 7, color: "#22c55e" },
  { icon: "🚨", label: "Aide d'urgence", count: 5, color: "#f97316" },
  {
    icon: "👩‍💼",
    label: "Autonomisation des femmes",
    count: 11,
    color: "#a855f7",
  },
];

const PROGRAMMES = [
  {
    status: "En cours",
    title: "Accès à l'eau potable — Zone rurale Nord",
    thematique: "Environnement",
    beneficiaires: "3 200 personnes",
    fin: "Déc. 2025",
    desc: "Installation de 14 forages et formation de comités de gestion locaux dans 6 villages.",
  },
  {
    status: "En cours",
    title: "École numérique pour tous",
    thematique: "Éducation",
    beneficiaires: "850 élèves",
    fin: "Juin 2026",
    desc: "Équipement de 12 salles informatiques et formation de 30 enseignants aux outils numériques.",
  },
  {
    status: "Phare",
    title: "Microcrédits & entrepreneuriat féminin",
    thematique: "Autonomisation des femmes",
    beneficiaires: "420 femmes",
    fin: "Déc. 2026",
    desc: "Programme de microcrédit couplé à un accompagnement entrepreneurial sur 18 mois.",
  },
  {
    status: "En cours",
    title: "Nutrition infantile d'urgence",
    thematique: "Santé",
    beneficiaires: "1 100 enfants",
    fin: "Mars 2025",
    desc: "Distribution de compléments nutritionnels et sensibilisation des mères dans les zones critiques.",
  },
];

const HISTOIRES = [
  {
    nom: "Fatuma A.",
    region: "Région Nord",
    photo: "👩🏾",
    programme: "Microcrédits",
    quote:
      "Grâce à ce programme, j'ai pu ouvrir ma propre boutique. Aujourd'hui je fais vivre ma famille de 5 personnes.",
  },
  {
    nom: "Ibrahim M.",
    region: "Zone rurale Est",
    photo: "👨🏾",
    programme: "Accès à l'eau",
    quote:
      "Avant, mes enfants marchaient 4 km pour chercher de l'eau. Maintenant le forage est à 200m de notre maison.",
  },
  {
    nom: "Hodan K.",
    region: "Capitale",
    photo: "👩🏾‍🎓",
    programme: "École numérique",
    quote:
      "J'ai appris à coder à 14 ans. Je veux devenir ingénieure en informatique grâce à ce programme.",
  },
];

const CARTE_ZONES = [
  { top: "22%", left: "30%", label: "Région Nord", n: 8 },
  { top: "45%", left: "55%", label: "Zone Est", n: 5 },
  { top: "62%", left: "38%", label: "Capitale", n: 14 },
  { top: "75%", left: "65%", label: "Région Sud", n: 6 },
  { top: "35%", left: "70%", label: "Zone côtière", n: 4 },
];

const STATUS_COLORS = {
  "En cours": {
    bg: "#eff6ff",
    color: "#3b82f6",
    border: "rgba(59,130,246,0.2)",
  },
  Phare: { bg: "#fefce8", color: "#b8860b", border: "rgba(184,134,11,0.25)" },
};

function NosActions({ G, t }) {
  const thematiques = useMemo(
    () => [
      { icon: "🏥", label: t("home.actions.themes.health"), count: 12, color: "#ef4444" },
      { icon: "📚", label: t("home.actions.themes.education"), count: 18, color: "#3b82f6" },
      { icon: "🌾", label: t("home.actions.themes.poverty"), count: 9, color: "#f59e0b" },
      { icon: "🌿", label: t("home.actions.themes.environment"), count: 7, color: "#22c55e" },
      { icon: "🚨", label: t("home.actions.themes.emergency"), count: 5, color: "#f97316" },
      { icon: "👩‍💼", label: t("home.actions.themes.women"), count: 11, color: "#a855f7" },
    ],
    [t]
  );
  const programmes = useMemo(
    () => [
      {
        statusKey: "inProgress",
        status: t("home.actions.status.inProgress"),
        title: t("home.actions.programs.p1.title"),
        thematique: t("home.actions.themes.environment"),
        beneficiaires: t("home.actions.programs.p1.beneficiaries"),
        fin: t("home.actions.programs.p1.end"),
        desc: t("home.actions.programs.p1.desc"),
      },
      {
        statusKey: "inProgress",
        status: t("home.actions.status.inProgress"),
        title: t("home.actions.programs.p2.title"),
        thematique: t("home.actions.themes.education"),
        beneficiaires: t("home.actions.programs.p2.beneficiaries"),
        fin: t("home.actions.programs.p2.end"),
        desc: t("home.actions.programs.p2.desc"),
      },
      {
        statusKey: "featured",
        status: t("home.actions.status.featured"),
        title: t("home.actions.programs.p3.title"),
        thematique: t("home.actions.themes.women"),
        beneficiaires: t("home.actions.programs.p3.beneficiaries"),
        fin: t("home.actions.programs.p3.end"),
        desc: t("home.actions.programs.p3.desc"),
      },
      {
        statusKey: "inProgress",
        status: t("home.actions.status.inProgress"),
        title: t("home.actions.programs.p4.title"),
        thematique: t("home.actions.themes.health"),
        beneficiaires: t("home.actions.programs.p4.beneficiaries"),
        fin: t("home.actions.programs.p4.end"),
        desc: t("home.actions.programs.p4.desc"),
      },
    ],
    [t]
  );
  const [activeTheme, setActiveTheme] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    org: "",
    theme: "",
    desc: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const filtered = activeTheme
    ? programmes.filter((p) => p.thematique === activeTheme)
    : programmes;

  return (
    <section
      id="nos-actions"
      style={{ background: G.white, padding: "6rem 1.5rem" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <SectionLabel>{t("home.actions.sectionLabel")}</SectionLabel>
          <h2
            style={{
              fontSize: "clamp(1.9rem,3.5vw,2.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: G.slate,
              margin: "0.75rem 0 0.75rem",
              lineHeight: 1.1,
            }}
          >
            {t("home.actions.titlePrefix")}{" "}
            <span
              style={{
                background: `linear-gradient(135deg,${G.green},#15803d)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("home.actions.titleHighlight")}
            </span>{" "}
            {t("home.actions.titleSuffix")}
          </h2>
          <p
            style={{
              color: G.slateMid,
              maxWidth: 520,
              margin: "0 auto",
              fontSize: "0.97rem",
              lineHeight: 1.75,
            }}
          >
            {t("home.actions.subtitle")}
          </p>
        </motion.div>

        {/* ── Thématiques ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "3rem" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.green,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            {t("home.actions.byTheme")}
          </h3>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTheme(null)}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: "99px",
                border: `1px solid ${!activeTheme ? G.greenBorder : G.border}`,
                background: !activeTheme ? G.greenLight : G.offWhite,
                color: !activeTheme ? G.green : G.slateMid,
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t("home.actions.allThemes")} ({programmes.length})
            </button>
            {thematiques.map((th) => {
              const isActive = activeTheme === th.label;
              return (
                <button
                  key={th.label}
                  onClick={() => setActiveTheme(isActive ? null : th.label)}
                  style={{
                    padding: "0.5rem 1.1rem",
                    borderRadius: "99px",
                    border: `1px solid ${isActive ? th.color + "44" : G.border}`,
                    background: isActive ? th.color + "15" : G.offWhite,
                    color: isActive ? th.color : G.slateMid,
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {th.icon} {th.label}
                  <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                    ({th.count})
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Programmes ── */}
        <div style={{ marginBottom: "4rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.green,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            {t("home.actions.projectsTitle")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "1.1rem",
            }}
          >
            <AnimatePresence>
              {filtered.map((prog, i) => {
                const sc =
                  prog.statusKey === "featured"
                    ? STATUS_COLORS["Phare"]
                    : STATUS_COLORS["En cours"];
                return (
                  <motion.div
                    key={prog.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: i * 0.07, duration: 0.4 }}
                    whileHover={{
                      y: -3,
                      boxShadow: "0 16px 40px -12px rgba(22,163,74,0.15)",
                    }}
                    style={{
                      borderRadius: "1.25rem",
                      border: `1px solid ${G.border}`,
                      background: G.white,
                      padding: "1.6rem",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                      transition: "all 0.3s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "0.9rem",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "0.2rem 0.7rem",
                          borderRadius: "99px",
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {prog.statusKey === "featured" ? "⭐ " : "🔵 "}
                        {prog.status}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: G.slateLight,
                        }}
                      >
                        {t("home.actions.endLabel")} : {prog.fin}
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: "0.97rem",
                        fontWeight: 800,
                        color: G.slate,
                        margin: "0 0 0.4rem",
                        lineHeight: 1.35,
                      }}
                    >
                      {prog.title}
                    </h4>
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: G.slateMid,
                        lineHeight: 1.65,
                        margin: "0 0 0.9rem",
                      }}
                    >
                      {prog.desc}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.65rem",
                          borderRadius: "99px",
                          background: G.greenLight,
                          color: G.green,
                          border: `1px solid ${G.greenBorder}`,
                        }}
                      >
                        👥 {prog.beneficiaires}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.65rem",
                          borderRadius: "99px",
                          background: G.offWhite,
                          color: G.slateMid,
                          border: `1px solid ${G.border}`,
                        }}
                      >
                        {prog.thematique}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Carte interactive ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "4rem" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.green,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            {t("home.actions.mapTitle")}
          </h3>
          <div
            style={{
              position: "relative",
              borderRadius: "1.5rem",
              border: `1px solid ${G.border}`,
              background: `linear-gradient(160deg, #e8f5e9 0%, #f0fdf4 40%, #e0f2fe 100%)`,
              height: 320,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* Grid pattern */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0.15,
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
                <g key={v}>
                  <line
                    x1={v}
                    y1="0"
                    x2={v}
                    y2="100"
                    stroke={G.green}
                    strokeWidth="0.3"
                  />
                  <line
                    x1="0"
                    y1={v}
                    x2="100"
                    y2={v}
                    stroke={G.green}
                    strokeWidth="0.3"
                  />
                </g>
              ))}
            </svg>
            {/* Abstract country outline */}
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: 0.08,
              }}
              viewBox="0 0 400 320"
            >
              <path
                d="M80,40 Q120,20 180,35 Q240,50 280,30 Q340,15 370,60 Q390,100 380,160 Q370,220 330,260 Q280,300 220,295 Q160,290 120,270 Q70,245 60,200 Q45,150 50,100 Z"
                fill={G.green}
              />
            </svg>
            {/* Intervention points */}
            {CARTE_ZONES.map((z, i) => (
              <motion.div
                key={z.label}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4, type: "spring" }}
                style={{
                  position: "absolute",
                  top: z.top,
                  left: z.left,
                  transform: "translate(-50%,-50%)",
                  zIndex: 2,
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: G.green,
                      border: `3px solid white`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      color: "white",
                      boxShadow: "0 4px 16px rgba(22,163,74,0.4)",
                      cursor: "pointer",
                      animation: "pulse-dot 2.5s infinite",
                    }}
                  >
                    {z.n}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: G.slate,
                      color: "white",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "0.4rem",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    {z.label}
                  </div>
                </div>
              </motion.div>
            ))}
            {/* Legend */}
            <div
              style={{
                position: "absolute",
                bottom: "1rem",
                right: "1rem",
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(8px)",
                borderRadius: "0.75rem",
                padding: "0.6rem 0.9rem",
                border: `1px solid ${G.border}`,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: G.slate,
              }}
            >
              🟢 {t("home.actions.mapLegend")}
            </div>
          </div>
        </motion.div>

        {/* ── Appel à projets ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "4rem" }}
        >
          <div
            style={{
              borderRadius: "1.5rem",
              border: `1px solid ${G.greenBorder}`,
              background: `linear-gradient(135deg, ${G.greenLight} 0%, #f0fdf4 100%)`,
              padding: "2.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 900,
                  color: G.slate,
                  margin: "0 0 0.4rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📣 {t("home.actions.callTitle")}
              </h3>
              <p
                style={{
                  color: G.slateMid,
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: 480,
                }}
              >
                {t("home.actions.callDescription")}
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: "0.9rem 2rem",
                borderRadius: "0.875rem",
                background: `linear-gradient(135deg,${G.greenMid},${G.green})`,
                color: "white",
                fontWeight: 800,
                fontSize: "0.9rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 8px 24px -8px rgba(22,163,74,0.45)",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {showForm
                ? t("home.actions.closeForm")
                : t("home.actions.openForm")}
            </button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    borderRadius: "1.25rem",
                    border: `1px solid ${G.border}`,
                    background: G.white,
                    padding: "2rem",
                    marginTop: "1rem",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  {submitted ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                        ✅
                      </div>
                      <h4
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 900,
                          color: G.slate,
                          marginBottom: "0.5rem",
                        }}
                      >
                        {t("home.actions.submittedTitle")}
                      </h4>
                      <p style={{ color: G.slateMid, fontSize: "0.9rem" }}>
                        {t("home.actions.submittedDescription")}
                      </p>
                      <button
                        onClick={() => {
                          setSubmitted(false);
                          setShowForm(false);
                          setFormData({
                            nom: "",
                            org: "",
                            theme: "",
                            desc: "",
                          });
                        }}
                        style={{
                          marginTop: "1rem",
                          padding: "0.6rem 1.5rem",
                          borderRadius: "0.75rem",
                          background: G.greenLight,
                          border: `1px solid ${G.greenBorder}`,
                          color: G.green,
                          fontWeight: 800,
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t("home.actions.close")}
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      <h4
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          color: G.slate,
                          marginBottom: "1.5rem",
                        }}
                      >
                        {t("home.actions.formTitle")}
                      </h4>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        {[
                          {
                            key: "nom",
                            label: t("home.actions.form.projectOwnerLabel"),
                            placeholder: t(
                              "home.actions.form.projectOwnerPlaceholder"
                            ),
                          },
                          {
                            key: "org",
                            label: t("home.actions.form.organizationLabel"),
                            placeholder: t(
                              "home.actions.form.organizationPlaceholder"
                            ),
                          },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label
                              style={{
                                display: "block",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: G.slate,
                                marginBottom: "0.35rem",
                              }}
                            >
                              {label}
                            </label>
                            <input
                              value={formData[key]}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [key]: e.target.value,
                                })
                              }
                              placeholder={placeholder}
                              style={{
                                width: "100%",
                                padding: "0.7rem 0.9rem",
                                borderRadius: "0.625rem",
                                border: `1px solid ${G.border}`,
                                fontSize: "0.875rem",
                                color: G.slate,
                                outline: "none",
                                boxSizing: "border-box",
                                background: G.offWhite,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: "1rem" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: G.slate,
                            marginBottom: "0.35rem",
                          }}
                        >
                          {t("home.actions.form.themeLabel")}
                        </label>
                        <select
                          value={formData.theme}
                          onChange={(e) =>
                            setFormData({ ...formData, theme: e.target.value })
                          }
                          style={{
                            width: "100%",
                            padding: "0.7rem 0.9rem",
                            borderRadius: "0.625rem",
                            border: `1px solid ${G.border}`,
                            fontSize: "0.875rem",
                            color: G.slate,
                            background: G.offWhite,
                            outline: "none",
                          }}
                        >
                          <option value="">
                            {t("home.actions.form.themePlaceholder")}
                          </option>
                          {thematiques.map((th) => (
                            <option key={th.label}>
                              {th.icon} {th.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: G.slate,
                            marginBottom: "0.35rem",
                          }}
                        >
                          {t("home.actions.form.descriptionLabel")}
                        </label>
                        <textarea
                          rows={4}
                          value={formData.desc}
                          onChange={(e) =>
                            setFormData({ ...formData, desc: e.target.value })
                          }
                          placeholder={t(
                            "home.actions.form.descriptionPlaceholder"
                          )}
                          style={{
                            width: "100%",
                            padding: "0.7rem 0.9rem",
                            borderRadius: "0.625rem",
                            border: `1px solid ${G.border}`,
                            fontSize: "0.875rem",
                            color: G.slate,
                            background: G.offWhite,
                            outline: "none",
                            resize: "vertical",
                            lineHeight: 1.65,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (formData.nom && formData.desc) setSubmitted(true);
                        }}
                        style={{
                          padding: "0.85rem 2rem",
                          borderRadius: "0.875rem",
                          background: `linear-gradient(135deg,${G.greenMid},${G.green})`,
                          color: "white",
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 8px 24px -8px rgba(22,163,74,0.4)",
                        }}
                      >
                        {t("home.actions.form.submit")} →
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Histoires ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.green,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            {t("home.actions.storiesTitle")}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "1.1rem",
            }}
          >
            {HISTOIRES.map((h, i) => (
              <motion.div
                key={h.nom}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  borderRadius: "1.25rem",
                  border: `1px solid ${G.border}`,
                  background: G.offWhite,
                  padding: "1.75rem",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: `linear-gradient(90deg,${G.green},${G.greenMid})`,
                  }}
                />
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
                  {h.photo}
                </div>
                <blockquote
                  style={{
                    fontSize: "0.88rem",
                    color: G.slateMid,
                    lineHeight: 1.75,
                    fontStyle: "italic",
                    margin: "0 0 1rem",
                    borderLeft: `3px solid ${G.greenBorder}`,
                    paddingLeft: "0.75rem",
                  }}
                >
                  « {h.quote} »
                </blockquote>
                <div
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: G.slate,
                  }}
                >
                  {h.nom}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: G.green,
                    marginTop: "0.15rem",
                  }}
                >
                  {h.programme} · {h.region}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse-dot { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,0.4)} 50%{box-shadow:0 0 0 10px rgba(22,163,74,0)} }
      `}</style>
    </section>
  );
}

/* ─── NotreImpact ────────────────────────────────────────── */
const INDICATEURS = [
  {
    val: "47 200",
    label: "Bénéficiaires directs",
    icon: "👥",
    evolution: "+18% vs 2023",
  },
  { val: "62", label: "Projets réalisés", icon: "✅", evolution: "+9 en 2024" },
  {
    val: "14",
    label: "Pays d'intervention",
    icon: "🌍",
    evolution: "3 nouveaux",
  },
  {
    val: "8,4 M€",
    label: "Ressources mobilisées",
    icon: "💶",
    evolution: "+22% vs 2023",
  },
  {
    val: "94%",
    label: "Projets finalisés dans les délais",
    icon: "⏱️",
    evolution: "Objectif : 90%",
  },
  {
    val: "4,7/5",
    label: "Satisfaction des bénéficiaires",
    icon: "⭐",
    evolution: "1 200 évaluations",
  },
];

const RAPPORTS_IMPACT = [
  {
    year: "2024",
    pages: 48,
    featured: true,
    desc: "Résultats complets, évaluations indépendantes et perspectives 2025.",
  },
  {
    year: "2023",
    pages: 42,
    featured: false,
    desc: "Bilan des programmes santé & éducation. +15 000 nouveaux bénéficiaires.",
  },
  {
    year: "2022",
    pages: 38,
    featured: false,
    desc: "Première édition des indicateurs d'impact standardisés.",
  },
];

const TEMOIGNAGES = [
  {
    nom: "Dr. Safia O.",
    role: "Coordinatrice santé, OMS",
    photo: "👩🏾‍⚕️",
    quote:
      "Un partenaire de terrain remarquable. Leur capacité à mobiliser les communautés locales est exceptionnelle.",
  },
  {
    nom: "Marc D.",
    role: "Directeur, Agence Française de Développement",
    photo: "👨‍💼",
    quote:
      "Des résultats mesurables, une gestion transparente. Un modèle à suivre dans le secteur associatif.",
  },
  {
    nom: "Khadija M.",
    role: "Bénéficiaire — Programme éducation",
    photo: "👩🏾‍🎓",
    quote:
      "Ce programme a changé l'avenir de mon quartier. Les enfants ont maintenant accès à une éducation de qualité.",
  },
];

const VIDEOS = [
  {
    titre: "Reportage : L'eau arrive au village",
    duree: "4:32",
    categorie: "Terrain",
    thumb: "🌊",
  },
  {
    titre: "Success story : Fatuma et son entreprise",
    duree: "3:18",
    categorie: "Témoignage",
    thumb: "💼",
  },
  {
    titre: "Bilan 2024 — Nos chiffres clés",
    duree: "6:05",
    categorie: "Rapport",
    thumb: "📊",
  },
];

const EVAL_ETAPES = [
  {
    label: "Définition des indicateurs",
    desc: "En amont de chaque projet, nous définissons des KPIs SMART mesurables.",
  },
  {
    label: "Collecte de données terrain",
    desc: "Enquêtes régulières auprès des bénéficiaires et partenaires locaux.",
  },
  {
    label: "Évaluation mi-parcours",
    desc: "Revue indépendante à mi-projet avec ajustement si nécessaire.",
  },
  {
    label: "Évaluation finale & capitalisation",
    desc: "Rapport d'évaluation externe, leçons apprises et recommandations.",
  },
];
/* ─── Actualités data ─────────────────────────────────────── */
const ARTICLES = [
  {
    emoji: "🌿",
    categorie: "Environnement",
    catColor: "#22c55e",
    catBg: "#f0fdf4",
    catBorder: "rgba(22,163,74,0.2)",
    date: "12 jan. 2025",
    title: "Comment nos forages transforment la vie de 3 000 familles rurales",
    desc: "Retour sur le programme d'accès à l'eau potable dans la région Nord.",
  },
  {
    emoji: "📚",
    categorie: "Éducation",
    catColor: "#3b82f6",
    catBg: "#eff6ff",
    catBorder: "rgba(59,130,246,0.2)",
    date: "5 jan. 2025",
    title: "École numérique : 30 enseignants formés en 3 semaines",
    desc: "Un succès remarquable dans la mise en œuvre du programme Numérique pour tous.",
  },
  {
    emoji: "👩‍💼",
    categorie: "Autonomisation",
    catColor: "#a855f7",
    catBg: "#f5f3ff",
    catBorder: "rgba(168,85,247,0.2)",
    date: "28 déc. 2024",
    title: "420 femmes entrepreneures : bilan du programme de microcrédits",
    desc: "Chiffres, portraits et perspectives pour 2025 du programme phare.",
  },
];

const COMMUNIQUES = [
  {
    date: "15 jan. 2025",
    title:
      "Lancement du programme d'urgence nutritionnelle dans 6 nouvelles zones",
    tag: "Communiqué",
  },
  {
    date: "3 déc. 2024",
    title: "Partenariat stratégique avec l'AFD pour 2025–2027",
    tag: "Partenariat",
  },
  {
    date: "18 nov. 2024",
    title: "Résultats du rapport d'impact 2024 : +18% de bénéficiaires",
    tag: "Rapport",
  },
  {
    date: "4 oct. 2024",
    title: "Ouverture de trois nouveaux bureaux régionaux",
    tag: "Organisation",
  },
];

const EVENEMENTS = [
  {
    emoji: "🎤",
    date: "28 fév. 2025",
    avenir: true,
    title: "Conférence annuelle des partenaires 2025",
    lieu: "Palais des Congrès, Capitale",
    desc: "Bilan 2024 et feuille de route 2025 présentés devant 200+ partenaires.",
  },
  {
    emoji: "🏃",
    date: "15 mars 2025",
    avenir: true,
    title: "Course solidaire « Courons ensemble »",
    lieu: "Parc Central",
    desc: "Collecte de fonds ouverte au grand public. Inscriptions ouvertes.",
  },
  {
    emoji: "🎓",
    date: "10 jan. 2025",
    avenir: false,
    title: "Remise de diplômes — Programme formation",
    lieu: "Centre communautaire Nord",
    desc: "Célébration des 120 diplômés de la promotion 2024.",
  },
];

const NEWSLETTER_ARCHIVES = [
  "Décembre 2024 — Bilan de fin d'année",
  "Novembre 2024 — Focus programme nutrition",
  "Octobre 2024 — Nouveaux partenaires",
  "Septembre 2024 — Rentrée solidaire",
  "Août 2024 — Été sur le terrain",
];

const BENEVOLE_ROLES = [
  { emoji: "🏥", role: "Bénévole terrain santé", dispo: "Mission 2–4 sem." },
  { emoji: "💻", role: "Compétences numériques", dispo: "À distance possible" },
  {
    emoji: "📢",
    role: "Ambassadeur / communication",
    dispo: "Ponctuel ou régulier",
  },
  { emoji: "📦", role: "Logistique & collecte", dispo: "Événements" },
];

const WHY_GIVE = [
  {
    emoji: "🔍",
    title: "Transparence totale",
    desc: "72% de vos dons financent directement les projets terrain.",
  },
  {
    emoji: "📊",
    title: "Impact mesurable",
    desc: "Rapports annuels certifiés, indicateurs vérifiables.",
  },
  {
    emoji: "🧾",
    title: "Déduction fiscale",
    desc: "Don déductible à 66% de l'impôt sur le revenu.",
  },
  {
    emoji: "💬",
    title: "Suivi de votre don",
    desc: "Espace donateur avec actualités de votre projet soutenu.",
  },
];

function NotreImpact({ G }) {
  const [activeVideo, setActiveVideo] = useState(null);

  return (
    <section
      id="notre-impact"
      style={{ background: G.greenLight, padding: "6rem 1.5rem" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <SectionLabel color={G.gold}>Notre impact</SectionLabel>
          <h2
            style={{
              fontSize: "clamp(1.9rem,3.5vw,2.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: G.slate,
              margin: "0.75rem 0 0.75rem",
              lineHeight: 1.1,
            }}
          >
            Des résultats{" "}
            <span
              style={{
                background: `linear-gradient(135deg,${G.gold},#a16207)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              concrets & mesurables
            </span>
          </h2>
          <p
            style={{
              color: G.slateMid,
              maxWidth: 520,
              margin: "0 auto",
              fontSize: "0.97rem",
              lineHeight: 1.75,
            }}
          >
            La transparence est au cœur de notre engagement. Voici la preuve de
            ce que nous accomplissons ensemble.
          </p>
        </motion.div>

        {/* ── Indicateurs chiffrés ── */}
        <div style={{ marginBottom: "4rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.gold,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            Résultats chiffrés & indicateurs clés
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
              gap: "1rem",
            }}
          >
            {INDICATEURS.map((ind, i) => (
              <motion.div
                key={ind.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{
                  y: -3,
                  boxShadow: "0 16px 40px -12px rgba(184,134,11,0.15)",
                }}
                style={{
                  borderRadius: "1.25rem",
                  border: `1px solid ${G.border}`,
                  background: G.white,
                  padding: "1.5rem",
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s",
                }}
              >
                <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
                  {ind.icon}
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    color: G.slate,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {ind.val}
                </div>
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: G.slateMid,
                    margin: "0.3rem 0 0.5rem",
                    lineHeight: 1.3,
                  }}
                >
                  {ind.label}
                </div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    color: G.green,
                    padding: "0.2rem 0.6rem",
                    borderRadius: "99px",
                    background: G.greenLight,
                    border: `1px solid ${G.greenBorder}`,
                    display: "inline-block",
                  }}
                >
                  ↑ {ind.evolution}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Rapports d'impact ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "4rem" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.gold,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            Rapports d'impact
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "1rem",
            }}
          >
            {RAPPORTS_IMPACT.map((r) => (
              <motion.div
                key={r.year}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                style={{
                  borderRadius: "1.25rem",
                  padding: "1.75rem",
                  border: `1px solid ${r.featured ? "rgba(184,134,11,0.3)" : G.border}`,
                  background: r.featured ? G.goldLight : G.white,
                  boxShadow: r.featured
                    ? "0 8px 32px -8px rgba(184,134,11,0.15)"
                    : "0 2px 12px rgba(0,0,0,0.04)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {r.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg,${G.gold},#d97706)`,
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: r.featured ? G.gold : G.slateLight,
                        marginBottom: "0.2rem",
                      }}
                    >
                      {r.featured ? "⭐ Dernier rapport" : "Archives"}
                    </div>
                    <div
                      style={{
                        fontSize: "1.4rem",
                        fontWeight: 900,
                        color: G.slate,
                      }}
                    >
                      Rapport {r.year}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: G.slateMid,
                      background: G.offWhite,
                      padding: "0.3rem 0.6rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    {r.pages} pages
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: G.slateMid,
                    lineHeight: 1.65,
                    margin: "0 0 1.1rem",
                  }}
                >
                  {r.desc}
                </p>
                <a
                  href="#"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1.1rem",
                    borderRadius: "0.625rem",
                    background: r.featured ? G.gold : G.offWhite,
                    color: r.featured ? "white" : G.slate,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    textDecoration: "none",
                    border: `1px solid ${r.featured ? G.gold : G.border}`,
                    transition: "all 0.2s",
                  }}
                >
                  📄 Télécharger (PDF)
                </a>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Témoignages ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "4rem" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.gold,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            Témoignages & success stories
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: "1rem",
            }}
          >
            {TEMOIGNAGES.map((t, i) => (
              <motion.div
                key={t.nom}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{
                  borderRadius: "1.25rem",
                  border: `1px solid ${G.border}`,
                  background: G.white,
                  padding: "1.75rem",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    color: G.gold,
                    marginBottom: "0.75rem",
                    lineHeight: 1,
                  }}
                >
                  "
                </div>
                <p
                  style={{
                    fontSize: "0.88rem",
                    color: G.slateMid,
                    lineHeight: 1.75,
                    fontStyle: "italic",
                    margin: "0 0 1.25rem",
                  }}
                >
                  {t.quote}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: G.greenLight,
                      border: `2px solid ${G.greenBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.3rem",
                    }}
                  >
                    {t.photo}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        color: G.slate,
                      }}
                    >
                      {t.nom}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: G.slateMid,
                      }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Vidéos / Reportages ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginBottom: "4rem" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.gold,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            Vidéos & reportages
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: "1rem",
            }}
          >
            {VIDEOS.map((v, i) => (
              <motion.div
                key={v.titre}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                onClick={() => setActiveVideo(activeVideo === i ? null : i)}
                style={{
                  borderRadius: "1.25rem",
                  border: `1px solid ${activeVideo === i ? G.greenBorder : G.border}`,
                  background: G.white,
                  overflow: "hidden",
                  cursor: "pointer",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    height: 140,
                    background: `linear-gradient(135deg,${G.greenLight},${G.offWhite})`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: "3rem" }}>{v.thumb}</div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background:
                        activeVideo === i ? G.green : "rgba(255,255,255,0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                      position: "absolute",
                      transition: "all 0.2s",
                      color: activeVideo === i ? "white" : G.slate,
                    }}
                  >
                    {activeVideo === i ? "⏸" : "▶"}
                  </div>
                </div>
                <div style={{ padding: "1rem 1.1rem" }}>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: G.green,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {v.categorie}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      color: G.slate,
                      lineHeight: 1.35,
                      marginBottom: "0.35rem",
                    }}
                  >
                    {v.titre}
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: G.slateLight,
                      fontWeight: 600,
                    }}
                  >
                    ⏱ {v.duree}
                  </div>
                  {activeVideo === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      style={{
                        marginTop: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "0.5rem",
                        background: G.greenLight,
                        border: `1px solid ${G.greenBorder}`,
                        fontSize: "0.78rem",
                        color: G.green,
                        fontWeight: 700,
                      }}
                    >
                      ▶ Lecture simulée — intégrez ici votre lecteur vidéo
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Évaluation & suivi ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 800,
              color: G.slate,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 4,
                height: 18,
                background: G.gold,
                borderRadius: 99,
                display: "inline-block",
              }}
            />
            Évaluation & suivi des projets
          </h3>
          <div
            style={{
              borderRadius: "1.5rem",
              border: `1px solid ${G.border}`,
              background: G.white,
              padding: "2.5rem",
              boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                gap: "0",
                position: "relative",
              }}
            >
              {EVAL_ETAPES.map((e, i) => (
                <motion.div
                  key={e.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  style={{ padding: "1.5rem", position: "relative" }}
                >
                  {/* connector line */}
                  {i < EVAL_ETAPES.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "2.4rem",
                        right: 0,
                        width: "50%",
                        height: 2,
                        background: `linear-gradient(90deg,${G.greenBorder},transparent)`,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg,${G.green},${G.greenMid})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 900,
                      fontSize: "0.9rem",
                      marginBottom: "0.9rem",
                      boxShadow: "0 4px 12px rgba(22,163,74,0.3)",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      color: G.slate,
                      marginBottom: "0.4rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {e.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: G.slateMid,
                      lineHeight: 1.65,
                    }}
                  >
                    {e.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── QuiSommesNous ──────────────────────────────────────── */
const QSN_TABS = [
  {
    id: "histoire",
    icon: "📖",
    label: "Notre histoire",
    content: {
      title: "Notre histoire",
      body: "Fondée en 2010, notre organisation est née de la volonté de citoyens engagés face aux défis de leur territoire. En plus d'une décennie d'actions concrètes, nous avons construit un réseau solide de partenaires, de bénévoles et de bénéficiaires qui partagent une même vision : un avenir plus juste et solidaire pour tous.",
      highlight: "Plus de 10 ans d'engagement au service des communautés.",
    },
  },
  {
    id: "mission",
    icon: "🎯",
    label: "Mission & valeurs",
    content: {
      title: "Mission & valeurs",
      body: "Notre mission est de promouvoir le développement durable et l'inclusion sociale à travers des programmes innovants et participatifs. Nous nous appuyons sur quatre valeurs fondamentales : l'intégrité, la solidarité, l'innovation et la transparence.",
      values: ["Intégrité", "Solidarité", "Innovation", "Transparence"],
    },
  },
  {
    id: "gouvernance",
    icon: "🏛️",
    label: "Gouvernance",
    content: {
      title: "Gouvernance",
      body: "Notre structure de gouvernance garantit une gestion rigoureuse et démocratique. Le Conseil d'administration, composé de 9 membres élus, supervise la stratégie globale, tandis que l'équipe dirigeante assure la mise en œuvre opérationnelle au quotidien.",
      members: [
        { role: "Présidente", name: "Amina Warsame" },
        { role: "Vice-président", name: "Hassan Farah" },
        { role: "Trésorière", name: "Hodan Elmi" },
        { role: "Secrétaire général", name: "Yusuf Ibrahim" },
      ],
    },
  },
  {
    id: "equipe",
    icon: "👥",
    label: "Équipe opérationnelle",
    content: {
      title: "Équipe opérationnelle",
      body: "Notre équipe pluridisciplinaire de 24 collaborateurs permanents et 150+ bénévoles actifs met son expertise au service de nos programmes. Chaque membre est animé par un engagement profond envers notre mission.",
      stats: [
        { val: "24", label: "Permanents" },
        { val: "150+", label: "Bénévoles" },
        { val: "8", label: "Nationalités" },
        { val: "12", label: "Programmes" },
      ],
    },
  },
  {
    id: "statuts",
    icon: "📋",
    label: "Statuts & utilité publique",
    content: {
      title: "Statuts & reconnaissance d'utilité publique",
      body: "Reconnue d'utilité publique depuis 2015 par décret, notre organisation bénéficie d'un cadre légal robuste qui renforce la confiance de nos partenaires et donateurs. Nos statuts sont disponibles en téléchargement ci-dessous.",
      docs: [
        { name: "Statuts constitutifs (PDF)", href: "#" },
        { name: "Décret de reconnaissance (PDF)", href: "#" },
        { name: "Récépissé de déclaration (PDF)", href: "#" },
      ],
    },
  },
  {
    id: "rapport",
    icon: "📊",
    label: "Rapport annuel",
    content: {
      title: "Rapport annuel",
      body: "Notre rapport annuel détaille l'ensemble de nos activités, nos résultats mesurables et l'utilisation des ressources. Il témoigne de notre engagement envers la redevabilité et la transparence vis-à-vis de nos parties prenantes.",
      docs: [
        { name: "Rapport annuel 2024 (PDF)", href: "#", featured: true },
        { name: "Rapport annuel 2023 (PDF)", href: "#" },
        { name: "Rapport annuel 2022 (PDF)", href: "#" },
      ],
    },
  },
  {
    id: "finances",
    icon: "💰",
    label: "Transparence financière",
    content: {
      title: "Transparence financière",
      body: "Nous publions chaque année nos comptes certifiés par un commissaire aux comptes indépendant. La répartition de nos ressources reflète notre engagement à maximiser l'impact direct sur nos bénéficiaires.",
      budget: [
        { label: "Actions terrain", pct: 72, color: "#16a34a" },
        { label: "Fonctionnement", pct: 18, color: "#22c55e" },
        { label: "Communication", pct: 6, color: "#86efac" },
        { label: "Levée de fonds", pct: 4, color: "#bbf7d0" },
      ],
    },
  },
];

function QuiSommesNous({ G }) {
  const [active, setActive] = useState("histoire");
  const tab = QSN_TABS.find((t) => t.id === active);

  return (
    <section
      id="qui-sommes-nous"
      style={{ background: G.white, padding: "6rem 1.5rem" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "3.5rem" }}
        >
          <SectionLabel>Qui sommes-nous</SectionLabel>
          <h2
            style={{
              fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: G.slate,
              margin: "0.75rem 0 0.75rem",
              lineHeight: 1.1,
            }}
          >
            À propos de{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${G.green}, #15803d)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              notre organisation
            </span>
          </h2>
          <p
            style={{
              color: G.slateMid,
              maxWidth: 520,
              margin: "0 auto",
              fontSize: "0.97rem",
              lineHeight: 1.75,
            }}
          >
            Découvrez qui nous sommes, ce qui nous anime et comment nous
            agissons pour un impact durable.
          </p>
        </motion.div>

        {/* Layout: sidebar tabs + content */}
        <div
          className="qsn-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* Sidebar */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
              position: "sticky",
              top: "88px",
            }}
          >
            {QSN_TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.8rem 1.1rem",
                    borderRadius: "0.875rem",
                    border: isActive
                      ? `1px solid ${G.greenBorder}`
                      : "1px solid transparent",
                    background: isActive ? G.greenLight : "transparent",
                    color: isActive ? G.green : G.slateMid,
                    fontWeight: isActive ? 800 : 600,
                    fontSize: "0.85rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = G.offWhite;
                      e.currentTarget.style.color = G.slate;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = G.slateMid;
                    }
                  }}
                >
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>
                    {tab.icon}
                  </span>
                  <span style={{ lineHeight: 1.3 }}>{tab.label}</span>
                  {isActive && (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: G.green,
                        fontSize: "0.8rem",
                      }}
                    >
                      ›
                    </span>
                  )}
                </button>
              );
            })}
          </motion.nav>

          {/* Content panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{
                borderRadius: "1.5rem",
                border: `1px solid ${G.border}`,
                background: G.white,
                boxShadow: "0 8px 32px -8px rgba(0,0,0,0.08)",
                padding: "2.5rem",
                minHeight: 320,
              }}
            >
              {/* Decoration strip */}
              <div
                style={{
                  height: 4,
                  borderRadius: "99px",
                  background: `linear-gradient(90deg, ${G.green}, ${G.greenMid})`,
                  marginBottom: "1.75rem",
                  width: 56,
                }}
              />

              <h3
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 900,
                  color: G.slate,
                  margin: "0 0 1rem",
                  letterSpacing: "-0.02em",
                }}
              >
                {tab.icon} {tab.content.title}
              </h3>

              <p
                style={{
                  fontSize: "0.97rem",
                  color: G.slateMid,
                  lineHeight: 1.8,
                  margin: "0 0 1.5rem",
                  maxWidth: 620,
                }}
              >
                {tab.content.body}
              </p>

              {/* highlight */}
              {tab.content.highlight && (
                <div
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "0.875rem",
                    background: G.greenLight,
                    border: `1px solid ${G.greenBorder}`,
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: G.green,
                    marginTop: "0.5rem",
                  }}
                >
                  ✦ {tab.content.highlight}
                </div>
              )}

              {/* values pills */}
              {tab.content.values && (
                <div
                  style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}
                >
                  {tab.content.values.map((v) => (
                    <span
                      key={v}
                      style={{
                        padding: "0.45rem 1.1rem",
                        borderRadius: "99px",
                        background: G.greenLight,
                        border: `1px solid ${G.greenBorder}`,
                        color: G.green,
                        fontWeight: 800,
                        fontSize: "0.8rem",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}

              {/* governance members */}
              {tab.content.members && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {tab.content.members.map((m) => (
                    <div
                      key={m.name}
                      style={{
                        padding: "1rem 1.1rem",
                        borderRadius: "0.875rem",
                        border: `1px solid ${G.border}`,
                        background: G.offWhite,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: G.green,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {m.role}
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 700,
                          color: G.slate,
                        }}
                      >
                        {m.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* team stats */}
              {tab.content.stats && (
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                    marginTop: "0.5rem",
                  }}
                >
                  {tab.content.stats.map((s) => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 900,
                          color: G.green,
                          lineHeight: 1,
                          letterSpacing: "-0.04em",
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: G.slateMid,
                          marginTop: "0.2rem",
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* document links */}
              {tab.content.docs && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {tab.content.docs.map((d) => (
                    <a
                      key={d.name}
                      href={d.href}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.75rem 1.1rem",
                        borderRadius: "0.75rem",
                        border: `1px solid ${d.featured ? G.greenBorder : G.border}`,
                        background: d.featured ? G.greenLight : G.offWhite,
                        color: d.featured ? G.green : G.slate,
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        width: "fit-content",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      📄 {d.name}
                      <span style={{ marginLeft: "auto", opacity: 0.5 }}>
                        ↓
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {/* budget bars */}
              {tab.content.budget && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {tab.content.budget.map((b) => (
                    <div key={b.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.3rem",
                          fontSize: "0.83rem",
                          fontWeight: 700,
                          color: G.slate,
                        }}
                      >
                        <span>{b.label}</span>
                        <span style={{ color: G.green }}>{b.pct}%</span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: "99px",
                          background: G.offWhite,
                          overflow: "hidden",
                          border: `1px solid ${G.border}`,
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${b.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            borderRadius: "99px",
                            background: b.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .qsn-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
function Actualites({ G }) {
  const [activeTab, setActiveTab] = useState("blog");
  const [email, setEmail] = useState("");
  const [newsletterName, setNewsletterName] = useState("");

  const TABS = [
    { id: "blog", label: "📝 Blog / Articles" },
    { id: "presse", label: "📣 Communiqués" },
    { id: "events", label: "📅 Événements" },
    { id: "newsletter", label: "📧 Newsletter" },
    { id: "kit", label: "🗂 Espace presse" },
  ];

  return (
    <section id="actualites" style={{ background: G.offWhite, padding: "6rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <SectionLabel>Actualités</SectionLabel>
          <h2 style={{ fontSize: "clamp(1.9rem,3.5vw,2.8rem)", fontWeight: 900, letterSpacing: "-0.03em", color: G.slate, margin: "0.75rem 0 0.75rem", lineHeight: 1.1 }}>
            Restez{" "}
            <span style={{ background: `linear-gradient(135deg,${G.green},#15803d)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>informés</span>
          </h2>
          <p style={{ color: G.slateMid, maxWidth: 520, margin: "0 auto", fontSize: "0.97rem", lineHeight: 1.75 }}>
            Suivez nos actualités, événements et accédez aux ressources presse de notre organisation.
          </p>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: "0.55rem 1.1rem", borderRadius: "99px", border: `1px solid ${activeTab === tab.id ? G.greenBorder : G.border}`, background: activeTab === tab.id ? G.greenLight : G.offWhite, color: activeTab === tab.id ? G.green : G.slateMid, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s" }}>
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

            {/* Blog */}
            {activeTab === "blog" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.1rem" }}>
                  {ARTICLES.map((a) => (
                    <div key={a.title} style={{ borderRadius: "1.25rem", border: `1px solid ${G.border}`, background: G.white, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                      <div style={{ height: 140, background: `linear-gradient(135deg,${a.catBg},${G.offWhite})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>{a.emoji}</div>
                      <div style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.2rem 0.65rem", borderRadius: "99px", background: a.catBg, color: a.catColor, border: `1px solid ${a.catBorder}` }}>{a.categorie}</span>
                          <span style={{ fontSize: "0.68rem", color: G.slateLight }}>{a.date}</span>
                        </div>
                        <h4 style={{ fontSize: "0.97rem", fontWeight: 800, color: G.slate, marginBottom: "0.4rem", lineHeight: 1.35 }}>{a.title}</h4>
                        <p style={{ fontSize: "0.82rem", color: G.slateMid, lineHeight: 1.65, marginBottom: "0.9rem" }}>{a.desc}</p>
                        <button style={{ padding: "0.6rem 1.2rem", borderRadius: "0.75rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>Lire l'article →</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: "center", marginTop: "1.75rem" }}>
                  <button style={{ padding: "0.65rem 1.5rem", borderRadius: "0.75rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Voir tous les articles →</button>
                </div>
              </div>
            )}

            {/* Communiqués */}
            {activeTab === "presse" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {COMMUNIQUES.map((c) => (
                  <div key={c.title} style={{ borderRadius: "1.25rem", border: `1px solid ${G.border}`, background: G.white, padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ fontSize: "1.5rem" }}>📄</div>
                      <div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.2rem 0.65rem", borderRadius: "99px", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}` }}>{c.tag}</span>
                          <span style={{ fontSize: "0.68rem", color: G.slateLight }}>{c.date}</span>
                        </div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: G.slate }}>{c.title}</div>
                      </div>
                    </div>
                    <button style={{ padding: "0.55rem 1.1rem", borderRadius: "0.75rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>Télécharger PDF</button>
                  </div>
                ))}
              </div>
            )}

            {/* Événements */}
            {activeTab === "events" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1.1rem" }}>
                {EVENEMENTS.map((ev) => (
                  <div key={ev.title} style={{ borderRadius: "1.25rem", border: `1px solid ${G.border}`, background: G.white, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{ev.emoji}</div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.6rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.2rem 0.65rem", borderRadius: "99px", background: ev.avenir ? G.greenLight : "#fefce8", color: ev.avenir ? G.green : G.gold, border: `1px solid ${ev.avenir ? G.greenBorder : "rgba(184,134,11,0.2)"}` }}>{ev.avenir ? "À venir" : "Passé"}</span>
                      <span style={{ fontSize: "0.68rem", color: G.slateLight }}>{ev.date}</span>
                    </div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: G.slate, marginBottom: "0.3rem", lineHeight: 1.35 }}>{ev.title}</h4>
                    <div style={{ fontSize: "0.75rem", color: G.green, fontWeight: 700, marginBottom: "0.5rem" }}>📍 {ev.lieu}</div>
                    <p style={{ fontSize: "0.82rem", color: G.slateMid, lineHeight: 1.6, marginBottom: "0.9rem" }}>{ev.desc}</p>
                    <button style={{ padding: "0.55rem 1.1rem", borderRadius: "0.75rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                      {ev.avenir ? "S'inscrire →" : "Voir le compte-rendu →"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Newsletter */}
            {activeTab === "newsletter" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: 4, height: 18, background: G.green, borderRadius: 99, display: "inline-block" }} />Archives Newsletter
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {NEWSLETTER_ARCHIVES.map((n, i) => (
                      <div key={n} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: "0.875rem", border: `1px solid ${i === 0 ? G.greenBorder : G.border}`, background: i === 0 ? G.greenLight : G.white }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: i === 0 ? 800 : 600, color: i === 0 ? G.green : G.slate }}>{n}</span>
                        <button style={{ fontSize: "0.72rem", fontWeight: 700, color: G.green, background: "none", border: "none", cursor: "pointer" }}>📄 Voir</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderRadius: "1.25rem", border: `1px solid ${G.greenBorder}`, background: G.greenLight, padding: "1.75rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📬</div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 900, color: G.slate, marginBottom: "0.4rem" }}>S'abonner à la newsletter</h4>
                  <p style={{ fontSize: "0.82rem", color: G.slateMid, lineHeight: 1.65, marginBottom: "1.1rem" }}>Actualités, rapports et événements livrés dans votre boîte mail. Désabonnement en un clic.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Prénom et nom</label>
                      <input value={newsletterName} onChange={e => setNewsletterName(e.target.value)} placeholder="Votre nom" style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.white, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Adresse email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.white, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <button style={{ padding: "0.8rem", borderRadius: "0.875rem", background: `linear-gradient(135deg,${G.greenMid},${G.green})`, color: "white", fontWeight: 800, fontSize: "0.85rem", border: "none", cursor: "pointer" }}>S'abonner gratuitement →</button>
                  </div>
                  <p style={{ fontSize: "0.68rem", color: G.slateLight, marginTop: "0.75rem" }}>🔒 Données confidentielles. Désabonnement à tout moment.</p>
                </div>
              </div>
            )}

            {/* Kit presse */}
            {activeTab === "kit" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: 4, height: 18, background: G.green, borderRadius: 99, display: "inline-block" }} />Ressources téléchargeables
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {[
                      { icon: "📦", name: "Kit presse complet (ZIP)", size: "8.4 Mo" },
                      { icon: "🖼", name: "Logos HD (PNG / SVG / EPS)", size: "2.1 Mo" },
                      { icon: "📷", name: "Photothèque terrain (40 photos)", size: "120 Mo" },
                      { icon: "📄", name: "Dossier de presse 2024 (PDF)", size: "1.8 Mo" },
                      { icon: "📊", name: "Infographies résultats 2024", size: "3.2 Mo" },
                    ].map((d) => (
                      <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderRadius: "0.875rem", border: `1px solid ${G.border}`, background: G.white, gap: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "1.3rem" }}>{d.icon}</span>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: G.slate }}>{d.name}</div>
                            <div style={{ fontSize: "0.68rem", color: G.slateLight }}>{d.size}</div>
                          </div>
                        </div>
                        <button style={{ padding: "0.4rem 0.9rem", borderRadius: "0.625rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>↓ DL</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: 4, height: 18, background: G.green, borderRadius: 99, display: "inline-block" }} />Contact presse
                  </h3>
                  <div style={{ borderRadius: "1.25rem", border: `1px solid ${G.border}`, background: G.white, padding: "1.5rem", marginBottom: "1rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>👤</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: G.slate, marginBottom: "0.2rem" }}>Responsable Communication</div>
                    <div style={{ fontSize: "0.82rem", color: G.slateMid, marginBottom: "0.75rem" }}>Service Relations Presse</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.82rem" }}>
                      <div style={{ color: G.green, fontWeight: 700 }}>✉ presse@organisation.org</div>
                      <div style={{ color: G.slateMid }}>📞 +253 XX XX XX XX</div>
                      <div style={{ color: G.slateLight }}>🕐 Disponible lun–ven, 8h–17h</div>
                    </div>
                  </div>
                  <div style={{ padding: "1rem", borderRadius: "1rem", background: G.greenLight, border: `1px solid ${G.greenBorder}`, fontSize: "0.82rem", color: G.slateMid, lineHeight: 1.7 }}>
                    <strong style={{ color: G.green }}>Accréditation :</strong> Pour toute demande d'entretien ou reportage terrain, merci de nous contacter 5 jours ouvrables à l'avance.
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
      <style>{`@media(max-width:768px){.actu-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
function Soutenir({ G }) {
  const [donType, setDonType] = useState("ponctuel");
  const [selectedAmount, setSelectedAmount] = useState("50€");
  const [donSubmitted, setDonSubmitted] = useState(false);
  const [benevoleForm, setBenevoleForm] = useState({ nom: "", email: "", competence: "", dispo: "" });
  const [benevoleSubmitted, setBenevoleSubmitted] = useState(false);

  const DON_TABS = [
    { id: "ponctuel", label: "Don ponctuel" },
    { id: "regulier", label: "Don régulier" },
    { id: "nature", label: "Dons en nature / Legs" },
  ];

  const AMOUNTS_PONCTUEL = ["10€", "25€", "50€", "100€", "250€"];
  const AMOUNTS_REGULIER = ["5€/mois", "10€/mois", "20€/mois", "50€/mois"];

  return (
    <section id="soutenir" style={{ background: G.white, padding: "6rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <SectionLabel color={G.gold}>Soutenir</SectionLabel>
          <h2 style={{ fontSize: "clamp(1.9rem,3.5vw,2.8rem)", fontWeight: 900, letterSpacing: "-0.03em", color: G.slate, margin: "0.75rem 0 0.75rem", lineHeight: 1.1 }}>
            Agissez à nos{" "}
            <span style={{ background: `linear-gradient(135deg,${G.gold},#a16207)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>côtés</span>
          </h2>
          <p style={{ color: G.slateMid, maxWidth: 520, margin: "0 auto", fontSize: "0.97rem", lineHeight: 1.75 }}>
            Votre soutien — financier ou en temps — transforme des vies. Chaque geste compte, quelle que soit sa forme.
          </p>
        </motion.div>

        {/* Pourquoi donner */}
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 4, height: 18, background: G.gold, borderRadius: 99, display: "inline-block" }} />Pourquoi donner ?
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem", marginBottom: "3.5rem" }}>
          {WHY_GIVE.map((w) => (
            <motion.div key={w.title} whileHover={{ y: -2 }} style={{ padding: "1.25rem", borderRadius: "1rem", border: `1px solid ${G.border}`, background: G.offWhite, display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: G.greenLight, border: `1px solid ${G.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{w.emoji}</div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, color: G.slate, marginBottom: "0.2rem" }}>{w.title}</div>
                <div style={{ fontSize: "0.78rem", color: G.slateMid, lineHeight: 1.6 }}>{w.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Formulaire de don */}
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 4, height: 18, background: G.gold, borderRadius: 99, display: "inline-block" }} />Faire un don
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem", marginBottom: "3.5rem", alignItems: "start" }}>
          <div style={{ borderRadius: "1.5rem", border: `1px solid rgba(184,134,11,0.25)`, background: G.white, padding: "2rem", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
            {donSubmitted ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: "center", padding: "2rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💚</div>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 900, color: G.slate, marginBottom: "0.5rem" }}>Merci pour votre don !</h4>
                <p style={{ color: G.slateMid, fontSize: "0.9rem", marginBottom: "1rem" }}>Un reçu fiscal vous sera envoyé par email sous 24h.</p>
                <button onClick={() => setDonSubmitted(false)} style={{ padding: "0.6rem 1.5rem", borderRadius: "0.75rem", background: G.greenLight, border: `1px solid ${G.greenBorder}`, color: G.green, fontWeight: 800, cursor: "pointer", fontSize: "0.85rem" }}>Faire un autre don</button>
              </motion.div>
            ) : (
              <>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                  {DON_TABS.map((tab) => (
                    <button key={tab.id} onClick={() => { setDonType(tab.id); setSelectedAmount(""); }}
                      style={{ padding: "0.55rem 1.1rem", borderRadius: "99px", border: `1px solid ${donType === tab.id ? G.greenBorder : G.border}`, background: donType === tab.id ? G.greenLight : G.offWhite, color: donType === tab.id ? G.green : G.slateMid, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s" }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {donType !== "nature" && (
                  <>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.75rem" }}>Choisissez un montant</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                      {(donType === "ponctuel" ? AMOUNTS_PONCTUEL : AMOUNTS_REGULIER).map((a) => (
                        <button key={a} onClick={() => setSelectedAmount(a)}
                          style={{ padding: "0.6rem 1rem", borderRadius: "0.75rem", border: `1px solid ${selectedAmount === a ? G.greenBorder : G.border}`, background: selectedAmount === a ? G.greenLight : G.offWhite, color: selectedAmount === a ? G.green : G.slate, fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.2s" }}>
                          {a}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Autre montant (€)</label>
                      <input type="number" placeholder="Saisir un montant libre..." min="1" style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Affecter à un programme (optionnel)</label>
                      <select style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none" }}>
                        <option>Au programme le plus urgent</option>
                        <option>Accès à l'eau potable</option>
                        <option>Éducation numérique</option>
                        <option>Microcrédits femmes</option>
                        <option>Nutrition infantile</option>
                      </select>
                    </div>
                    <div style={{ padding: "0.85rem", borderRadius: "0.875rem", background: G.goldLight, border: `1px solid rgba(184,134,11,0.2)`, fontSize: "0.8rem", color: G.slateMid, marginBottom: "1.2rem", lineHeight: 1.65 }}>
                      💡 <strong style={{ color: G.gold }}>10€ =</strong> un complément nutritionnel pour un enfant pendant 1 mois.<br />
                      💡 <strong style={{ color: G.gold }}>50€ =</strong> matériel scolaire pour 2 élèves sur toute l'année.
                    </div>
                    <button onClick={() => setDonSubmitted(true)} style={{ width: "100%", padding: "0.9rem", borderRadius: "0.875rem", background: `linear-gradient(135deg,#d97706,${G.gold})`, color: "white", fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer", boxShadow: "0 8px 24px -8px rgba(184,134,11,0.4)" }}>
                      🔒 Faire un don sécurisé →
                    </button>
                    <p style={{ fontSize: "0.68rem", color: G.slateLight, textAlign: "center", marginTop: "0.6rem" }}>Paiement sécurisé · Reçu fiscal automatique · HTTPS</p>
                  </>
                )}

                {donType === "nature" && (
                  <>
                    <p style={{ fontSize: "0.88rem", color: G.slateMid, lineHeight: 1.75, marginBottom: "1rem" }}>
                      Vous souhaitez faire un don en nature ou inclure notre organisation dans vos dispositions testamentaires ? Contactez-nous pour en discuter en toute confidentialité.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.2rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Votre nom</label>
                        <input placeholder="Prénom et nom" style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Email</label>
                        <input type="email" placeholder="vous@exemple.com" style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Nature du don envisagé</label>
                        <select style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none" }}>
                          <option>Don en nature (matériel)</option>
                          <option>Don en nature (denrées alimentaires)</option>
                          <option>Legs testamentaire</option>
                          <option>Assurance-vie</option>
                          <option>Autre</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Votre message</label>
                        <textarea rows={3} placeholder="Décrivez votre projet de don..." style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.offWhite, outline: "none", resize: "vertical", lineHeight: 1.65, boxSizing: "border-box", fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <button style={{ width: "100%", padding: "0.9rem", borderRadius: "0.875rem", background: `linear-gradient(135deg,#d97706,${G.gold})`, color: "white", fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer" }}>Envoyer ma demande →</button>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { emoji: "🤝", title: "Mécénat d'entreprise", desc: "Associez votre marque à des projets à fort impact. Déduction fiscale de 60% du don dans la limite de 0,5% du CA.", cta: "Télécharger notre offre mécénat →" },
              { emoji: "💛", title: "Parrainage", desc: "Parrainez un enfant, une famille ou un projet entier. Recevez des nouvelles régulières de votre filleul·e.", cta: "Choisir un parrainage →", badges: ["Enfant dès 15€/mois", "Projet dès 50€/mois"] },
              { emoji: "🌐", title: "Collecte en ligne", desc: "Créez votre propre collecte pour un anniversaire, un défi sportif ou un événement. Outils clés en main fournis.", cta: "Lancer ma collecte →" },
            ].map((c) => (
              <motion.div key={c.title} whileHover={{ y: -2 }} style={{ borderRadius: "1.25rem", border: `1px solid ${G.border}`, background: G.white, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>{c.emoji}</div>
                <h4 style={{ fontSize: "0.97rem", fontWeight: 800, color: G.slate, marginBottom: "0.35rem" }}>{c.title}</h4>
                <p style={{ fontSize: "0.82rem", color: G.slateMid, lineHeight: 1.65, marginBottom: c.badges ? "0.75rem" : "0.9rem" }}>{c.desc}</p>
                {c.badges && (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
                    {c.badges.map((b, i) => (
                      <span key={b} style={{ fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.65rem", borderRadius: "99px", background: i === 0 ? G.greenLight : "#eff6ff", color: i === 0 ? G.green : "#3b82f6", border: `1px solid ${i === 0 ? G.greenBorder : "rgba(59,130,246,0.2)"}` }}>{b}</span>
                    ))}
                  </div>
                )}
                <button style={{ padding: "0.55rem 1.1rem", borderRadius: "0.75rem", background: G.greenLight, color: G.green, border: `1px solid ${G.greenBorder}`, fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>{c.cta}</button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bénévolat */}
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: G.slate, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: 4, height: 18, background: G.gold, borderRadius: 99, display: "inline-block" }} />Bénévolat & s'impliquer
        </h3>
        <div style={{ borderRadius: "1.5rem", border: `1px solid ${G.border}`, background: G.offWhite, padding: "2.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          <div>
            <p style={{ fontSize: "0.88rem", color: G.slateMid, lineHeight: 1.75, marginBottom: "1.25rem" }}>
              Rejoignez nos 150+ bénévoles actifs. Que vous soyez disponible ponctuellement ou sur le long terme, il y a une place pour vous.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {BENEVOLE_ROLES.map((b) => (
                <div key={b.role} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.9rem", borderRadius: "0.75rem", border: `1px solid ${G.border}`, background: G.white }}>
                  <span style={{ fontSize: "1.1rem" }}>{b.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: G.slate }}>{b.role}</div>
                    <div style={{ fontSize: "0.72rem", color: G.slateLight }}>{b.dispo}</div>
                  </div>
                  <button style={{ fontSize: "0.72rem", fontWeight: 700, color: G.green, background: "none", border: "none", cursor: "pointer" }}>Candidater →</button>
                </div>
              ))}
            </div>
          </div>

          {benevoleSubmitted ? (
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: "center", padding: "2rem", borderRadius: "1.25rem", border: `1px solid ${G.greenBorder}`, background: G.greenLight }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🙌</div>
              <h4 style={{ fontSize: "1rem", fontWeight: 900, color: G.slate, marginBottom: "0.5rem" }}>Candidature envoyée !</h4>
              <p style={{ color: G.slateMid, fontSize: "0.85rem" }}>Notre équipe vous recontactera sous 7 jours ouvrables.</p>
              <button onClick={() => { setBenevoleSubmitted(false); setBenevoleForm({ nom: "", email: "", competence: "", dispo: "" }); }} style={{ marginTop: "1rem", padding: "0.55rem 1.2rem", borderRadius: "0.75rem", background: G.white, border: `1px solid ${G.greenBorder}`, color: G.green, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Fermer</button>
            </motion.div>
          ) : (
            <div style={{ borderRadius: "1.25rem", border: `1px solid ${G.greenBorder}`, background: G.greenLight, padding: "1.75rem" }}>
              <h4 style={{ fontSize: "0.97rem", fontWeight: 900, color: G.slate, marginBottom: "1rem" }}>Je veux m'impliquer</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { key: "nom", label: "Nom complet", type: "text", placeholder: "Votre nom" },
                  { key: "email", label: "Email", type: "email", placeholder: "vous@exemple.com" },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>{label}</label>
                    <input type={type} placeholder={placeholder} value={benevoleForm[key]} onChange={e => setBenevoleForm({ ...benevoleForm, [key]: e.target.value })} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.white, outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Compétences ou domaine d'intérêt</label>
                  <select value={benevoleForm.competence} onChange={e => setBenevoleForm({ ...benevoleForm, competence: e.target.value })} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.white, outline: "none" }}>
                    <option value="">Sélectionner...</option>
                    <option>Santé / Médical</option>
                    <option>Éducation</option>
                    <option>Informatique / Numérique</option>
                    <option>Communication / Réseaux sociaux</option>
                    <option>Logistique / Terrain</option>
                    <option>Juridique / Finances</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: G.slate, marginBottom: "0.3rem" }}>Disponibilité</label>
                  <select value={benevoleForm.dispo} onChange={e => setBenevoleForm({ ...benevoleForm, dispo: e.target.value })} style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "0.625rem", border: `1px solid ${G.border}`, fontSize: "0.85rem", background: G.white, outline: "none" }}>
                    <option value="">Sélectionner...</option>
                    <option>Ponctuelle (quelques jours)</option>
                    <option>Régulière (quelques heures/semaine)</option>
                    <option>Mission longue (1 mois+)</option>
                  </select>
                </div>
                <button onClick={() => { if (benevoleForm.nom && benevoleForm.email) setBenevoleSubmitted(true); }} style={{ padding: "0.85rem", borderRadius: "0.875rem", background: `linear-gradient(135deg,${G.greenMid},${G.green})`, color: "white", fontWeight: 800, fontSize: "0.9rem", border: "none", cursor: "pointer" }}>
                  Envoyer ma candidature →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      <style>{`
        @media(max-width:768px){
          .soutenir-grid{grid-template-columns:1fr!important}
          .benevole-grid{grid-template-columns:1fr!important}
        }
      `}</style>
    </section>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();

  // Nouveau menu principal à 7 entrées
  const NAV_LINKS = useMemo(
    () => [
      { id: "accueil", label: "Accueil" },
      { id: "qui-sommes-nous", label: "Qui sommes-nous" },
      { id: "nos-actions", label: "Nos actions" },
      { id: "notre-impact", label: "Notre impact" },
      { id: "actualites", label: "Actualités" },
      { id: "soutenir", label: "Soutenir" },
      { id: "contact", label: "Contact" },
    ],
    [],
  );

  const ABOUT_CARDS = useMemo(
    () => [
      { num: "01", text: t("about_card_01") },
      { num: "02", text: t("about_card_02") },
      { num: "03", text: t("about_card_03") },
      { num: "04", text: t("about_card_04") },
    ],
    [t],
  );

  const FEATURES = useMemo(
    () => [
      { icon: "⚡", title: t("feature_1_title"), desc: t("feature_1_desc") },
      { icon: "🛡️", title: t("feature_2_title"), desc: t("feature_2_desc") },
      { icon: "🌍", title: t("feature_3_title"), desc: t("feature_3_desc") },
      { icon: "📊", title: t("feature_4_title"), desc: t("feature_4_desc") },
    ],
    [t],
  );

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        background: G.white,
        color: G.slate,
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      {/* ══ NAVBAR ══ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.93)",
          backdropFilter: "blur(18px)",
          borderBottom: `1px solid ${G.border}`,
          boxShadow: "0 1px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 68,
              gap: "1rem",
            }}
          >
            <Brand />

            {/* Desktop nav — 7 liens, taille réduite pour tenir */}
            <nav
              className="desktop-nav"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                flex: 1,
                justifyContent: "center",
                flexWrap: "nowrap",
              }}
            >
              {NAV_LINKS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: G.slateMid,
                    textDecoration: "none",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "0.5rem",
                    whiteSpace: "nowrap",
                    transition: "color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = G.green;
                    e.currentTarget.style.background = G.greenLight;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = G.slateMid;
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexShrink: 0,
              }}
            >
              <LanguageSwitcher />

              {!user ? (
                <Link
                  to="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.6rem 1rem",
                    borderRadius: "0.75rem",
                    border: `1px solid ${G.greenBorder}`,
                    background: G.greenLight,
                    color: G.green,
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("login")}
                </Link>
              ) : null}

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="mobile-burger"
                style={{
                  display: "none",
                  background: "none",
                  border: "none",
                  color: G.slate,
                  cursor: "pointer",
                  fontSize: "1.4rem",
                  lineHeight: 1,
                }}
                aria-label="Menu"
              >
                {menuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div
              style={{
                borderTop: `1px solid ${G.border}`,
                paddingBottom: "1rem",
              }}
            >
              {NAV_LINKS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.65rem 0",
                    color: G.slateMid,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    borderBottom: `1px solid ${G.border}`,
                  }}
                >
                  {label}
                </a>
              ))}
              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.65rem 0",
                    color: G.green,
                    textDecoration: "none",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    borderBottom: `1px solid ${G.border}`,
                  }}
                >
                  {t("login")}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </header>

      {/* ══ HERO ══ */}
      <section
        style={{
          position: "relative",
          background: `linear-gradient(180deg, ${G.greenLight} 0%, ${G.white} 100%)`,
          padding: "6rem 1.5rem 5rem",
          overflow: "hidden",
        }}
      >
        {/* decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-6rem",
            right: "-8rem",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(22,163,74,0.08) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-4rem",
            left: "-6rem",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(184,134,11,0.06) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div
          className="hero-grid"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "center",
            gap: "4rem",
          }}
        >
          {/* Left text */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            style={{ display: "flex", flexDirection: "column", gap: "1.6rem" }}
          >
            <motion.span
              variants={fadeUp}
              custom={0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.9rem",
                borderRadius: "99px",
                background: G.white,
                border: `1px solid ${G.greenBorder}`,
                fontSize: "0.72rem",
                fontWeight: 800,
                color: G.green,
                letterSpacing: "0.08em",
                width: "fit-content",
                boxShadow: "0 2px 8px rgba(22,163,74,0.1)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: G.greenMid,
                  display: "inline-block",
                  animation: "blink 2s infinite",
                }}
              />
              {t("app_name")}
            </motion.span>

            <motion.h1
              variants={fadeUp}
              custom={1}
              style={{
                fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)",
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: G.slate,
                margin: 0,
              }}
            >
              {t("home_title")}
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg, ${G.green} 0%, #15803d 55%, ${G.gold} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t("slog")}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              style={{
                fontSize: "1rem",
                lineHeight: 1.8,
                color: G.slateMid,
                maxWidth: 460,
                margin: 0,
              }}
            >
              {t("home_desc")}
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
            >
              <Link
                to="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.85rem 2rem",
                  borderRadius: "0.875rem",
                  background: `linear-gradient(135deg, ${G.greenMid}, ${G.green})`,
                  color: G.white,
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  boxShadow: "0 12px 32px -10px rgba(22,163,74,0.5)",
                }}
              >
                {t("create_account")} →
              </Link>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0.85rem 1.8rem",
                  borderRadius: "0.875rem",
                  border: `1px solid ${G.border}`,
                  background: G.white,
                  color: G.slateMid,
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {t("login")}
              </Link>
            </motion.div>
          </motion.div>

          {/* Right — floating card */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
            style={{ display: "flex", justifyContent: "flex-end" }}
          >
            <motion.div
              variants={floaty}
              animate="animate"
              style={{ width: "100%", maxWidth: 420, position: "relative" }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "-1.5rem",
                  borderRadius: "2.5rem",
                  background: `radial-gradient(ellipse, rgba(22,163,74,0.12) 0%, transparent 70%)`,
                  filter: "blur(24px)",
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  borderRadius: "1.75rem",
                  border: `1px solid ${G.border}`,
                  background: G.white,
                  boxShadow:
                    "0 32px 72px -16px rgba(0,0,0,0.12), 0 0 0 1px rgba(22,163,74,0.06)",
                  padding: "0.875rem",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/images/xeer_ciise.jpg"
                  alt={t("app_name")}
                  style={{
                    width: "100%",
                    height: 260,
                    objectFit: "cover",
                    borderRadius: "1.35rem",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    borderRadius: "1rem",
                    background: G.greenLight,
                    border: `1px solid ${G.greenBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      color: G.slate,
                    }}
                  >
                    {t("slog")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      background: G.green,
                      color: G.white,
                      padding: "0.2rem 0.7rem",
                      borderRadius: "99px",
                    }}
                  >
                    {t("demo")}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══ QUI SOMMES-NOUS ══ */}
      <QuiSommesNous G={G} />

      {/* ══ NOS ACTIONS ══ */}
      <NosActions G={G} t={t} />

      {/* ══ NOTRE IMPACT ══ */}
     
      <NotreImpact G={G} />
       {/* ══ ACTUALITÉS ══ */}
        <Actualites G={G} />
        {/* ══ SOUTENIR ══ */}
        <Soutenir G={G} />

      {/* ══ CONTACT ══ */}
      <section
        id="contact"
        style={{ background: G.greenLight, padding: "6rem 1.5rem" }}
      >
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              textAlign: "center",
              padding: "3.5rem 2.5rem",
              borderRadius: "1.75rem",
              background: G.white,
              border: `1px solid ${G.border}`,
              boxShadow: "0 24px 56px -16px rgba(22,163,74,0.1)",
            }}
          >
            <SectionLabel>{t("contact")}</SectionLabel>
            <h2
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 900,
                color: G.slate,
                margin: "0.75rem 0 1rem",
              }}
            >
              {t("contact_title")}
            </h2>
            <p
              style={{
                color: G.slateMid,
                lineHeight: 1.75,
                maxWidth: 400,
                margin: "0 auto 2rem",
                fontSize: "0.95rem",
              }}
            >
              {t("contact_desc")}
            </p>
            <a
              href="mailto:contact@example.com"
              style={{
                display: "inline-block",
                padding: "0.9rem 2.5rem",
                borderRadius: "0.9rem",
                background: `linear-gradient(135deg, ${G.greenMid}, ${G.green})`,
                color: G.white,
                fontWeight: 800,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 12px 32px -10px rgba(22,163,74,0.45)",
              }}
            >
              ✉ {t("contact_cta")}
            </a>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer
        style={{
          background: G.slate,
          color: "rgba(255,255,255,0.5)",
          padding: "2.5rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem", fontWeight: 900, color: G.white }}>
              {t("app_name")}
            </span>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                background: G.green,
                color: G.white,
                padding: "0.1rem 0.5rem",
                borderRadius: "99px",
              }}
            >
              LIVE
            </span>
          </div>
          <nav style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.45)",
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = G.white)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
                }
              >
                {label}
              </a>
            ))}
          </nav>
          <p style={{ fontSize: "0.75rem", margin: 0 }}>
            © 2025 {t("app_name")} · {t("footer_rights")}
          </p>
        </div>
      </footer>

      {/* ══ Global CSS ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;0,9..40,900&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; }
        @media (max-width: 960px) {
          .hero-grid    { grid-template-columns: 1fr !important; }
          .section-grid { grid-template-columns: 1fr !important; }
          .desktop-nav  { display: none !important; }
          .mobile-burger { display: block !important; }
        }
      `}</style>
    </div>
  );
}
