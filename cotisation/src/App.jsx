import { lazy, Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
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
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/otp" element={<OtpVerify />} />
            <Route path="/login" element={<Login />} />

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
              <ProtectedRoute role="ADMIN">
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
