import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Badge, Alert, Spinner } from "../components/ui";
import { professorSchoolService } from "../services/api";
import "../components/dashboard.css";

export default function ProfessorSchoolClasses() {
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClasses = useCallback(async () => {
    setError("");
    try {
      const res = await professorSchoolService.getMyClasses();
      setClasses(res.data?.classes ?? []);
    } catch (e) {
      setError(e.response?.data?.message || "Impossible de charger vos classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  async function openStudents(classId) {
    setSelected(classId);
    setStudents(null);
    try {
      const res = await professorSchoolService.getClassStudents(classId, { per_page: 100 });
      setStudents(res.data?.data ?? res.data ?? []);
    } catch (e) {
      setError(e.response?.data?.message || "Liste étudiants inaccessible.");
    }
  }

  if (loading) {
    return (
      <AppLayout title="Mes classes">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mes classes (scolaires)">
      <div className="page-header">
        <h2>Mes classes</h2>
        <p>Classes qui vous sont assignées dans le module « classes scolaires ».</p>
      </div>
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Classes assignées" />
          <ul className="p-4 space-y-2">
            {classes.length === 0 ? (
              <li className="text-sm text-gray-500">Aucune classe assignée.</li>
            ) : (
              classes.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`w-full text-left p-3 rounded border ${selected === c.id ? "border-indigo-500 bg-indigo-50" : "border-gray-200"}`}
                    onClick={() => openStudents(c.id)}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {c.students_count != null ? <Badge variant="info">{c.students_count} étudiant(s)</Badge> : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Étudiants de la classe" subtitle={selected ? `Classe #${selected}` : ""} />
          <div className="p-4 max-h-[480px] overflow-auto">
            {!selected ? (
              <p className="text-sm text-gray-500">Sélectionnez une classe.</p>
            ) : students === null ? (
              <Spinner />
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun étudiant.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {students.map((s) => (
                  <li key={s.id} className="p-2 border rounded">
                    {s.user?.name || s.name} — {s.user?.email || s.matricule || `#${s.id}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
