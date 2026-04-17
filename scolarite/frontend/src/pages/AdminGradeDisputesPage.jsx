import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Input, Select, Badge, Alert, Spinner, Textarea } from "../components/ui";
import { adminLifecycleService } from "../services/api";
import "../components/dashboard.css";

export default function AdminGradeDisputesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminLifecycleService.getGradeDisputes({ per_page: 50 });
      setRows(res.data?.data ?? res.data ?? []);
    } catch (e) {
      setError(e.response?.data?.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id, payload) {
    setBusy(true);
    setError("");
    try {
      await adminLifecycleService.resolveGradeDispute(id, payload);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Litiges de notes">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  const list = Array.isArray(rows) ? rows : [];

  return (
    <AppLayout title="Litiges de notes">
      <div className="page-header">
        <h2>Litiges de notes</h2>
        <p>Traitement des contestations (administration).</p>
      </div>
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}

      <div className="space-y-4">
        {list.length === 0 ? (
          <Card>
            <p className="p-6 text-gray-500">Aucun litige.</p>
          </Card>
        ) : (
          list.map((r) => <DisputeCard key={r.id} row={r} disabled={busy} onResolve={resolve} />)
        )}
      </div>
    </AppLayout>
  );
}

function DisputeCard({ row, disabled, onResolve }) {
  const [decision, setDecision] = useState("accepted");
  const [comment, setComment] = useState("");
  const [newGrade, setNewGrade] = useState(row.grade?.grade ?? "");

  return (
    <Card>
      <CardHeader
        title={`Litige #${row.id}`}
        subtitle={`${row.student?.user?.name || "Etudiant"} - note #${row.grade_id}`}
      />
      <div className="p-6 space-y-3 text-sm">
        <p>
          <Badge variant={row.status === "pending" ? "warning" : row.status === "resolved" ? "success" : "gray"}>
            {row.status}
          </Badge>
        </p>
        <p className="text-gray-700">
          <strong>Motif :</strong> {row.reason}
        </p>
        {row.grade ? (
          <p className="text-gray-600">
            Note actuelle : {row.grade.grade} ({row.grade.type}) - cours #{row.grade.course_id}
          </p>
        ) : null}
        <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
          <Select label="Decision" value={decision} onChange={(e) => setDecision(e.target.value)} disabled={disabled}>
            <option value="accepted">Accepter (ajuster la note)</option>
            <option value="rejected">Rejeter la contestation</option>
          </Select>
          <Input
            label="Nouvelle note (si accepte)"
            type="number"
            step="0.01"
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            disabled={disabled}
          />
          <div className="md:col-span-2">
            <Textarea label="Commentaire administration" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} disabled={disabled} />
          </div>
          <Button
            loading={disabled}
            onClick={() =>
              onResolve(row.id, {
                status: decision,
                director_comment: comment || null,
                new_grade: decision === "accepted" && newGrade !== "" ? Number(newGrade) : undefined,
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}
