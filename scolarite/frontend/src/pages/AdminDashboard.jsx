import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Button, Alert } from "../components/ui";
import { adminService, statisticsService } from "../services/api";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    students: 0,
    professors: 0,
    departments: 0,
    programs: 0,
    pending_requests: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [adminStatsRes, dashboardRes] = await Promise.all([
          adminService.getDashboardStats(),
          statisticsService.getDashboard(),
        ]);

        if (!mounted) return;

        const adminStats = adminStatsRes?.data || {};
        const dash = dashboardRes?.data || {};
        const pending = Number(dash?.stats?.pending_requests ?? 0);

        setStats({
          students: Number(adminStats.students ?? 0),
          professors: Number(adminStats.professors ?? 0),
          departments: Number(adminStats.departments ?? 0),
          programs: Number(adminStats.programs ?? 0),
          pending_requests: Number.isFinite(pending) ? pending : 0,
        });
        setRecentActivity(Array.isArray(dash?.recent_activity) ? dash.recent_activity : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de charger l espace administrateur.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppLayout title="Espace administrateur">
      <div className="page-header">
        <h2>Espace administrateur</h2>
        <p>Pilotage global de la plateforme, statistiques et supervision.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="stats-grid">
        <StatCard label="Etudiants" value={stats.students} />
        <StatCard label="Professeurs" value={stats.professors} />
        <StatCard label="Departements" value={stats.departments} />
        <StatCard label="Programmes" value={stats.programs} />
      </div>

      <div className="grid-70-30">
        <Card>
          <CardHeader title="Activite recente" />
          {loading ? (
            <div className="muted-center">Chargement...</div>
          ) : recentActivity.length === 0 ? (
            <div className="muted-center">Aucune activite recente.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {recentActivity.slice(0, 8).map((a, idx) => (
                <div className="ui-card compact" key={idx}>
                  <div style={{ fontWeight: 700 }}>{a?.icon ? `${a.icon} ` : ""}{a?.text || "Activite"}</div>
                  <div className="item-subtitle" style={{ marginTop: 4 }}>{a?.time || ""}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Actions rapides" />
          <div style={{ display: "grid", gap: 10 }}>
            <QuickAction to="/requests" label="Demandes" value={stats.pending_requests} />
            <QuickAction to="/reports" label="Rapports & statistiques" />
            <QuickAction to="/students" label="Étudiants" />
            <QuickAction to="/groups" label="Groupes" />
            <QuickAction to="/settings" label="Paramètres" />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function QuickAction({ to, label, value }) {
  return (
    <Link to={to} className="ui-card compact" style={{ textDecoration: "none" }}>
      <div className="item-row" style={{ alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, color: "var(--ui-text)" }}>{label}</span>
          {typeof value === "number" ? <Badge variant="warning">{value}</Badge> : null}
        </div>
        <Button size="sm" variant="outline">Ouvrir</Button>
      </div>
    </Link>
  );
}
