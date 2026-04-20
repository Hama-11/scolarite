import { useCallback, useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { scholarshipService, adminService } from "../services/api";
import { Card, CardHeader, Button, Badge, Alert, Spinner, Input } from "../components/ui";
import "../components/dashboard.css";

const TYPE_LABELS = {
  full: "Bourse complète",
  partial: "Partielle",
  merit: "Au mérite",
  need_based: "Selon besoins",
};

const STATUS_LABELS = {
  pending: "En attente",
  approved: "Acceptée",
  rejected: "Refusée",
  waitlisted: "Liste d’attente",
};

function formatMoney(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return "—";
  }
}

export default function Scholarships() {
  const { isAdmin, isStudent, isProfessor, canonicalRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("offers");

  const [available, setAvailable] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [applyFor, setApplyFor] = useState(null);
  const [motivation, setMotivation] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "merit",
    amount: "",
    academic_year_id: "",
    deadline: "",
    duration_months: "",
    eligibility_criteria: "",
    is_active: true,
  });
  const [createLoading, setCreateLoading] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [appsByScholarship, setAppsByScholarship] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});

  const loadStudent = useCallback(async () => {
    const [av, mine] = await Promise.all([
      scholarshipService.getAvailable(),
      scholarshipService.getMyApplications(),
    ]);
    const avPayload = av?.data;
    const minePayload = mine?.data;
    setAvailable(Array.isArray(avPayload) ? avPayload : avPayload?.data || []);
    setMyApps(Array.isArray(minePayload) ? minePayload : minePayload?.data || []);
  }, []);

  const loadAdmin = useCallback(async () => {
    const [list, years] = await Promise.all([
      scholarshipService.getAll({ per_page: 50 }),
      adminService.getAcademicYears({ per_page: 50 }),
    ]);
    const payload = list.data;
    setAdminList(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
    const yp = years.data;
    setAcademicYears(Array.isArray(yp?.data) ? yp.data : Array.isArray(yp) ? yp : []);
  }, []);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      if (isAdmin()) await loadAdmin();
      if (isStudent()) await loadStudent();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les bourses.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isStudent, loadAdmin, loadStudent]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleApply(e) {
    e.preventDefault();
    if (!applyFor || !motivation.trim()) return;
    setApplyLoading(true);
    setError("");
    try {
      await scholarshipService.apply(applyFor.id, { motivation_letter: motivation.trim() });
      setApplyFor(null);
      setMotivation("");
      await loadStudent();
    } catch (e) {
      setError(e?.response?.data?.message || "Candidature refusée.");
    } finally {
      setApplyLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setError("");
    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        type: createForm.type,
        amount: Number(createForm.amount),
        deadline: createForm.deadline,
        is_active: createForm.is_active,
        eligibility_criteria: createForm.eligibility_criteria.trim() || null,
        academic_year_id: createForm.academic_year_id ? Number(createForm.academic_year_id) : null,
        duration_months: createForm.duration_months ? Number(createForm.duration_months) : null,
      };
      await scholarshipService.create(payload);
      setShowCreate(false);
      setCreateForm({
        name: "",
        description: "",
        type: "merit",
        amount: "",
        academic_year_id: "",
        deadline: "",
        duration_months: "",
        eligibility_criteria: "",
        is_active: true,
      });
      await loadAdmin();
    } catch (e) {
      const msg = e?.response?.data?.message;
      const errs = e?.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : msg || "Création impossible.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function toggleApplications(scholarshipId) {
    if (expandedId === scholarshipId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(scholarshipId);
    if (appsByScholarship[scholarshipId]) return;
    try {
      const res = await scholarshipService.getApplications(scholarshipId);
      const payload = res.data;
      const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
      setAppsByScholarship((prev) => ({ ...prev, [scholarshipId]: rows }));
    } catch {
      setAppsByScholarship((prev) => ({ ...prev, [scholarshipId]: [] }));
    }
  }

  async function reviewApp(applicationId, status) {
    setError("");
    try {
      await scholarshipService.reviewApplication(applicationId, {
        status,
        review_notes: reviewNotes[applicationId] || "",
      });
      setReviewNotes((prev) => ({ ...prev, [applicationId]: "" }));
      const sid = expandedId;
      if (sid) {
        const res = await scholarshipService.getApplications(sid);
        const payload = res.data;
        const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        setAppsByScholarship((prev) => ({ ...prev, [sid]: rows }));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Mise à jour impossible.");
    }
  }

  async function deleteScholarship(id) {
    if (!window.confirm("Supprimer cette bourse ?")) return;
    try {
      await scholarshipService.delete(id);
      await loadAdmin();
      setExpandedId(null);
    } catch (e) {
      setError(e?.response?.data?.message || "Suppression impossible.");
    }
  }

  if (loading) {
    return (
      <AppLayout title="Bourses">
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Bourses">
      <div className="page-header">
        <h2>Bourses et aides</h2>
        <p>
          {isAdmin() && "Gérez les bourses et les candidatures."}
          {isStudent() && "Consultez les offres et suivez vos candidatures."}
          {isProfessor() && !isAdmin() && "Les candidatures aux bourses sont gérées par les étudiants et l’administration."}
          {!canonicalRole && "Connectez-vous pour accéder aux bourses."}
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {isAdmin() && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button type="button" onClick={() => setShowCreate(true)}>
              Nouvelle bourse
            </Button>
            <Button type="button" variant="secondary" onClick={refresh}>
              Actualiser
            </Button>
          </div>

          {showCreate && (
            <Card className="mb-6">
              <CardHeader title="Créer une bourse" />
              <form onSubmit={handleCreate} className="p-6 grid gap-4 max-w-3xl">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom</label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[100px]"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={createForm.type}
                      onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                    >
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Montant (€)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date limite</label>
                    <Input
                      type="date"
                      value={createForm.deadline}
                      onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Année universitaire (optionnel)</label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={createForm.academic_year_id}
                      onChange={(e) => setCreateForm({ ...createForm, academic_year_id: e.target.value })}
                    >
                      <option value="">—</option>
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Durée (mois, optionnel)</label>
                    <Input
                      type="number"
                      min="1"
                      value={createForm.duration_months}
                      onChange={(e) => setCreateForm({ ...createForm, duration_months: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Critères d’éligibilité</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                    value={createForm.eligibility_criteria}
                    onChange={(e) => setCreateForm({ ...createForm, eligibility_criteria: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  />
                  Bourse active
                </label>
                <div className="flex gap-2">
                  <Button type="submit" loading={createLoading}>
                    Enregistrer
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                    Annuler
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="grid gap-4">
            {adminList.length === 0 && <p className="text-gray-500">Aucune bourse. Créez-en une pour commencer.</p>}
            {adminList.map((s) => (
              <Card key={s.id}>
                <div className="p-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{s.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="info">{TYPE_LABELS[s.type] || s.type}</Badge>
                      <Badge variant={s.is_active ? "success" : "gray"}>{s.is_active ? "Active" : "Inactive"}</Badge>
                      <span className="text-sm text-gray-700">{formatMoney(s.amount)}</span>
                      <span className="text-sm text-gray-500">Limite : {formatDate(s.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
                    <Button type="button" variant="secondary" size="sm" onClick={() => toggleApplications(s.id)}>
                      {expandedId === s.id ? "Masquer candidatures" : "Candidatures"}
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => deleteScholarship(s.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
                {expandedId === s.id && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    {(appsByScholarship[s.id] || []).length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune candidature.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="ui-table w-full text-sm">
                          <thead>
                            <tr>
                              <th className="ui-th text-left">Étudiant</th>
                              <th className="ui-th text-left">Statut</th>
                              <th className="ui-th text-left">Lettre</th>
                              <th className="ui-th text-left">Décision</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(appsByScholarship[s.id] || []).map((a) => (
                              <tr key={a.id}>
                                <td className="ui-td">{a.student?.user?.name || `#${a.student_id}`}</td>
                                <td className="ui-td">
                                  <Badge variant={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}>
                                    {STATUS_LABELS[a.status] || a.status}
                                  </Badge>
                                </td>
                                <td className="ui-td max-w-xs truncate" title={a.motivation_letter}>
                                  {a.motivation_letter || "—"}
                                </td>
                                <td className="ui-td">
                                  <input
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
                                    placeholder="Note interne"
                                    value={reviewNotes[a.id] ?? ""}
                                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                  />
                                  <div className="flex gap-1 flex-wrap">
                                    <Button type="button" size="sm" variant="success" onClick={() => reviewApp(a.id, "approved")}>
                                      Accepter
                                    </Button>
                                    <Button type="button" size="sm" variant="danger" onClick={() => reviewApp(a.id, "rejected")}>
                                      Refuser
                                    </Button>
                                    <Button type="button" size="sm" variant="secondary" onClick={() => reviewApp(a.id, "pending")}>
                                      Pending
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {isStudent() && (
        <>
          <div className="flex gap-2 mb-4">
            <Button type="button" variant={tab === "offers" ? "primary" : "secondary"} onClick={() => setTab("offers")}>
              Offres ouvertes
            </Button>
            <Button type="button" variant={tab === "mine" ? "primary" : "secondary"} onClick={() => setTab("mine")}>
              Mes candidatures
            </Button>
          </div>

          {tab === "offers" && (
            <div className="grid gap-4">
              {available.length === 0 && <p className="text-gray-500">Aucune bourse ouverte pour le moment.</p>}
              {available.map((s) => {
                const already = myApps.some((a) => a.scholarship_id === s.id);
                return (
                  <Card key={s.id}>
                    <div className="p-4 flex flex-wrap justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{s.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm">
                          <Badge variant="info">{TYPE_LABELS[s.type] || s.type}</Badge>
                          <span>{formatMoney(s.amount)}</span>
                          <span className="text-gray-500">Avant le {formatDate(s.deadline)}</span>
                        </div>
                      </div>
                      <div>
                        {already ? (
                          <Badge variant="success">Déjà candidat</Badge>
                        ) : (
                          <Button type="button" onClick={() => setApplyFor(s)}>
                            Postuler
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {tab === "mine" && (
            <div className="grid gap-3">
              {myApps.length === 0 && <p className="text-gray-500">Vous n’avez pas encore de candidature.</p>}
              {myApps.map((a) => (
                <Card key={a.id}>
                  <div className="p-4">
                    <div className="font-semibold">{a.scholarship?.name || "Bourse"}</div>
                    <div className="text-sm text-gray-600 mt-1">{a.scholarship?.description}</div>
                    <div className="mt-2">
                      <Badge variant={a.status === "approved" ? "success" : a.status === "rejected" ? "error" : "warning"}>
                        {STATUS_LABELS[a.status] || a.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {applyFor && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog">
              <Card className="max-w-lg w-full p-6">
                <h3 className="text-lg font-semibold mb-2">Candidature : {applyFor.name}</h3>
                <form onSubmit={handleApply} className="grid gap-3">
                  <div>
                    <label className="text-sm font-medium">Lettre de motivation</label>
                    <textarea
                      className="w-full border rounded-md p-2 text-sm min-h-[160px] mt-1"
                      value={motivation}
                      onChange={(e) => setMotivation(e.target.value)}
                      required
                      placeholder="Présentez votre parcours et votre motivation…"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="secondary" onClick={() => { setApplyFor(null); setMotivation(""); }}>
                      Annuler
                    </Button>
                    <Button type="submit" loading={applyLoading}>
                      Envoyer
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </>
      )}

      {isProfessor() && !isAdmin() && !isStudent() && (
        <Card>
          <div className="p-6 text-gray-600">
            Les enseignants n’ouvrent pas de candidatures bourses depuis cet écran. Les étudiants postulent depuis leur compte ;
            l’administration gère les offres et les décisions.
          </div>
        </Card>
      )}
    </AppLayout>
  );
}
