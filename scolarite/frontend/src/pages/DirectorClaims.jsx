import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { directorService } from "../services/api";
import { Alert, Button, Card, CardHeader, Input, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui";

export default function DirectorClaims() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("grade_disputes");
  const [status, setStatus] = useState("");

  const [gradeDisputes, setGradeDisputes] = useState([]);
  const [docRequests, setDocRequests] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "grade_disputes") {
        const res = await directorService.getGradeDisputes({ status: status || undefined });
        const payload = res?.data;
        setGradeDisputes(Array.isArray(payload?.data) ? payload.data : []);
      } else {
        const res = await directorService.getDocumentRequests({ status: status || undefined });
        const payload = res?.data;
        setDocRequests(Array.isArray(payload?.data) ? payload.data : []);
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les réclamations.");
    } finally {
      setLoading(false);
    }
  }, [tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolveDispute(id, newStatus) {
    setError("");
    try {
      await directorService.resolveGradeDispute(id, { status: newStatus });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Action impossible.");
    }
  }

  async function updateDocRequest(id, newStatus) {
    setError("");
    try {
      await directorService.updateDocumentRequest(id, { status: newStatus });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Action impossible.");
    }
  }

  return (
    <AppLayout title="Réclamations">
      <div className="page-header header-row">
        <div>
          <h2>Gestion des réclamations</h2>
          <p>Traiter les demandes des étudiants (notes, absences, documents...).</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={load}>Actualiser</Button>
        </div>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="mb-4">
        <CardHeader title="Filtres" />
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select label="Type" value={tab} onChange={(e) => setTab(e.target.value)}>
            <option value="grade_disputes">Réclamations notes</option>
            <option value="doc_requests">Demandes documents</option>
          </Select>
          <Input label="Statut (optionnel)" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="pending / resolved / rejected ..." />
          <div className="flex items-end">
            <Button variant="secondary" onClick={load} className="w-full">Appliquer</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={tab === "grade_disputes" ? "Réclamations notes" : "Demandes documents"} />
        <div className="p-4 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner size="lg" /></div>
          ) : tab === "grade_disputes" ? (
            gradeDisputes.length === 0 ? (
              <div className="muted-center">Aucune réclamation.</div>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Étudiant</TableHeader>
                    <TableHeader>Cours</TableHeader>
                    <TableHeader>Statut</TableHeader>
                    <TableHeader>Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gradeDisputes.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d?.student?.user?.name || `#${d.student_id}`}</TableCell>
                      <TableCell>{d?.grade?.course?.name || `#${d.grade_id}`}</TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" onClick={() => resolveDispute(d.id, "accepted")}>Accepter</Button>
                          <Button size="sm" variant="destructive" onClick={() => resolveDispute(d.id, "rejected")}>Refuser</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : docRequests.length === 0 ? (
            <div className="muted-center">Aucune demande.</div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Étudiant</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader>Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {docRequests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r?.student?.user?.name || `#${r.student_id}`}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => updateDocRequest(r.id, "processing")}>En traitement</Button>
                        <Button size="sm" variant="success" onClick={() => updateDocRequest(r.id, "ready")}>Prêt</Button>
                        <Button size="sm" variant="destructive" onClick={() => updateDocRequest(r.id, "rejected")}>Rejeter</Button>
                      </div>
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

