import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { academicCoreService, adminService } from "../services/api";
import { Alert, Button, Card, CardHeader, Input, Select, Spinner } from "../components/ui";

export default function AcademicCore() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hierarchyCount, setHierarchyCount] = useState(0);
  const [moduleCount, setModuleCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [conflicts, setConflicts] = useState(0);

  const [levels, setLevels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [modules, setModules] = useState([]);

  const [newLevel, setNewLevel] = useState({ name: "", order_index: 1 });
  const [newModule, setNewModule] = useState({
    program_id: "",
    semester_id: "",
    code: "",
    name: "",
    credits: 0,
    coefficient: 1,
    evaluation_type: "mixte",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [hierRes, modRes, examRes, lvlRes, progRes, semRes, modListRes] = await Promise.all([
          academicCoreService.getHierarchy(),
          academicCoreService.getModules({ per_page: 1 }),
          academicCoreService.getExamSessions({ per_page: 1 }),
          academicCoreService.getLevels(),
          adminService.getPrograms({ per_page: 200 }),
          academicCoreService.getSemesters({}),
          academicCoreService.getModules({ per_page: 20 }),
        ]);
        if (!mounted) return;
        setHierarchyCount(Array.isArray(hierRes?.data?.data) ? hierRes.data.data.length : 0);
        setModuleCount(Number(modRes?.data?.total ?? 0));
        setExamCount(Number(examRes?.data?.total ?? 0));
        setLevels(Array.isArray(lvlRes?.data) ? lvlRes.data : []);
        const progPayload = progRes?.data;
        setPrograms(Array.isArray(progPayload?.data) ? progPayload.data : []);
        setSemesters(Array.isArray(semRes?.data) ? semRes.data : []);
        const modPayload = modListRes?.data;
        setModules(Array.isArray(modPayload?.data) ? modPayload.data : []);
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

  const semesterOptions = useMemo(() => {
    return semesters.map((s) => ({
      id: s.id,
      label: `${s.name} (L${s?.level?.order_index ?? ""} / #${s.number})`,
    }));
  }, [semesters]);

  const detectConflicts = async () => {
    setError("");
    try {
      const res = await academicCoreService.detectScheduleConflicts();
      setConflicts(Number(res?.data?.count ?? 0));
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la detection des conflits.");
    }
  };

  const createLevel = async () => {
    setError("");
    try {
      await academicCoreService.createLevel({ name: newLevel.name, order_index: Number(newLevel.order_index) || 1 });
      const lvlRes = await academicCoreService.getLevels();
      setLevels(Array.isArray(lvlRes?.data) ? lvlRes.data : []);
      setNewLevel({ name: "", order_index: 1 });
    } catch (e) {
      setError(e?.response?.data?.message || "Création niveau impossible.");
    }
  };

  const createModule = async () => {
    setError("");
    try {
      await academicCoreService.createModule({
        program_id: Number(newModule.program_id),
        semester_id: Number(newModule.semester_id),
        code: newModule.code.trim(),
        name: newModule.name.trim(),
        credits: Number(newModule.credits) || 0,
        coefficient: Number(newModule.coefficient) || 1,
        evaluation_type: newModule.evaluation_type,
      });
      const modListRes = await academicCoreService.getModules({ per_page: 20 });
      const modPayload = modListRes?.data;
      setModules(Array.isArray(modPayload?.data) ? modPayload.data : []);
      setNewModule({ program_id: "", semester_id: "", code: "", name: "", credits: 0, coefficient: 1, evaluation_type: "mixte" });
    } catch (e) {
      const errs = e?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : e?.response?.data?.message || "Création module impossible.");
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

      <div className="grid-2 mt-6">
        <Card>
          <CardHeader title="Niveaux (L1, L2, M1...)" subtitle="Création rapide (admin/directeur)" />
          <div className="p-4">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
                  <Input label="Nom" value={newLevel.name} onChange={(e) => setNewLevel({ ...newLevel, name: e.target.value })} placeholder="L1" />
                  <Input label="Ordre" type="number" min={1} max={20} value={newLevel.order_index} onChange={(e) => setNewLevel({ ...newLevel, order_index: e.target.value })} />
                  <Button onClick={createLevel} disabled={!newLevel.name.trim()}>Ajouter niveau</Button>
                </div>
                <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
                  {levels.map((l) => (
                    <div key={l.id} className="ui-card compact">
                      <div className="item-row">
                        <div style={{ fontWeight: 800 }}>{l.name}</div>
                        <div className="item-subtitle">ordre: {l.order_index}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Modules" subtitle="Créer un module et l’affecter à une filière + semestre" />
          <div className="p-4">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <div style={{ display: "grid", gap: 10 }}>
                  <Select label="Programme (filière)" value={newModule.program_id} onChange={(e) => setNewModule({ ...newModule, program_id: e.target.value })}>
                    <option value="">—</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </Select>
                  <Select label="Semestre" value={newModule.semester_id} onChange={(e) => setNewModule({ ...newModule, semester_id: e.target.value })}>
                    <option value="">—</option>
                    {semesterOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </Select>
                  <Input label="Code" value={newModule.code} onChange={(e) => setNewModule({ ...newModule, code: e.target.value })} placeholder="INF101" />
                  <Input label="Nom" value={newModule.name} onChange={(e) => setNewModule({ ...newModule, name: e.target.value })} placeholder="Algorithmique" />
                  <div className="grid-2">
                    <Input label="Crédits" type="number" min={0} max={60} value={newModule.credits} onChange={(e) => setNewModule({ ...newModule, credits: e.target.value })} />
                    <Input label="Coefficient" type="number" min={0} step="0.01" value={newModule.coefficient} onChange={(e) => setNewModule({ ...newModule, coefficient: e.target.value })} />
                  </div>
                  <Select label="Évaluation" value={newModule.evaluation_type} onChange={(e) => setNewModule({ ...newModule, evaluation_type: e.target.value })}>
                    <option value="cc">CC</option>
                    <option value="tp">TP</option>
                    <option value="examen">Examen</option>
                    <option value="mixte">Mixte</option>
                  </Select>
                  <Button onClick={createModule} disabled={!newModule.program_id || !newModule.semester_id || !newModule.code.trim() || !newModule.name.trim()}>
                    Créer module
                  </Button>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                  {modules.map((m) => (
                    <div key={m.id} className="ui-card compact">
                      <div className="item-row">
                        <div>
                          <div className="item-title" style={{ fontSize: 14 }}>{m.code} — {m.name}</div>
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            {m?.program?.name || "Programme"} · {m?.semester?.name || "Semestre"} · crédits: {m.credits}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
