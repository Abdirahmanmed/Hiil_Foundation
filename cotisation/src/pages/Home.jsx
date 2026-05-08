import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";

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

/* ─── Main ───────────────────────────────────────────────── */
export default function Home() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language?.startsWith("ar");
  const [menuOpen, setMenuOpen] = useState(false);

  // i18n-driven content (memo for perf + to avoid rerenders)
  const NAV_LINKS = useMemo(
    () => [
      { id: "about", label: t("about") },
      { id: "features", label: t("features") },
      { id: "contact", label: t("contact") },
    ],
    [t],
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
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 68,
            }}
          >
            <Brand />

            {/* Desktop nav */}
            <nav
              style={{ display: "flex", gap: "2.25rem" }}
              className="desktop-nav"
            >
              {NAV_LINKS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: G.slateMid,
                    textDecoration: "none",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = G.green)}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = G.slateMid)
                  }
                >
                  {label}
                </a>
              ))}
            </nav>

            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <LanguageSwitcher />

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

      {/* ══ ABOUT ══ */}
      <section
        id="about"
        style={{ background: G.white, padding: "6rem 1.5rem" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            className="section-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "5rem",
              alignItems: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <SectionLabel>{t("about")}</SectionLabel>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                  fontWeight: 900,
                  lineHeight: 1.15,
                  letterSpacing: "-0.025em",
                  color: G.slate,
                  margin: "0.75rem 0 1.25rem",
                }}
              >
                {t("about_title")}
              </h2>
              <p
                style={{
                  fontSize: "0.97rem",
                  color: G.slateMid,
                  lineHeight: 1.8,
                  margin: "0 0 1.75rem",
                }}
              >
                {t("about_desc")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              {ABOUT_CARDS.map(({ num, text }) => (
                <div
                  key={num}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "1.1rem",
                    border: `1px solid ${G.border}`,
                    background: G.offWhite,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: G.green,
                      letterSpacing: "0.1em",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: G.slate,
                    }}
                  >
                    {text}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section
        id="features"
        style={{ background: G.greenLight, padding: "6rem 1.5rem" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SectionLabel>{t("features")}</SectionLabel>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.025em",
                  color: G.slate,
                  margin: "0.75rem 0 0.5rem",
                }}
              >
                {t("features_title")}
              </h2>
              <p
                style={{
                  color: G.slateMid,
                  fontSize: "0.97rem",
                  maxWidth: 520,
                  margin: "0 auto",
                }}
              >
                {t("features_desc")}
              </p>
            </motion.div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {FEATURES.map(({ icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{
                  y: -4,
                  boxShadow: "0 16px 40px -12px rgba(22,163,74,0.18)",
                }}
                style={{
                  padding: "2rem",
                  borderRadius: "1.25rem",
                  border: `1px solid ${G.border}`,
                  background: G.white,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                  transition: "all 0.3s",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "0.875rem",
                    background: G.greenLight,
                    border: `1px solid ${G.greenBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    color: G.slate,
                    margin: "0 0 0.5rem",
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: G.slateMid,
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
          <nav style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                style={{
                  fontSize: "0.8rem",
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
        @media (max-width: 768px) {
          .hero-grid    { grid-template-columns: 1fr !important; }
          .section-grid { grid-template-columns: 1fr !important; }
          .desktop-nav  { display: none !important; }
          .mobile-burger { display: block !important; }
        }
      `}</style>
    </div>
  );
}
