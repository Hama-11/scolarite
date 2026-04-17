import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { isAuthed } from "../auth/auth";

export default function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="ui-spinner lg" />
      </div>
    );
  }

  if (!isAuthed()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Optionally check for email verification
  // if (!user?.email_verified_at) {
  //   return <Navigate to="/verify-email" replace />;
  // }

  return children;
}
