import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE } from "../auth/roles";

export default function DirectorRoute({ children }) {
  const { loading, canonicalRole } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="ui-spinner lg" />
      </div>
    );
  }

  if (![ROLE.DIRECTEUR, ROLE.ADMIN].includes(canonicalRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

