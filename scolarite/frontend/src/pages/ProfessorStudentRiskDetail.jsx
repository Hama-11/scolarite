import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { Alert, Badge, Button, Card, CardHeader, Spinner } from "../components/ui";
import { assignmentService, courseService, studentManagementService } from "../services/api";
import "../components/dashboard.css";

function safeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}

export default function ProfessorStudentRiskDetail() {
  const { studentId } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = Number(searchParams.get("course_id") || 0) || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [student, setStudent] = useState(null);
  const [course, setCourse] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]); // flattened for this course

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const sid = Number(studentId);
        const [studentRes, gradesRes, attRes, courseRes] = await Promise.all([
          studentManagementService.getById(sid),
          studentManagementService.getGrades(sid),
          studentManagementService.getAttendance(sid),
          courseId ? courseService.getById(courseId) : Promise.resolve(null),
        ]);

        const st = studentRes?.data;
        const allGrades = safeArray(gradesRes?.data);
        const allAttendances = safeArray(attRes?.data);
        const selectedCourse = courseRes?.data || null;

        if (!mounted) return;
        setStudent(st);
        setCourse(selectedCourse);
        setGrades(courseId ? allGrades.filter((g) => Number(g?.course_id ?? g?.course?.id) === courseId) : allGrades);
        setAttendances(
          courseId ? allAttendances.filter((a) => Number(a?.course_id ?? a?.course?.id) === courseId) : allAttendances
        );
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de charger le détail étudiant.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [studentId, courseId]);

  useEffect(() => {
    let mounted = true;
    async function loadAssignments() {
      if (!courseId) return;
      try {
        const [aRes] = await Promise.all([assignmentService.getAll({ course_id: courseId, per_page: 200 })]);
        const list = safeArray(aRes?.data);
        const submissionResponses = await Promise.all(
          list.map((a) => assignmentService.getSubmissions(a.id).catch(() => ({ data: [] })))
        );
        const flattened = submissionResponses.flatMap((res) => safeArray(res?.data));
        if (!mounted) return;
        setAssignments(list);
        setSubmissions(flattened);
      } catch {
        if (!mounted) return;
        // keep assignments area empty but don't break whole page
        setAssignments([]);
        setSubmissions([]);
      }
    }
    loadAssignments();
    return () => {
      mounted = false;
    };
  }, [courseId]);

  const computed = useMemo(() => {
    const gradeValues = grades
      .map((g) => Number(g?.grade))
      .filter((n) => Number.isFinite(n));
    const gradeAvg = gradeValues.length ? gradeValues.reduce((s, x) => s + x, 0) / gradeValues.length : null;

    const totalAtt = attendances.length;
    const absent = attendances.filter((a) => String(a?.status || "").toLowerCase() === "absent").length;
    const late = attendances.filter((a) => String(a?.status || "").toLowerCase() === "late").length;
    const attendanceRate = totalAtt ? ((totalAtt - absent) / totalAtt) * 100 : null;

    const subByAssignment = new Map();
    submissions.forEach((s) => {
      const aId = s?.assignment_id ?? s?.assignment?.id;
      const sid = s?.student_id ?? s?.student?.id;
      if (!aId || !sid) return;
      if (Number(sid) !== Number(studentId)) return;
      subByAssignment.set(Number(aId), s);
    });

    const now = Date.now();
    const assignmentRows = assignments.map((a) => {
      const dueTs = a?.due_date ? new Date(a.due_date).getTime() : null;
      const sub = subByAssignment.get(Number(a.id)) || null;
      const submittedTs = sub?.submitted_at ? new Date(sub.submitted_at).getTime() : null;
      const isLate = Boolean(dueTs && submittedTs && submittedTs > dueTs);
      const isMissing = !sub && Boolean(dueTs && dueTs < now);
      return {
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        max_score: a.max_score,
        status: sub ? (isLate ? "late" : "submitted") : isMissing ? "missing" : "pending",
        submitted_at: sub?.submitted_at || null,
        score: sub?.score ?? null,
        feedback: sub?.feedback ?? null,
      };
    });

    const missing = assignmentRows.filter((x) => x.status === "missing").length;
    const lateCount = assignmentRows.filter((x) => x.status === "late").length;
    const submitted = assignmentRows.filter((x) => x.status === "submitted" || x.status === "late").length;

    return {
      gradeAvg,
      attendanceRate,
      absent,
      late,
      assignmentRows,
      missing,
      lateCount,
      submitted,
      totalAssignments: assignments.length,
    };
  }, [grades, attendances, assignments, submissions, studentId]);

  if (loading) {
    return (
      <AppLayout title="Détail étudiant">
        <div className="muted-center">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const studentName = student?.user?.name || student?.name || `Étudiant #${studentId}`;
  const studentEmail = student?.user?.email || "";
  const courseLabel = course ? `${course?.name || "Cours"} (${course?.code || "-"})` : courseId ? `Cours #${courseId}` : null;

  return (
    <AppLayout title="Détail étudiant">
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>{studentName}</h2>
            <p>{studentEmail || "—"}{courseLabel ? ` • ${courseLabel}` : ""}</p>
          </div>
          <Link to="/professor/risk">
            <Button variant="outline">← Retour</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{computed.gradeAvg == null ? "—" : computed.gradeAvg.toFixed(2)}</div>
          <div className="stat-label">Moyenne (sur 20)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{computed.attendanceRate == null ? "—" : `${computed.attendanceRate.toFixed(0)}%`}</div>
          <div className="stat-label">Assiduité</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{computed.missing}</div>
          <div className="stat-label">Devoirs manquants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{computed.lateCount}</div>
          <div className="stat-label">Devoirs en retard</div>
        </div>
      </div>

      {!courseId ? (
        <Alert variant="warning" className="mb-6">
          Astuce : ouvrez ce détail depuis “Étudiants à risque” pour filtrer automatiquement sur un cours (`course_id`).
        </Alert>
      ) : null}

      <div className="grid-70-30">
        <Card>
          <CardHeader title="Devoirs (par cours)" subtitle={`${computed.submitted}/${computed.totalAssignments} soumis`} />
          {courseId && computed.totalAssignments === 0 ? (
            <div className="muted-center">Aucun devoir sur ce cours.</div>
          ) : (
            <div className="p-6" style={{ display: "grid", gap: 10 }}>
              {computed.assignmentRows.map((a) => {
                const badge =
                  a.status === "submitted" ? <Badge variant="success">Soumis</Badge> :
                  a.status === "late" ? <Badge variant="warning">Soumis en retard</Badge> :
                  a.status === "missing" ? <Badge variant="error">Non soumis</Badge> :
                  <Badge variant="gray">En attente</Badge>;
                return (
                  <div className="ui-card compact" key={a.id}>
                    <div className="item-row">
                      <div>
                        <div className="item-title">{a.title || `Devoir #${a.id}`}</div>
                        <div className="item-subtitle" style={{ marginTop: 4 }}>
                          Échéance : {formatDateTime(a.due_date)} • Max : {a.max_score ?? "—"}
                        </div>
                        {a.submitted_at ? (
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            Soumis : {formatDateTime(a.submitted_at)}
                          </div>
                        ) : null}
                        {a.score != null ? (
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            Note : {a.score}
                          </div>
                        ) : null}
                        {a.feedback ? (
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            Feedback : {a.feedback}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ textAlign: "right" }}>{badge}</div>
                    </div>
                  </div>
                );
              })}
              {!courseId ? <div className="muted-center">Sélectionnez un cours pour voir les devoirs.</div> : null}
            </div>
          )}
        </Card>

        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <CardHeader title="Notes" subtitle={`${grades.length} ligne(s)`} />
            {grades.length === 0 ? (
              <div className="muted-center">Aucune note trouvée.</div>
            ) : (
              <div className="p-6" style={{ display: "grid", gap: 10 }}>
                {grades.slice(0, 12).map((g) => (
                  <div className="ui-card compact" key={g.id}>
                    <div className="item-row">
                      <div>
                        <div className="item-title">{g.type || "Évaluation"}</div>
                        <div className="item-subtitle" style={{ marginTop: 4 }}>
                          {formatDate(g.date || g.created_at)}
                        </div>
                      </div>
                      <Badge variant={Number(g.grade) >= 10 ? "success" : "warning"}>
                        {Number(g.grade).toFixed(2)}/20
                      </Badge>
                    </div>
                    {g.description ? <div className="item-subtitle" style={{ marginTop: 6 }}>{g.description}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Présences" subtitle={`${attendances.length} ligne(s)`} />
            {attendances.length === 0 ? (
              <div className="muted-center">Aucune présence/absence trouvée.</div>
            ) : (
              <div className="p-6" style={{ display: "grid", gap: 10 }}>
                {attendances.slice(0, 12).map((a) => {
                  const status = String(a.status || "").toLowerCase();
                  const badge =
                    status === "present" ? <Badge variant="success">Présent</Badge> :
                    status === "late" ? <Badge variant="warning">Retard</Badge> :
                    status === "excused" ? <Badge variant="info">Excusé</Badge> :
                    <Badge variant="error">Absent</Badge>;
                  return (
                    <div className="ui-card compact" key={a.id}>
                      <div className="item-row">
                        <div>
                          <div className="item-title">{formatDate(a.date || a.created_at)}</div>
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            {a.remarks || "—"}
                          </div>
                        </div>
                        {badge}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

