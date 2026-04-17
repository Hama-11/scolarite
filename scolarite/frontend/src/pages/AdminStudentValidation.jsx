import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Textarea, Select, Badge, Alert, Spinner } from "../components/ui";
import { adminLifecycleService } from "../services/api";
import "../components/dashboard.css";

const SLOTS = [
  { key: "payment_proof", label: "Preuve de paiement" },
  { key: "certificate_achievement", label: "Certificat" },
  { key: "academic_transcript", label: "Relevé" },
];

function statusBadge(status) {
  if (!status) return <Badge variant="gray">—</Badge>;
  const s = String(status).toLowerCase();
  if (s === "accepted") return <Badge variant="success">{status}</Badge>;
  if (s === "rejected") return <Badge variant="error">{status}</Badge>;
  if (s === "pending") return <Badge variant="warning">{status}</Badge>;
  return <Badge>{status}</Badge>;
}

export default function AdminStudentValidation() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [personnelDecision, setPersonnelDecision] = useState("accepted");
  const [personnelComment, setPersonnelComment] = useState("");
  const [docSlot, setDocSlot] = useState("payment_proof");
  const [docDecision, setDocDecision] = useState("accepted");
  const [docComment, setDocComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  const loadList = useCallback(async () => {
    setError("");
    try {
      const res = await adminLifecycleService.getPendingStudents({ per_page: 50 });
      const rows = res.data?.data ?? res.data;
      setList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.response?.data?.message || "Impossible de charger la liste.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openDetail(id) {
    setSelectedId(id);
    setDetail(null);
    setError("");
    try {
      const res = await adminLifecycleService.getStudent(id);
      setDetail(res.data?.student);
    } catch (e) {
      setError(e.response?.data?.message || "Chargement impossible.");
    }
  }

  async function run(fn) {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await fn();
      setMsg("Enregistré.");
      if (selectedId) await openDetail(selectedId);
      await loadList();
    } catch (e) {
      setError(e.response?.data?.message || "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Validation dossiers étudiants">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Validation dossiers étudiants">
      <div className="page-header">
        <h2>Validation des dossiers</h2>
        <p>Dossiers en attente ou pièces à valider (conception UML).</p>
      </div>
      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
      {msg ? <Alert variant="success" className="mb-4">{msg}</Alert> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Liste" />
          <div className="p-4 max-h-[70vh] overflow-auto">
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun dossier à traiter.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`w-full text-left p-3 rounded border ${selectedId === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => openDetail(s.id)}
                    >
                      <div className="font-medium">{s.user?.name || s.name || `Étudiant #${s.id}`}</div>
                      <div className="text-xs text-gray-500">{s.user?.email}</div>
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {statusBadge(s.overall_status)}
                        <span className="text-xs text-gray-500">pièces</span>
                        {statusBadge(s.payment_proof_status)}
                        {statusBadge(s.certificate_achievement_status)}
                        {statusBadge(s.academic_transcript_status)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Détail & actions" />
          <div className="p-4">
            {!selectedId ? (
              <p className="text-sm text-gray-500">Sélectionnez un étudiant.</p>
            ) : !detail ? (
              <Spinner />
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold">{detail.user?.name}</h4>
                  <p className="text-sm text-gray-600">{detail.user?.email}</p>
                  <p className="text-sm mt-2">Statut global : {statusBadge(detail.overall_status)}</p>
                  <p className="text-sm">Infos perso : {statusBadge(detail.personnel_info_status)}</p>
                  {detail.validation_comment ? (
                    <p className="text-sm mt-2 p-2 bg-amber-50 border rounded">{detail.validation_comment}</p>
                  ) : null}
                </div>

                <div className="border-t pt-4">
                  <h5 className="text-sm font-semibold mb-2">Infos personnelles (validation)</h5>
                  <div className="grid gap-2">
                    <Select label="Décision" value={personnelDecision} onChange={(e) => setPersonnelDecision(e.target.value)}>
                      <option value="accepted">Accepter</option>
                      <option value="rejected">Refuser</option>
                    </Select>
                    <Textarea label="Commentaire (obligatoire si refus)" rows={2} value={personnelComment} onChange={(e) => setPersonnelComment(e.target.value)} />
                    <Button
                      loading={busy}
                      onClick={() =>
                        run(() =>
                          adminLifecycleService.reviewPersonnel(detail.id, {
                            decision: personnelDecision,
                            comment: personnelComment || null,
                          })
                        )
                      }
                    >
                      Valider infos personnelles
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h5 className="text-sm font-semibold mb-2">Pièce jointe</h5>
                  <div className="grid gap-2">
                    <Select label="Type" value={docSlot} onChange={(e) => setDocSlot(e.target.value)}>
                      {SLOTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label} — {detail[`${s.key}_path`] ? "fichier présent" : "aucun fichier"}
                        </option>
                      ))}
                    </Select>
                    <Select label="Décision" value={docDecision} onChange={(e) => setDocDecision(e.target.value)}>
                      <option value="accepted">Accepter</option>
                      <option value="rejected">Refuser</option>
                    </Select>
                    <Textarea label="Commentaire" rows={2} value={docComment} onChange={(e) => setDocComment(e.target.value)} />
                    <Button
                      loading={busy}
                      onClick={() =>
                        run(() =>
                          adminLifecycleService.reviewDocument(detail.id, {
                            slot: docSlot,
                            decision: docDecision,
                            comment: docComment || null,
                          })
                        )
                      }
                    >
                      Enregistrer la pièce
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-wrap gap-2">
                  <Button variant="success" loading={busy} onClick={() => run(() => adminLifecycleService.acceptAll(detail.id))}>
                    Tout accepter (dossier complet)
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <h5 className="text-sm font-semibold mb-2">Rejet global avec commentaire</h5>
                  <Textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} />
                  <Button
                    className="mt-2"
                    variant="danger"
                    loading={busy}
                    onClick={() =>
                      run(() => adminLifecycleService.rejectProfile(detail.id, { comment: rejectComment }))
                    }
                  >
                    Envoyer le rejet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
