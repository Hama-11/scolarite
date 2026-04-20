import { useEffect, useState, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { statisticsService } from "../services/api";
import { Card, CardHeader, Alert, Spinner, Button } from "../components/ui";
import "../components/dashboard.css";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dash, setDash] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await statisticsService.getDashboard();
        if (mounted) setDash(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || "Impossible de charger les statistiques.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sessionsByMonth = dash?.sessions_by_month;
  const monthBars = useMemo(() => {
    if (!Array.isArray(sessionsByMonth)) return [];
    const max = Math.max(1, ...sessionsByMonth.map((n) => Number(n) || 0));
    return sessionsByMonth.map((count, i) => ({
      label: MONTHS_FR[i] || String(i + 1),
      count: Number(count) || 0,
      pct: ((Number(count) || 0) / max) * 100,
    }));
  }, [sessionsByMonth]);

  const stats = dash?.stats || {};
  const sessionTypes = dash?.session_types || {};
  const recentGroups = useMemo(
    () => (Array.isArray(dash?.recent_groups) ? dash.recent_groups : []),
    [dash?.recent_groups]
  );
  const recentActivity = Array.isArray(dash?.recent_activity) ? dash.recent_activity : [];

  const deptRollup = useMemo(() => {
    const map = {};
    recentGroups.forEach((g) => {
      const d = g.dept || g.departement || "Autre";
      if (!map[d]) map[d] = { dept: d, groups: 0, students: 0 };
      map[d].groups += 1;
      map[d].students += Number(g.students) || 0;
    });
    const list = Object.values(map);
    const total = list.reduce((s, x) => s + x.groups, 0) || 1;
    return list.map((x) => ({ ...x, percent: Math.round((x.groups / total) * 100) }));
  }, [recentGroups]);

  if (loading) {
    return (
      <AppLayout title="Statistiques & rapports">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Statistiques & rapports">
      <div className="page-header header-row">
        <div>
          <h2>Tableau de bord analytique</h2>
          <p>Indicateurs réels calculés depuis la base de données académique.</p>
        </div>
        <div className="header-actions">
          <Button type="button" variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="stats-grid">
        {[
          { icon: "🎓", color: "orange", label: "Étudiants", value: stats.students ?? 0 },
          { icon: "👨‍🏫", color: "purple", label: "Professeurs", value: stats.professors ?? 0 },
          { icon: "📚", color: "blue", label: "Cours actifs", value: stats.active_courses ?? 0 },
          { icon: "🧾", color: "yellow", label: "Inscriptions validées", value: stats.approved_enrollments ?? 0 },
          { icon: "📅", color: "purple", label: "Plannings ce mois", value: stats.schedules_this_month ?? 0 },
          { icon: "✅", color: "green", label: "Taux présence", value: `${stats.attendance_rate ?? 0}%` },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-top">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-70-30 mt-6">
        <Card>
          <CardHeader title="Plannings par mois (année en cours)" subtitle="Basé sur les données de planning enregistrées en base." />
          <div className="p-4">
            {monthBars.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune donnée.</p>
            ) : (
              <div className="chart-container">
                <div className="chart-bars">
                  {monthBars.map((m) => (
                    <div className="chart-bar-wrap" key={m.label}>
                      <div className="chart-bar" style={{ height: `${m.pct}%` }} title={`${m.count} séances`} />
                      <div className="chart-bar-label">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Répartition des types pédagogiques" />
          <div className="p-4 space-y-3">
            {["presential", "online", "mixed"].map((key) => (
              <div key={key}>
                <div className="header-row text-sm mb-1">
                  <span>{key === "presential" ? "Cours" : key === "online" ? "TD" : "TP"}</span>
                  <span className="font-semibold">{sessionTypes[key] ?? 0}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill primary" style={{ width: `${sessionTypes[key] ?? 0}%` }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-2">Total créneaux planifiés : {sessionTypes.total ?? 0}</p>
          </div>
        </Card>
      </div>

      <div className="grid-2 mt-6">
        <Card>
          <CardHeader title="Groupes récents (aperçu)" subtitle="Répartition par département sur les derniers groupes" />
          <div className="p-4">
            {deptRollup.length === 0 ? (
              <p className="text-sm text-gray-500">Pas encore de groupes listés.</p>
            ) : (
              deptRollup.map((d) => (
                <div key={d.dept} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{d.dept}</span>
                    <span>{d.percent}%</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">
                    {d.groups} groupe(s) · {d.students} inscription(s) approuvée(s) (aperçu)
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill primary" style={{ width: `${d.percent}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Activité récente" subtitle="Événements récents (groupes, demandes)" />
          <div className="p-4 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune activité récente.</p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm border-b border-gray-100 pb-2">
                    <span>{a.icon || "•"}</span>
                    <div>
                      <div>{a.text}</div>
                      <div className="text-xs text-gray-500">{a.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Détail des groupes récents"
          subtitle="Les exports PDF/Excel pourront être branchés sur les mêmes agrégations API."
        />
        <div className="p-4 overflow-x-auto">
          {recentGroups.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun groupe récent.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Groupe</th>
                  <th>Département</th>
                  <th>Tuteur</th>
                  <th>Étudiants</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentGroups.map((g, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{g.name}</td>
                    <td>{g.dept || g.departement || "—"}</td>
                    <td>{g.tutor || "—"}</td>
                    <td>{g.students ?? 0}</td>
                    <td>{g.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
