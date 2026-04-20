import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { directorService, studentManagementService } from "../services/api";
import { Alert, Button, Card, CardHeader, Input, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

export default function DirectorStudentsFollowUp() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [overview, setOverview] = useState(null);
  const [decision, setDecision] = useState("pass");
  const [juryNotes, setJuryNotes] = useState("");

  const selectedStudent = useMemo(
    () => students.find((s) => String(s.id) === String(selectedStudentId)) || null,
    [students, selectedStudentId]
  );

  const loadStudents = useCallback(async () => {
    setError("");
    const res = await studentManagementService.getAll({ per_page: 50, search: search || undefined });
    const payload = res?.data;
    return Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  }, [search]);

  const loadOverview = useCallback(async (studentId) => {
    if (!studentId) return;
    setError("");
    try {
      const res = await directorService.getStudentOverview(studentId);
      setOverview(res?.data || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le suivi de l'étudiant.");
      setOverview(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await loadStudents();
        setStudents(list);
        if (!selectedStudentId && list[0]?.id) setSelectedStudentId(String(list[0].id));
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger les étudiants.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStudents]);

  useEffect(() => {
    loadOverview(selectedStudentId);
  }, [selectedStudentId, loadOverview]);

  async function submitDecision() {
    if (!selectedStudentId) return;
    setError("");
    try {
      await directorService.decideAcademic(selectedStudentId, { decision, jury_notes: juryNotes || null });
      await loadOverview(selectedStudentId);
    } catch (e) {
      setError(e?.response?.data?.message || "Décision impossible.");
    }
  }

  return (
    <AppLayout title="Suivi des étudiants">
      <div className="page-header header-row">
        <div>
          <h2>Suivi des étudiants</h2>
          <p>Résultats, absences, performance et décisions académiques.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => loadOverview(selectedStudentId)} disabled={!selectedStudentId}>Actualiser</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader title="Étudiants" subtitle="Recherche + sélection" />
          <div className="p-4 space-y-3">
            <Input label="Recherche" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom / email / matricule..." />
            <Button variant="secondary" onClick={async () => {
              setLoading(true);
              try {
                const list = await loadStudents();
                setStudents(list);
              } catch (e) {
                setError(e?.response?.data?.message || "Impossible de charger les étudiants.");
              } finally {
                setLoading(false);
              }
            }}>Rechercher</Button>

            <Select label="Sélection" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s?.user?.name || s.name || `#${s.id}`}</option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={selectedStudent ? (selectedStudent?.user?.name || selectedStudent.name) : "Détails"}
            subtitle={selectedStudent?.user?.email || ""}
          />
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner size="lg" /></div>
            ) : !overview ? (
              <div className="muted-center">Sélectionnez un étudiant.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Notes (total)</div>
                    <div className="text-xl font-semibold">{overview?.summary?.grades_total ?? 0}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Notes validées</div>
                    <div className="text-xl font-semibold">{overview?.summary?.grades_validated ?? 0}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Moyenne (validées)</div>
                    <div className="text-xl font-semibold">{overview?.summary?.average_validated ?? "—"}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Assiduité</div>
                    <div className="text-xl font-semibold">{overview?.summary?.attendance_rate ?? 0}%</div>
                  </Card>
                </div>

                <Card className="mb-4">
                  <CardHeader title="Décision académique" subtitle="Passage / redoublement / conditionnel" />
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select label="Décision" value={decision} onChange={(e) => setDecision(e.target.value)}>
                      <option value="pass">Passage</option>
                      <option value="repeat">Redoublement</option>
                      <option value="conditional">Conditionnel</option>
                    </Select>
                    <Input label="Notes jury (optionnel)" value={juryNotes} onChange={(e) => setJuryNotes(e.target.value)} placeholder="Motif / conditions..." />
                    <div className="flex items-end">
                      <Button onClick={submitDecision} className="w-full">Enregistrer</Button>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Résultats (notes)" subtitle="Historique" />
                  <div className="p-4 overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Cours</TableHeader>
                          <TableHeader>Type</TableHeader>
                          <TableHeader>Note</TableHeader>
                          <TableHeader>Validée</TableHeader>
                          <TableHeader>Date</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(overview?.grades || []).map((g) => (
                          <TableRow key={g.id}>
                            <TableCell>{g?.course?.code ? `${g.course.code} — ${g.course.name}` : `#${g.course_id}`}</TableCell>
                            <TableCell>{g.type}</TableCell>
                            <TableCell>{Number(g.grade ?? 0).toFixed(2)}</TableCell>
                            <TableCell>{g.is_validated ? "Oui" : "Non"}</TableCell>
                            <TableCell>{g.date || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

