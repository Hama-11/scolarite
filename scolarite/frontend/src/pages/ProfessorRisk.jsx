import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Spinner, Alert, Select, Input } from "../components/ui";
import { attendanceService, courseService, gradeService, assignmentService } from "../services/api";
import "../components/dashboard.css";

function avg(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const vals = list.filter((n) => Number.isFinite(n));
  if (vals.length === 0) return null;
  return vals.reduce((s, x) => s + x, 0) / vals.length;
}

export default function ProfessorRisk() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [search, setSearch] = useState("");

  const [courseStats, setCourseStats] = useState({
    overdueAssignments: 0,
    totalAssignments: 0,
    missingSubmissions: 0,
    lateSubmissions: 0,
    attendanceRows: 0,
    gradeRows: 0,
  });
  const [riskRows, setRiskRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadCourses() {
      setLoading(true);
      setError("");
      try {
        const res = await courseService.getProfessorCourses();
        const payload = res?.data;
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        if (!mounted) return;
        setCourses(list);
        if (list.length > 0) setSelectedCourseId(String(list[0].id));
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de charger vos cours.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCourses();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadRisk() {
      if (!selectedCourseId) return;
      setLoading(true);
      setError("");
      try {
        const courseId = Number(selectedCourseId);
        const [studentsRes, gradesRes, attRes, assignRes] = await Promise.all([
          courseService.getStudents(courseId),
          gradeService.getByCourse(courseId),
          attendanceService.getAll({ course_id: courseId, per_page: 200 }),
          assignmentService.getAll({ course_id: courseId, per_page: 200 }),
        ]);

        const students = Array.isArray(studentsRes?.data) ? studentsRes.data : studentsRes?.data?.data || [];
        const grades = Array.isArray(gradesRes?.data) ? gradesRes.data : gradesRes?.data?.data || [];
        const attPayload = attRes?.data;
        const attendances = Array.isArray(attPayload) ? attPayload : attPayload?.data || [];
        const assignPayload = assignRes?.data;
        const assignments = Array.isArray(assignPayload) ? assignPayload : assignPayload?.data || [];

        const now = Date.now();
        const overdueAssignments = assignments.filter((a) => {
          const due = a?.due_date ? new Date(a.due_date).getTime() : null;
          return due && due < now;
        }).length;

        // Load submissions per assignment (real DB), then compute missing/late counts per student
        const submissionsByAssignment = new Map(); // assignmentId -> array
        const submissionsByStudent = new Map(); // studentId -> { submitted: Set(assignmentId), late: Set(assignmentId) }

        const submissionResponses = await Promise.all(
          assignments.map((a) =>
            assignmentService.getSubmissions(a.id).catch(() => ({ data: [] }))
          )
        );
        submissionResponses.forEach((res, idx) => {
          const assignment = assignments[idx];
          const aId = assignment?.id;
          const rows = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
          submissionsByAssignment.set(aId, rows);

          const dueTs = assignment?.due_date ? new Date(assignment.due_date).getTime() : null;
          rows.forEach((sub) => {
            const sid = sub?.student_id ?? sub?.student?.id;
            if (!sid || !aId) return;
            const entry = submissionsByStudent.get(sid) || { submitted: new Set(), late: new Set() };
            entry.submitted.add(aId);
            const submittedTs = sub?.submitted_at ? new Date(sub.submitted_at).getTime() : null;
            if (dueTs && submittedTs && submittedTs > dueTs) entry.late.add(aId);
            submissionsByStudent.set(sid, entry);
          });
        });

        // Pre-index grades and attendance per student
        const gradesByStudent = new Map();
        grades.forEach((g) => {
          const sid = g?.student_id ?? g?.student?.id;
          if (!sid) return;
          const arr = gradesByStudent.get(sid) || [];
          const grade20 = Number(g?.grade);
          arr.push(Number.isFinite(grade20) ? grade20 : null);
          gradesByStudent.set(sid, arr);
        });

        const attByStudent = new Map();
        attendances.forEach((a) => {
          const sid = a?.student_id ?? a?.student?.id;
          if (!sid) return;
          const arr = attByStudent.get(sid) || [];
          arr.push(String(a?.status || "").toLowerCase());
          attByStudent.set(sid, arr);
        });

        const rows = students.map((s) => {
          const sid = s?.id;
          const gList = (sid ? gradesByStudent.get(sid) : []) || [];
          const gAvg = avg(gList.filter((x) => x != null));

          const aList = (sid ? attByStudent.get(sid) : []) || [];
          const total = aList.length;
          const absent = aList.filter((st) => st === "absent").length;
          const late = aList.filter((st) => st === "late").length;
          const attendanceRate = total > 0 ? ((total - absent) / total) * 100 : null;

          const subEntry = (sid ? submissionsByStudent.get(sid) : null) || { submitted: new Set(), late: new Set() };
          const submittedCount = subEntry.submitted.size;
          const lateCount = subEntry.late.size;
          const missingCount = Math.max(assignments.length - submittedCount, 0);

          let riskScore = 0;
          if (gAvg != null && gAvg < 10) riskScore += 2;
          if (attendanceRate != null && attendanceRate < 80) riskScore += 2;
          if (attendanceRate != null && attendanceRate < 60) riskScore += 1;
          if (absent >= 2) riskScore += 1;
          if (missingCount >= 1) riskScore += 1;
          if (missingCount >= 2) riskScore += 1;
          if (lateCount >= 1) riskScore += 1;

          return {
            id: sid,
            name: s?.user?.name || s?.name || `Étudiant #${sid}`,
            email: s?.user?.email || "",
            gradeAvg: gAvg,
            attendanceRate,
            absent,
            late,
            missingSubmissions: missingCount,
            lateSubmissions: lateCount,
            riskScore,
          };
        });

        rows.sort((a, b) => b.riskScore - a.riskScore);

        if (!mounted) return;
        const missingSubmissions = rows.reduce((sum, r) => sum + (r.missingSubmissions || 0), 0);
        const lateSubmissions = rows.reduce((sum, r) => sum + (r.lateSubmissions || 0), 0);
        setCourseStats({
          overdueAssignments,
          totalAssignments: assignments.length,
          missingSubmissions,
          lateSubmissions,
          attendanceRows: attendances.length,
          gradeRows: grades.length,
        });
        setRiskRows(rows);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de calculer les indicateurs de risque.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRisk();
    return () => {
      mounted = false;
    };
  }, [selectedCourseId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return riskRows;
    return riskRows.filter((r) => (r.name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q));
  }, [riskRows, search]);

  const riskBadge = (score) => {
    if (score >= 4) return <Badge variant="error">Élevé</Badge>;
    if (score >= 2) return <Badge variant="warning">Moyen</Badge>;
    return <Badge variant="success">Faible</Badge>;
  };

  if (loading && courses.length === 0) {
    return (
      <AppLayout title="Étudiants à risque">
        <div className="muted-center">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Étudiants à risque">
      <div className="page-header">
        <h2>Étudiants à risque</h2>
        <p>Indicateurs basés sur notes et présences enregistrées dans la base.</p>
      </div>

      {error ? (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Sélection" />
          <div className="p-6 grid md:grid-cols-2 gap-4">
            <Select
              label="Cours"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
            <Input label="Recherche" placeholder="Nom ou email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Signaux cours" />
          <div className="p-6" style={{ display: "grid", gap: 10 }}>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Devoirs en retard</span>
              <Badge variant={courseStats.overdueAssignments > 0 ? "warning" : "success"}>{courseStats.overdueAssignments}</Badge>
            </div>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Total devoirs</span>
              <strong>{courseStats.totalAssignments}</strong>
            </div>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Non soumis (total)</span>
              <strong>{courseStats.missingSubmissions}</strong>
            </div>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Soumis en retard (total)</span>
              <strong>{courseStats.lateSubmissions}</strong>
            </div>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Présences analysées</span>
              <strong>{courseStats.attendanceRows}</strong>
            </div>
            <div className="item-row">
              <span className="item-subtitle" style={{ marginTop: 0 }}>Notes analysées</span>
              <strong>{courseStats.gradeRows}</strong>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Classement risque" subtitle={`${filtered.length} étudiant(s)`} />
        {loading ? (
          <div className="muted-center">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="muted-center">Aucun étudiant trouvé.</div>
        ) : (
          <div className="p-6" style={{ display: "grid", gap: 10 }}>
            {filtered.map((r) => (
              <div className="ui-card compact" key={r.id}>
                <div className="item-row">
                  <div>
                    <div className="item-title">{r.name}</div>
                    <div className="item-subtitle" style={{ marginTop: 4 }}>
                      {r.email || "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {riskBadge(r.riskScore)}
                    <div className="item-subtitle" style={{ marginTop: 6 }}>
                      Score: {r.riskScore}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <div className="ui-card compact">
                    <div className="item-subtitle" style={{ marginTop: 0 }}>Moyenne (sur 20)</div>
                    <div style={{ fontWeight: 900 }}>
                      {r.gradeAvg == null ? "—" : r.gradeAvg.toFixed(2)}
                    </div>
                  </div>
                  <div className="ui-card compact">
                    <div className="item-subtitle" style={{ marginTop: 0 }}>Assiduité</div>
                    <div style={{ fontWeight: 900 }}>
                      {r.attendanceRate == null ? "—" : `${r.attendanceRate.toFixed(0)}%`}
                    </div>
                    <div className="item-subtitle" style={{ marginTop: 6 }}>
                      Absences: {r.absent} • Retards: {r.late}
                    </div>
                  </div>
                  <div className="ui-card compact">
                    <div className="item-subtitle" style={{ marginTop: 0 }}>Devoirs</div>
                    <div style={{ fontWeight: 900 }}>
                      Non soumis: {r.missingSubmissions}
                    </div>
                    <div className="item-subtitle" style={{ marginTop: 6 }}>
                      Retard: {r.lateSubmissions}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppLayout>
  );
}

