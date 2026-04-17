import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Input, Select, Badge, Alert, Spinner } from "../components/ui";
import { schoolClassService, studentRegistryService, professorRegistryService } from "../services/api";
import "../components/dashboard.css";

export default function AdminSchoolClasses() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", annee_scolaire: "" });
  const [expanded, setExpanded] = useState(null);
  const [attachStudentId, setAttachStudentId] = useState("");
  const [assignProfId, setAssignProfId] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [cRes, sRes, pRes] = await Promise.all([
        schoolClassService.getAll({ per_page: 100 }),
        studentRegistryService.getAll({ per_page: 200 }),
        professorRegistryService.getAll({ per_page: 200 }),
      ]);
      setClasses(cRes.data?.data ?? cRes.data ?? []);
      setStudents(sRes.data?.data ?? sRes.data ?? []);
      setProfessors(pRes.data?.data ?? pRes.data ?? []);
    } catch (e) {
      setError(e.response?.data?.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createClass(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await schoolClassService.create(form);
      setForm({ name: "", department: "", annee_scolaire: "" });
      setMsg("Classe créée.");
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || Object.values(e.response?.data?.errors || {}).flat().join(" ") || "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function removeClass(id) {
    if (!window.confirm("Supprimer cette classe ?")) return;
    setBusy(true);
    setError("");
    try {
      await schoolClassService.delete(id);
      setMsg("Classe supprimée.");
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function attach(classId) {
    if (!attachStudentId) return;
    setBusy(true);
    setError("");
    try {
      await schoolClassService.attachStudent(classId, Number(attachStudentId));
      setMsg("Étudiant affecté.");
      setAttachStudentId("");
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  async function assignProf(classId) {
    if (!assignProfId) return;
    setBusy(true);
    setError("");
    try {
      await schoolClassService.assignProfessor(classId, Number(assignProfId));
      setMsg("Professeur assigné.");
      setAssignProfId("");
      await refresh();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Classes scolaires">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const classList = Array.isArray(classes) ? classes : [];

  return (
    <AppLayout title="Classes scolaires">
      <div className="page-header">
        <h2>Classes scolaires</h2>
        <p>Création, affectation professeur et inscription des étudiants.</p>
      </div>
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
      {msg ? <Alert variant="success" className="mb-4">{msg}</Alert> : null}

      <Card className="mb-6">
        <CardHeader title="Nouvelle classe" />
        <form className="p-6 grid md:grid-cols-3 gap-4" onSubmit={createClass}>
          <Input label="Nom" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Département" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Input label="Année scolaire" value={form.annee_scolaire} onChange={(e) => setForm({ ...form, annee_scolaire: e.target.value })} />
          <div className="md:col-span-3">
            <Button type="submit" loading={busy}>
              Créer
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {classList.map((c) => (
          <Card key={c.id}>
            <div className="p-4 flex flex-wrap justify-between gap-2 items-start">
              <div>
                <h3 className="text-lg font-semibold">{c.name}</h3>
                <p className="text-sm text-gray-600">
                  {c.department || "—"} · {c.annee_scolaire || "—"}
                </p>
                <p className="text-sm mt-1">
                  Professeur :{" "}
                  {c.professor?.name || c.professor?.user?.name || <Badge variant="gray">Non assigné</Badge>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  {expanded === c.id ? "Fermer" : "Gérer"}
                </Button>
                <Button variant="danger" size="sm" loading={busy} onClick={() => removeClass(c.id)}>
                  Supprimer
                </Button>
              </div>
            </div>
            {expanded === c.id ? (
              <div className="px-4 pb-4 border-t pt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Assigner un professeur</h4>
                  <Select value={assignProfId} onChange={(e) => setAssignProfId(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {(Array.isArray(professors) ? professors : []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.user?.name} (#{p.id})
                      </option>
                    ))}
                  </Select>
                  <Button className="mt-2" size="sm" loading={busy} onClick={() => assignProf(c.id)}>
                    Enregistrer
                  </Button>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Ajouter un étudiant</h4>
                  <Select value={attachStudentId} onChange={(e) => setAttachStudentId(e.target.value)}>
                    <option value="">— Choisir —</option>
                    {(Array.isArray(students) ? students : []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.user?.name} (#{s.id})
                      </option>
                    ))}
                  </Select>
                  <Button className="mt-2" size="sm" loading={busy} onClick={() => attach(c.id)}>
                    Affecter
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
