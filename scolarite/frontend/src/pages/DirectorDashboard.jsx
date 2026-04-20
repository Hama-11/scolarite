import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Alert, Spinner } from "../components/ui";
import { statisticsService } from "../services/api";

export default function DirectorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await statisticsService.getDirectionDashboard();
        if (mounted) setData(res.data);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.message || "Impossible de charger le tableau de bord direction.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AppLayout title="Direction des études">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Direction des études">
      <div className="page-header">
        <h2>Direction des études</h2>
        <p>Pilotage académique: inscriptions, planning, examens, qualité.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data?.students ?? 0}</div>
          <div className="stat-label">Étudiants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.professors ?? 0}</div>
          <div className="stat-label">Professeurs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.active_groups ?? 0}</div>
          <div className="stat-label">Groupes actifs</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data?.pending_requests ?? 0}</div>
          <div className="stat-label">Demandes en attente</div>
        </div>
      </div>

      <div className="grid-2 mt-6">
        <Card>
          <CardHeader title="Taux d'approbation" subtitle="Demandes approuvées vs total traité" />
          <div className="p-4">
            <div className="stat-value">{data?.approval_rate ?? 0}%</div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Séances ce mois" subtitle="Suivi activité tutorat (si utilisé)" />
          <div className="p-4">
            <div className="stat-value">{data?.sessions_this_month ?? 0}</div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

