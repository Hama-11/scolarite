import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { academicCoreService } from "../services/api";
import { Alert, Button, Card, CardHeader } from "../components/ui";

export default function AcademicCore() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hierarchyCount, setHierarchyCount] = useState(0);
  const [moduleCount, setModuleCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [conflicts, setConflicts] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [hierRes, modRes, examRes] = await Promise.all([
          academicCoreService.getHierarchy(),
          academicCoreService.getModules({ per_page: 1 }),
          academicCoreService.getExamSessions({ per_page: 1 }),
        ]);
        if (!mounted) return;
        setHierarchyCount(Array.isArray(hierRes?.data?.data) ? hierRes.data.data.length : 0);
        setModuleCount(Number(modRes?.data?.total ?? 0));
        setExamCount(Number(examRes?.data?.total ?? 0));
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de charger le coeur academique.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const detectConflicts = async () => {
    setError("");
    try {
      const res = await academicCoreService.detectScheduleConflicts();
      setConflicts(Number(res?.data?.count ?? 0));
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la detection des conflits.");
    }
  };

  return (
    <AppLayout title="Coeur academique">
      <div className="page-header">
        <h2>Gestion academique (coeur)</h2>
        <p>Catalogue, groupes, planning intelligent et sessions d examens.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{loading ? "..." : hierarchyCount}</div>
          <div className="stat-label">Facultes chargees</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? "..." : moduleCount}</div>
          <div className="stat-label">Modules</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? "..." : examCount}</div>
          <div className="stat-label">Sessions examen</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{conflicts}</div>
          <div className="stat-label">Conflits planning detectes</div>
        </div>
      </div>

      <Card>
        <CardHeader title="Actions rapides - Phase 1" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={detectConflicts}>Detecter conflits planning</Button>
        </div>
      </Card>
    </AppLayout>
  );
}
