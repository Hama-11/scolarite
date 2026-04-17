import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, CardHeader, Button, Input, Textarea, Select, Badge, Alert, Spinner } from "../components/ui";
import {
  studentLifecycleService,
  gradeService,
} from "../services/api";
import "../components/dashboard.css";

const DOC_SLOTS = [
  { value: "payment_proof", label: "Preuve de paiement" },
  { value: "certificate_achievement", label: "Certificat / diplôme" },
  { value: "academic_transcript", label: "Relevé de notes" },
];

function statusBadge(status) {
  if (!status) return <Badge variant="gray">—</Badge>;
  const s = String(status).toLowerCase();
  if (s === "accepted") return <Badge variant="success">{status}</Badge>;
  if (s === "rejected") return <Badge variant="error">{status}</Badge>;
  if (s === "pending") return <Badge variant="warning">{status}</Badge>;
  return <Badge variant="info">{status}</Badge>;
}

export default function StudentDossier() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [student, setStudent] = useState(null);
  const [parent, setParent] = useState({});
  const [personal, setPersonal] = useState({});
  const [uploadSlot, setUploadSlot] = useState("payment_proof");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState([]);
  const [docType, setDocType] = useState("transcript");
  const [disputeGradeId, setDisputeGradeId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await studentLifecycleService.get();
      const s = res.data?.student;
      setStudent(s);
      setPersonal({
        name: s?.name || "",
        phone: s?.phone || "",
        address: s?.address || "",
        place_of_birth: s?.place_of_birth || "",
        date_of_birth: s?.date_of_birth || "",
        gender: s?.gender || "",
      });
      const p = s?.parent_info || s?.parentInfo;
      if (p) {
        setParent({
          father_first_name: p.father_first_name || "",
          father_last_name: p.father_last_name || "",
          father_phone: p.father_phone || "",
          father_job: p.father_job || "",
          mother_first_name: p.mother_first_name || "",
          mother_last_name: p.mother_last_name || "",
          mother_phone: p.mother_phone || "",
          mother_job: p.mother_job || "",
          parents_relationship: p.parents_relationship || "",
        });
      }
    } catch (e) {
      setError(e.response?.data?.message || "Impossible de charger le dossier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    gradeService
      .getMyGrades()
      .then((res) => {
        const d = res.data?.data ?? res.data;
        setGrades(Array.isArray(d) ? d : []);
      })
      .catch(() => setGrades([]));
  }, []);

  async function savePersonal(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await studentLifecycleService.updatePersonal(personal);
      setMsg("Informations personnelles enregistrées.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur à l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function saveParents(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      await studentLifecycleService.updateParents(parent);
      setMsg("Informations parents enregistrées.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur à l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez un fichier (PDF ou image, max 5 Mo).");
      return;
    }
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const fd = new FormData();
      fd.append("slot", uploadSlot);
      fd.append("file", file);
      await studentLifecycleService.uploadDocument(fd);
      setMsg("Fichier envoyé.");
      setFile(null);
      await load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(
        errs ? Object.values(errs).flat().join(" ") : err.response?.data?.message || "Échec du téléversement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitValidation() {
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await studentLifecycleService.submitValidation();
      setMsg("Dossier soumis pour validation administrative.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de la soumission.");
    } finally {
      setSaving(false);
    }
  }

  async function createOfficialRequest(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await studentLifecycleService.createDocumentRequest({
        document_type: docType,
        copies: 1,
      });
      setMsg("Demande enregistrée.");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function createDispute(e) {
    e.preventDefault();
    if (!disputeGradeId || !disputeReason.trim()) {
      setError("Choisissez une note et indiquez un motif.");
      return;
    }
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await studentLifecycleService.createGradeDispute({
        grade_id: Number(disputeGradeId),
        reason: disputeReason,
      });
      setMsg("Contestation envoyée.");
      setDisputeReason("");
    } catch (err) {
      setError(err.response?.data?.message || "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Mon dossier scolaire">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mon dossier scolaire">
      <div className="page-header">
        <h2>Mon dossier scolaire</h2>
        <p>Complétez vos informations, vos pièces et soumettez votre dossier pour validation.</p>
      </div>

      {error ? <Alert variant="error" className="mb-4">{error}</Alert> : null}
      {msg ? <Alert variant="success" className="mb-4">{msg}</Alert> : null}

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader title="Statut du dossier" subtitle="Vue d’ensemble" />
          <div className="p-6 flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-600">Statut global :</span>
            {statusBadge(student?.overall_status)}
            <span className="text-sm text-gray-600 ml-4">Infos personnelles :</span>
            {statusBadge(student?.personnel_info_status)}
            {student?.validation_comment ? (
              <p className="w-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                Commentaire administration : {student.validation_comment}
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Informations personnelles" />
          <form className="p-6 grid md:grid-cols-2 gap-2" onSubmit={savePersonal}>
            <Input label="Nom affiché" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
            <Input label="Téléphone" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
            <Input label="Lieu de naissance" value={personal.place_of_birth} onChange={(e) => setPersonal({ ...personal, place_of_birth: e.target.value })} />
            <Input label="Date de naissance" type="date" value={personal.date_of_birth?.slice?.(0, 10) || personal.date_of_birth || ""} onChange={(e) => setPersonal({ ...personal, date_of_birth: e.target.value })} />
            <Input label="Genre" value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })} />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
                value={personal.address}
                onChange={(e) => setPersonal({ ...personal, address: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={saving}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Parents / tuteurs" />
          <form className="p-6 grid md:grid-cols-2 gap-2" onSubmit={saveParents}>
            <Input label="Prénom père" value={parent.father_first_name} onChange={(e) => setParent({ ...parent, father_first_name: e.target.value })} />
            <Input label="Nom père" value={parent.father_last_name} onChange={(e) => setParent({ ...parent, father_last_name: e.target.value })} />
            <Input label="Tél. père" value={parent.father_phone} onChange={(e) => setParent({ ...parent, father_phone: e.target.value })} />
            <Input label="Profession père" value={parent.father_job} onChange={(e) => setParent({ ...parent, father_job: e.target.value })} />
            <Input label="Prénom mère" value={parent.mother_first_name} onChange={(e) => setParent({ ...parent, mother_first_name: e.target.value })} />
            <Input label="Nom mère" value={parent.mother_last_name} onChange={(e) => setParent({ ...parent, mother_last_name: e.target.value })} />
            <Input label="Tél. mère" value={parent.mother_phone} onChange={(e) => setParent({ ...parent, mother_phone: e.target.value })} />
            <Input label="Profession mère" value={parent.mother_job} onChange={(e) => setParent({ ...parent, mother_job: e.target.value })} />
            <Input label="Lien de parenté" className="md:col-span-2" value={parent.parents_relationship} onChange={(e) => setParent({ ...parent, parents_relationship: e.target.value })} />
            <div className="md:col-span-2">
              <Button type="submit" loading={saving}>
                Enregistrer les parents
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Pièces justificatives" subtitle="PDF ou image, max 5 Mo" />
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
              {DOC_SLOTS.map((d) => (
                <div key={d.value} className="p-3 bg-gray-50 rounded border">
                  <div className="font-medium">{d.label}</div>
                  <div className="mt-1">{statusBadge(student?.[`${d.value}_status`])}</div>
                </div>
              ))}
            </div>
            <form className="flex flex-col md:flex-row gap-3 items-end" onSubmit={upload}>
              <Select label="Type de pièce" value={uploadSlot} onChange={(e) => setUploadSlot(e.target.value)}>
                {DOC_SLOTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <div className="mb-4 w-full md:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier</label>
                <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" loading={saving}>
                Téléverser
              </Button>
            </form>
          </div>
        </Card>

        <Card>
          <CardHeader title="Soumission" />
          <div className="p-6 flex flex-wrap gap-3 items-center">
            <Button variant="success" onClick={submitValidation} loading={saving} disabled={student?.overall_status === "pending"}>
              Soumettre pour validation
            </Button>
            {student?.overall_status === "pending" ? (
              <span className="text-sm text-gray-600">En attente de traitement par l’administration.</span>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Demande de documents administratifs" subtitle="Attestation, relevé, etc." />
          <form className="p-6 flex flex-wrap gap-3 items-end" onSubmit={createOfficialRequest}>
            <Select label="Type de document" value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="transcript">Relevé de notes</option>
              <option value="certificate">Certificat de scolarité</option>
              <option value="attestation">Attestation</option>
              <option value="other">Autre</option>
            </Select>
            <Button type="submit" loading={saving}>
              Envoyer la demande
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Contestation d’une note" />
          <form className="p-6 grid md:grid-cols-2 gap-4" onSubmit={createDispute}>
            <Select label="Note concernée" value={disputeGradeId} onChange={(e) => setDisputeGradeId(e.target.value)}>
              <option value="">— Choisir —</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  #{g.id} — {g.type} — {g.grade} ({g.date})
                </option>
              ))}
            </Select>
            <div className="md:col-span-2">
              <Textarea label="Motif" rows={4} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} required />
            </div>
            <Button type="submit" loading={saving}>
              Envoyer la contestation
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
