import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Alert } from "../components/ui";
import { modernizationService } from "../services/api";

const demos = [
  {
    label: "Créer demande d'inscription pédagogique",
    run: () => modernizationService.submitEnrollmentRequest({ student_id: 1, course_id: 1 }),
  },
  {
    label: "Générer proposition emploi du temps",
    run: () => modernizationService.optimizeSchedule({}),
  },
  {
    label: "Créer version sujet examen",
    run: () => modernizationService.createExamSubjectVersion({ course_id: 1, title: "Sujet Demo", content: "Contenu de test" }),
  },
  {
    label: "Générer export JSON",
    run: () => modernizationService.exportData({ type: "students", format: "json" }),
  },
  {
    label: "Créer règle métier",
    run: () => modernizationService.createRule({ name: "Moyenne pondérée", domain: "grades", conditions: [{ op: ">=", left: "average", right: 10 }], actions: [{ type: "pass_year" }] }),
  },
  {
    label: "Créer formulaire dynamique",
    run: () => modernizationService.createDynamicForm({ name: "Demande administrative", slug: "demande-adm", schema: [{ name: "objet", type: "text", required: true }] }),
  },
  {
    label: "Créer ticket maintenance",
    run: () => modernizationService.createMaintenanceTicket({ title: "Vidéoprojecteur en panne", priority: "high" }),
  },
  {
    label: "Créer projet recherche",
    run: () => modernizationService.createResearchProject({ title: "IA pédagogique", abstract: "Projet de suivi intelligent" }),
  },
];

export default function ModernizationHub() {
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function execute(item) {
    setBusy(item.label);
    setError("");
    setResult(null);
    try {
      const res = await item.run();
      setResult({ label: item.label, data: res?.data ?? {} });
    } catch (e) {
      setError(e?.response?.data?.message || "Action non exécutée.");
    } finally {
      setBusy("");
    }
  }

  return (
    <AppLayout title="Modernisation">
      <div className="page-header">
        <h2>Roadmap Modernisation - Hub d'exécution</h2>
        <p>Ce panneau centralise les workflows des axes 1 à 8 via les endpoints v2.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {result && (
        <Alert variant="success">
          {result.label} exécuté.
        </Alert>
      )}

      <Card>
        <CardHeader title="Actions rapides roadmap" />
        <div style={{ display: "grid", gap: 10 }}>
          {demos.map((item) => (
            <Button key={item.label} onClick={() => execute(item)} disabled={!!busy} variant="outline">
              {busy === item.label ? "Traitement..." : item.label}
            </Button>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
