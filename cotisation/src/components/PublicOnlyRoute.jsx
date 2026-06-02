import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardPath } from "./routeUtils";

export default function PublicOnlyRoute({ children }) {
  const { user } = useAuth();

  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;

  return children;
}
