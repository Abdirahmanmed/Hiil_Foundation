import { Routes, Route } from "react-router-dom";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import OtpVerify from "./pages/OtpVerify";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import InviteCommunity from "./pages/InviteCommunity";

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
        </Routes>
      </Shell>
    </>
  );
}
