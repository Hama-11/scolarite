import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { academicCoreService, adminService, professorRegistryService } from "../services/api";
import { Alert, Badge, Button, Card, CardHeader, Input, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSystemCenter() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    email: { from_name: "", from_address: "" },
    notifications: { email_enabled: true, in_app_enabled: true },
    advanced_rights: { strict_mode: false, allow_director_manage_exams: true },
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [matrix, setMatrix] = useState({});

  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const [programs, setPrograms] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [newModule, setNewModule] = useState({
    program_id: "",
    semester_id: "",
    coordinator_professor_id: "",
    code: "",
    name: "",
    credits: 3,
    coefficient: 1,
    evaluation_type: "mixte",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsRes, logsRes, matrixRes, programsRes, semestersRes, professorsRes] = await Promise.all([
        adminService.getSystemSettings(),
        adminService.getAuditLogs({ per_page: 20 }),
        adminService.getRolesPermissions(),
        adminService.getPrograms({ per_page: 200 }),
        academicCoreService.getSemesters({}),
        professorRegistryService.getAll({ per_page: 200 }),
      ]);

      setSettings(settingsRes?.data || settings);
      const lp = logsRes?.data;
      setAuditLogs(Array.isArray(lp?.data) ? lp.data : []);
      setMatrix(matrixRes?.data || {});
      const pp = programsRes?.data;
      setPrograms(Array.isArray(pp?.data) ? pp.data : []);
      setSemesters(Array.isArray(semestersRes?.data) ? semestersRes.data : []);
      const profp = professorsRes?.data;
      setProfessors(Array.isArray(profp?.data) ? profp.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Chargement admin impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const roleRows = useMemo(() => {
    const m = matrix?.matrix || {};
    return Object.keys(m).map((role) => ({
      role,
      permissions: Object.entries(m[role] || {}).filter(([, v]) => !!v).map(([k]) => k),
    }));
  }, [matrix]);

  async function saveSettings() {
    setError("");
    try {
      await adminService.updateSystemSettings(settings);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Mise à jour settings impossible.");
    }
  }

  async function importStudentsCsv() {
    if (!importFile) return;
    setError("");
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const res = await adminService.importStudentsCsv(fd);
      setImportResult(res?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Import CSV impossible.");
    }
  }

  async function exportDataset(dataset) {
    setError("");
    try {
      const res = await adminService.exportCsv(dataset);
      downloadBlob(res.data, `${dataset}.csv`);
    } catch (e) {
      setError(e?.response?.data?.message || "Export impossible.");
    }
  }

  async function createModuleWithProfessor() {
    setError("");
    try {
      await academicCoreService.createModule({
        ...newModule,
        program_id: Number(newModule.program_id),
        semester_id: Number(newModule.semester_id),
        coordinator_professor_id: newModule.coordinator_professor_id ? Number(newModule.coordinator_professor_id) : null,
        credits: Number(newModule.credits),
        coefficient: Number(newModule.coefficient),
      });
      setNewModule({
        program_id: "",
        semester_id: "",
        coordinator_professor_id: "",
        code: "",
        name: "",
        credits: 3,
        coefficient: 1,
        evaluation_type: "mixte",
      });
    } catch (e) {
      const errs = e?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : e?.response?.data?.message || "Création module impossible.");
    }
  }

  if (loading) {
    return (
      <AppLayout title="Admin Système">
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Système">
      <div className="page-header">
        <h2>Administration système (technique + organisation)</h2>
        <p>Users, structure, modules, classes, années, paramètres, logs, import/export.</p>
      </div>
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="1-5. Gestion structurelle" />
          <div className="p-4 grid gap-2">
            <Link to="/admin/users"><Button className="w-full">Utilisateurs</Button></Link>
            <Link to="/admin/academic-core"><Button className="w-full" variant="secondary">Filières / Départements / Niveaux</Button></Link>
            <Link to="/admin/school-classes"><Button className="w-full" variant="secondary">Classes / Groupes</Button></Link>
          </div>
        </Card>

        <Card>
          <CardHeader title="Affecter enseignant à module" subtitle="Création module + enseignant responsable" />
          <div className="p-4 grid gap-2">
            <Select value={newModule.program_id} onChange={(e) => setNewModule((p) => ({ ...p, program_id: e.target.value }))} label="Filière">
              <option value="">—</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select value={newModule.semester_id} onChange={(e) => setNewModule((p) => ({ ...p, semester_id: e.target.value }))} label="Semestre">
              <option value="">—</option>
              {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select value={newModule.coordinator_professor_id} onChange={(e) => setNewModule((p) => ({ ...p, coordinator_professor_id: e.target.value }))} label="Enseignant">
              <option value="">—</option>
              {professors.map((p) => <option key={p.id} value={p.id}>{p?.user?.name || `#${p.id}`}</option>)}
            </Select>
            <Input label="Code module" value={newModule.code} onChange={(e) => setNewModule((p) => ({ ...p, code: e.target.value }))} />
            <Input label="Nom module" value={newModule.name} onChange={(e) => setNewModule((p) => ({ ...p, name: e.target.value }))} />
            <Button onClick={createModuleWithProfessor}>Créer module</Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="6. Paramètres système" />
          <div className="p-4 grid gap-2">
            <Input label="Email expéditeur (nom)" value={settings?.email?.from_name || ""} onChange={(e) => setSettings((p) => ({ ...p, email: { ...(p.email || {}), from_name: e.target.value } }))} />
            <Input label="Email expéditeur (adresse)" value={settings?.email?.from_address || ""} onChange={(e) => setSettings((p) => ({ ...p, email: { ...(p.email || {}), from_address: e.target.value } }))} />
            <label><input type="checkbox" checked={!!settings?.notifications?.email_enabled} onChange={(e) => setSettings((p) => ({ ...p, notifications: { ...(p.notifications || {}), email_enabled: e.target.checked } }))} /> Notifications email activées</label>
            <label><input type="checkbox" checked={!!settings?.notifications?.in_app_enabled} onChange={(e) => setSettings((p) => ({ ...p, notifications: { ...(p.notifications || {}), in_app_enabled: e.target.checked } }))} /> Notifications in-app activées</label>
            <label><input type="checkbox" checked={!!settings?.advanced_rights?.strict_mode} onChange={(e) => setSettings((p) => ({ ...p, advanced_rights: { ...(p.advanced_rights || {}), strict_mode: e.target.checked } }))} /> Mode strict droits avancés</label>
            <Button onClick={saveSettings}>Sauvegarder paramètres</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="6. Droits avancés (matrice RBAC)" />
          <div className="p-4">
            {roleRows.length === 0 ? <div className="item-subtitle">Aucune matrice.</div> : roleRows.map((r) => (
              <div key={r.role} className="ui-card compact mb-2">
                <div className="item-row">
                  <div style={{ fontWeight: 700 }}>{r.role}</div>
                  <div className="item-subtitle">{r.permissions.join(", ") || "Aucune permission explicite"}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="7. Import CSV" subtitle="Colonnes minimales: name,email,role[,password]" />
          <div className="p-4 grid gap-2">
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
            <Button onClick={importStudentsCsv} disabled={!importFile}>Importer comptes</Button>
            {importResult && <Alert variant="success">Créés: {importResult.created ?? 0} | Mis à jour: {importResult.updated ?? 0}</Alert>}
          </div>
        </Card>

        <Card>
          <CardHeader title="7. Export CSV" subtitle="Utilisateurs, étudiants, notes, logs" />
          <div className="p-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => exportDataset("users")}>Export users</Button>
            <Button variant="secondary" onClick={() => exportDataset("students")}>Export students</Button>
            <Button variant="secondary" onClick={() => exportDataset("grades")}>Export grades</Button>
            <Button variant="secondary" onClick={() => exportDataset("audit-logs")}>Export logs</Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="6. Logs / historique des actions" subtitle="Dernières actions sensibles" />
        <div className="p-4 overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>ID</TableHeader>
                <TableHeader>Utilisateur</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Ressource</TableHeader>
                <TableHeader>Date</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.id}</TableCell>
                  <TableCell>{l?.user?.email || `#${l.user_id || "-"}`}</TableCell>
                  <TableCell><Badge variant="info">{l.action}</Badge></TableCell>
                  <TableCell>{l.resource_type}{l.resource_id ? ` #${l.resource_id}` : ""}</TableCell>
                  <TableCell>{l.created_at || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppLayout>
  );
}

