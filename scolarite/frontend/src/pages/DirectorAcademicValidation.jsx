import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { directorService, courseService } from "../services/api";
import { Alert, Button, Card, CardHeader, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

export default function DirectorAcademicValidation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [selected, setSelected] = useState({});

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]).map((k) => Number(k)), [selected]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingRes, coursesRes] = await Promise.all([
        directorService.getPendingGrades({ per_page: 50, course_id: courseId || undefined }),
        courseService.getAll({ per_page: 200 }),
      ]);
      const payload = pendingRes?.data;
      setItems(Array.isArray(payload?.data) ? payload.data : []);
      const cp = coursesRes?.data;
      setCourses(Array.isArray(cp?.data) ? cp.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les notes en attente.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function validateOne(id) {
    setError("");
    try {
      await directorService.validateGrade(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Validation impossible.");
    }
  }

  async function validateBulk() {
    if (selectedIds.length === 0) return;
    setError("");
    try {
      await directorService.validateGradesBulk(selectedIds);
      setSelected({});
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Validation en lot impossible.");
    }
  }

  return (
    <AppLayout title="Validation académique">
      <div className="page-header header-row">
        <div>
          <h2>Validation des notes</h2>
          <p>Valider les notes soumises par les enseignants.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={load}>Actualiser</Button>
          <Button onClick={validateBulk} disabled={selectedIds.length === 0}>Valider sélection ({selectedIds.length})</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-4">
        <CardHeader title="Filtre" />
        <div className="p-4" style={{ maxWidth: 520 }}>
          <Select label="Cours" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Tous</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notes en attente" subtitle="Seules les notes non validées apparaissent ici." />
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : items.length === 0 ? (
            <div className="muted-center">Aucune note en attente.</div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader />
                  <TableHeader>Étudiant</TableHeader>
                  <TableHeader>Cours</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Note /20</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <input type="checkbox" checked={!!selected[g.id]} onChange={(e) => setSelected((p) => ({ ...p, [g.id]: e.target.checked }))} />
                    </TableCell>
                    <TableCell className="font-medium">{g?.student?.user?.name || `#${g.student_id}`}</TableCell>
                    <TableCell>{g?.course?.code ? `${g.course.code} — ${g.course.name}` : `#${g.course_id}`}</TableCell>
                    <TableCell>{g.type}</TableCell>
                    <TableCell>{Number(g.grade ?? 0).toFixed(2)}</TableCell>
                    <TableCell>{g.date || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="success" onClick={() => validateOne(g.id)}>Valider</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}

