import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {Array<'etudiant'|'enseignant'|'admin'>} props.allow
 * @param {string} [props.fallback]
 */
export default function RequireRole({ children, allow, fallback = "/dashboard" }) {
  const { loading, canonicalRole } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="ui-spinner lg" />
      </div>
    );
  }

  if (!canonicalRole || !allow.includes(canonicalRole)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
