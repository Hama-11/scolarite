import { useState, useEffect } from "react";
import { api } from "../api/axios";
import AppLayout from "../components/AppLayout";
import { Card, Badge, Spinner, Alert } from "../components/ui";
import "../components/dashboard.css";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/profile")
      .then((res) => {
        const payload = res.data;
        setUser(payload?.user || payload);
      })
      .catch(() => {
        setError("Impossible de charger le profil.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <AppLayout title="Mon profil">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const roleText =
    user?.role_display_name ||
    (typeof user?.role === "string" ? user.role : user?.role?.display_name || user?.role?.name) ||
    "Utilisateur";
  const initials = user?.name
    ? user.name.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <AppLayout title="Mon profil">
      <div className="page-header">
        <h2>Mon profil</h2>
        <p>Consultez vos informations de compte.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <div className="avatar avatar-xl" style={{ marginBottom: 12 }}>
              {initials}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.name || "N/A"}</h3>
            <p className="text-sm text-gray-500">{user?.email || "N/A"}</p>
            <div style={{ marginTop: 10 }}>
              <Badge variant="info">{roleText}</Badge>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Nom complet</p>
              <p className="text-base font-medium text-gray-900 mt-1">{user?.name || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
              <p className="text-base font-medium text-gray-900 mt-1">{user?.email || "-"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Rôle</p>
              <p className="text-base font-medium text-gray-900 mt-1">{roleText}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Statut</p>
              <p className="text-base font-medium text-gray-900 mt-1">Actif</p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
