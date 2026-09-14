import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import { useTranslation } from "react-i18next";

const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const OtpVerify = lazy(() => import("./pages/OtpVerify"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ExpenseManagerDashboard = lazy(() => import("./pages/ExpenseManagerDashboard"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const TreasuryDashboard = lazy(() => import("./pages/TreasuryDashboard"));
const InviteCommunity = lazy(() => import("./pages/InviteCommunity"));
const SetPassword = lazy(() => import("./pages/SetPassword"));

function RTLHandler() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isRtl = i18n.language?.startsWith("ar");
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language || "fr";
  }, [i18n.language]);

  return null;
}

export default function App() {
  return (
    <>
      <RTLHandler />
      <Shell>
        <Suspense fallback={<div className="p-6 text-sm text-slate-500">Chargement...</div>}>
          <Routes>
            <Route path="/" element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/otp" element={<PublicOnlyRoute><OtpVerify /></PublicOnlyRoute>} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            {/* Activation d'un compte interne. Volontairement HORS PublicOnlyRoute :
                le titulaire clique souvent son lien depuis un navigateur ou une
                autre session est deja ouverte (le poste du bureau, celui de
                l'admin qui vient de creer le compte). PublicOnlyRoute le
                renverrait vers un dashboard qui n'est pas le sien, en ecrasant
                le jeton de l'URL sans aucun message. */}
            <Route path="/activation" element={<SetPassword />} />

          <Route
            path="/client"
            element={
              <ProtectedRoute role="CLIENT">
                <ClientDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invite"
            element={
              <ProtectedRoute role="CLIENT">
                <InviteCommunity />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/expense-manager"
            element={
              <ProtectedRoute role="GESTIONNAIRE_DEPENSE">
                <ExpenseManagerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/super-admin"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/treasury"
            element={
              <ProtectedRoute role="EQUIPE_TRESORERIE">
                <TreasuryDashboard />
              </ProtectedRoute>
            }
          />
          </Routes>
        </Suspense>
      </Shell>
    </>
  );
}
