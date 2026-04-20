import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Button, Alert, Spinner } from "../components/ui";
import { adminService, statisticsService } from "../services/api";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsWarning, setStatsWarning] = useState("");
  const [stats, setStats] = useState({
    students: 0,
    professors: 0,
    departments: 0,
    programs: 0,
    rooms: 0,
    courses: 0,
    pending_requests: 0,
    yearName: null,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      setStatsWarning("");

      const results = await Promise.allSettled([
        adminService.getDashboardStats(),
        statisticsService.getDashboard(),
      ]);

      if (!mounted) return;

      const [adminRes, dashRes] = results;

      if (adminRes.status === "fulfilled") {
        const adminStats = adminRes.value?.data || {};
        const y = adminStats.current_academic_year;
        setStats((s) => ({
          ...s,
          students: Number(adminStats.students ?? 0),
          professors: Number(adminStats.professors ?? 0),
          departments: Number(adminStats.departments ?? 0),
          programs: Number(adminStats.programs ?? 0),
          rooms: Number(adminStats.rooms ?? 0),
          courses: Number(adminStats.courses ?? 0),
          yearName: y && typeof y === "object" ? y.name : y || null,
        }));
      } else {
        setError(
          adminRes.reason?.response?.data?.message ||
            adminRes.reason?.message ||
            "Impossible de charger les statistiques principales."
        );
      }

      if (dashRes.status === "fulfilled") {
        const dash = dashRes.value?.data || {};
        const pending = Number(dash?.stats?.pending_requests ?? 0);
        setStats((s) => ({
          ...s,
          pending_requests: Number.isFinite(pending) ? pending : s.pending_requests,
        }));
        setRecentActivity(Array.isArray(dash?.recent_activity) ? dash.recent_activity : []);
      } else {
        setStatsWarning(
          "L’activité récente et les demandes agrégées ne sont pas disponibles (erreur secondaire)."
        );
      }

      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppLayout title="Espace administrateur">
      <div className="page-header">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2>Tableau de bord administrateur</h2>
            <p style={{ marginTop: 6, color: "var(--text-muted)" }}>
              Vue d’ensemble de la scolarité, des effectifs et des raccourcis métiers.
            </p>
          </div>
          {stats.yearName ? (
            <Badge variant="blue">Année active : {stats.yearName}</Badge>
          ) : (
            <span className="item-subtitle">Aucune année marquée « courante » en base.</span>
          )}
        </div>
      </div>

      {error ? (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      ) : null}
      {statsWarning ? (
        <Alert variant="warning" className="mb-6">
          {statsWarning}
        </Alert>
      ) : null}

      {loading ? (
        <div className="muted-center" style={{ padding: "48px 0" }}>
          <Spinner size="lg" />
          <p className="item-subtitle" style={{ marginTop: 12 }}>
            Chargement des indicateurs…
          </p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Étudiants" value={stats.students} />
            <StatCard label="Enseignants" value={stats.professors} />
            <StatCard label="Départements" value={stats.departments} />
            <StatCard label="Programmes" value={stats.programs} />
            <StatCard label="Salles" value={stats.rooms} />
            <StatCard label="Cours" value={stats.courses} />
          </div>

          <div className="grid-70-30" style={{ marginTop: 24 }}>
            <Card>
              <CardHeader title="Activité récente" subtitle="Derniers événements enregistrés sur la plateforme" />
              {recentActivity.length === 0 ? (
                <div className="muted-center">Aucune activité récente à afficher.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {recentActivity.slice(0, 8).map((a, idx) => (
                    <div className="ui-card compact" key={idx}>
                      <div style={{ fontWeight: 700 }}>
                        {a?.icon ? `${a.icon} ` : ""}
                        {a?.text || "Activité"}
                      </div>
                      <div className="item-subtitle" style={{ marginTop: 4 }}>
                        {a?.time || ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Actions rapides" subtitle="Accès direct aux espaces admin" />
              <div style={{ display: "grid", gap: 10 }}>
                <QuickAction to="/requests" label="Demandes & workflow" value={stats.pending_requests} />
                <QuickAction to="/admin/academic-core" label="Cœur académique" />
                <QuickAction to="/admin/system-center" label="Admin système (settings, logs, import/export)" />
                <QuickAction to="/admin/student-validation" label="Validation dossiers étudiants" />
                <QuickAction to="/admin/school-classes" label="Classes scolaires" />
                <QuickAction to="/admin/official-requests" label="Demandes de documents" />
                <QuickAction to="/admin/conception-grade-disputes" label="Litiges de notes" />
                <QuickAction to="/reports" label="Rapports & statistiques" />
                <QuickAction to="/students" label="Annuaire étudiants" />
                <QuickAction to="/groups" label="Groupes" />
                <QuickAction to="/settings" label="Paramètres" />
              </div>
            </Card>
          </div>
        </>
      )}
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
          {typeof value === "number" && value > 0 ? (
            <Badge variant="warning">{value}</Badge>
          ) : null}
        </div>
        <Button size="sm" variant="outline" type="button">
          Ouvrir
        </Button>
      </div>
    </Link>
  );
}
