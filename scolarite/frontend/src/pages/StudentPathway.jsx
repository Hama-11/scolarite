import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Spinner, Alert, Select } from "../components/ui";
import { courseService, gradeService } from "../services/api";
import "../components/dashboard.css";

function normalizeOn20(value, maxValue) {
  const v = Number(value ?? 0);
  const max = Number(maxValue ?? 20);
  if (!Number.isFinite(v) || !Number.isFinite(max) || max <= 0) return 0;
  return (v / max) * 20;
}

function computeCourseAverageOn20(grades) {
  if (!Array.isArray(grades) || grades.length === 0) return null;
  const vals = grades.map((g) => normalizeOn20(g?.value ?? g?.grade ?? 0, g?.max_value ?? 20));
  const sum = vals.reduce((s, x) => s + x, 0);
  return vals.length ? sum / vals.length : null;
}

export default function StudentPathway() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [semesterFilter, setSemesterFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [cRes, gRes] = await Promise.all([courseService.getMyCourses(), gradeService.getMyGrades()]);
        const cPayload = cRes?.data;
        const courseList = Array.isArray(cPayload) ? cPayload : cPayload?.data || [];
        const gPayload = gRes?.data;
        const gradeList = Array.isArray(gPayload) ? gPayload : gPayload?.data || [];

        if (!mounted) return;
        setCourses(courseList);
        setGrades(gradeList);
      } catch (e) {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Impossible de charger le parcours académique.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const byCourseId = useMemo(() => {
    const map = new Map();
    grades.forEach((g) => {
      const courseId = g?.course_id ?? g?.course?.id;
      if (!courseId) return;
      const arr = map.get(courseId) || [];
      arr.push(g);
      map.set(courseId, arr);
    });
    return map;
  }, [grades]);

  const enrichedCourses = useMemo(() => {
    return courses.map((c) => {
      const courseGrades = byCourseId.get(c.id) || [];
      const avg = computeCourseAverageOn20(courseGrades);
      const passed = avg != null ? avg >= 10 : false;
      return { ...c, _avg20: avg, _passed: passed };
    });
  }, [courses, byCourseId]);

  const filtered = useMemo(() => {
    if (semesterFilter === "all") return enrichedCourses;
    const sem = Number(semesterFilter);
    return enrichedCourses.filter((c) => Number(c?.semester) === sem);
  }, [enrichedCourses, semesterFilter]);

  const grouped = useMemo(() => {
    const buckets = new Map();
    filtered.forEach((c) => {
      const semNumber = Number(c?.module?.semester?.number ?? c?.semester ?? 0);
      const semName = c?.module?.semester?.name;
      const key = semNumber ? `S${semNumber}` : semName || "Autre";
      const arr = buckets.get(key) || [];
      arr.push(c);
      buckets.set(key, arr);
    });
    // stable order: S1, S2, then others alpha
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      const aNum = /^S(\d+)$/.exec(a)?.[1];
      const bNum = /^S(\d+)$/.exec(b)?.[1];
      if (aNum && bNum) return Number(aNum) - Number(bNum);
      if (aNum) return -1;
      if (bNum) return 1;
      return String(a).localeCompare(String(b));
    });
    return { buckets, keys };
  }, [filtered]);

  const progress = useMemo(() => {
    const totalCredits = enrichedCourses.reduce((sum, c) => sum + Number(c?.credits || 0), 0);
    const acquiredCredits = enrichedCourses
      .filter((c) => c._passed)
      .reduce((sum, c) => sum + Number(c?.credits || 0), 0);
    const remaining = Math.max(totalCredits - acquiredCredits, 0);
    return { totalCredits, acquiredCredits, remaining };
  }, [enrichedCourses]);

  if (loading) {
    return (
      <AppLayout title="Parcours académique">
        <div className="muted-center">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Parcours académique">
      <div className="page-header">
        <h2>Parcours académique</h2>
        <p>Crédits acquis, modules validés/restants, et vos moyennes par cours.</p>
      </div>

      {error ? (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{progress.acquiredCredits}</div>
          <div className="stat-label">Crédits acquis</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{progress.remaining}</div>
          <div className="stat-label">Crédits restants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{progress.totalCredits}</div>
          <div className="stat-label">Crédits totaux</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{enrichedCourses.filter((c) => c._passed).length}</div>
          <div className="stat-label">Cours validés</div>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader title="Filtrer" />
        <div className="p-6">
          <Select
            label="Semestre"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="all">Tous</option>
            <option value="1">Semestre 1</option>
            <option value="2">Semestre 2</option>
          </Select>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 16 }}>
        {grouped.keys.map((key) => {
          const items = grouped.buckets.get(key) || [];
          if (!items.length) return null;
          const title = /^S(\d+)$/.test(key) ? `Semestre ${key.slice(1)}` : key;
          return (
            <Card key={key}>
              <CardHeader title={title} subtitle={`${items.length} cours`} />
              <div className="p-6" style={{ display: "grid", gap: 10 }}>
                {items.map((c) => (
                  <div className="ui-card compact" key={c.id}>
                    <div className="item-row">
                      <div>
                        <div className="item-title">{c?.module?.name || c?.name || "Cours"}</div>
                        <div className="item-subtitle" style={{ marginTop: 4 }}>
                          {(c?.module?.code || c?.code || "—") + " • " + Number(c?.credits || 0) + " crédits"}
                        </div>
                        {c?.name && c?.module?.name && c.name !== c.module.name ? (
                          <div className="item-subtitle" style={{ marginTop: 4 }}>
                            Cours: {c.name}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {c._avg20 == null ? (
                          <Badge variant="gray">Pas de note</Badge>
                        ) : (
                          <Badge variant={c._avg20 >= 10 ? "success" : "warning"}>
                            Moyenne {c._avg20.toFixed(2)}/20
                          </Badge>
                        )}
                        <div className="item-subtitle" style={{ marginTop: 6 }}>
                          {c._passed ? "Validé" : c._avg20 == null ? "En cours" : "Non validé"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        {enrichedCourses.length === 0 ? (
          <Card>
            <div className="muted-center">Aucun cours trouvé pour votre compte.</div>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}

