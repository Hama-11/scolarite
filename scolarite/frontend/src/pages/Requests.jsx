import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import { Alert } from "../components/ui";
import "../components/dashboard.css";

const statusColor = {
  draft: "info",
  submitted: "warning",
  in_review: "info",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  archived: "secondary",
};
const statusLabel = {
  draft: "Brouillon",
  submitted: "Soumise",
  in_review: "En revue",
  pending: "En attente",
  approved: "Approuvee",
  rejected: "Refusee",
  archived: "Archivee",
};

export default function Requests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/requests")
      .then((res) => {
        // API renvoie une structure paginée : { data: [...], ... }
        const payload = res.data;
        const list = payload?.data ?? payload ?? [];
        setRequests(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setError("Impossible de charger les demandes.");
      });
  }, []);

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-FR");
  };

  async function approve(id) {
    try {
      await api.put(`/requests/${id}`, { status: "approved", comment: "Validation par administration." });
      setRequests(r => r.map(x => x.id === id ? { ...x, status: "approved" } : x));
      setSelected(null);
    } catch {
      alert("Erreur lors de l'approbation");
    }
  }

  async function reject(id) {
    try {
      await api.put(`/requests/${id}`, { status: "rejected", comment: "Rejet par administration." });
      setRequests(r => r.map(x => x.id === id ? { ...x, status: "rejected" } : x));
      setSelected(null);
    } catch {
      alert("Erreur lors du rejet");
    }
  }

  const counts = {
    pending: requests.filter(r => ["pending", "submitted", "in_review"].includes(r.status)).length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  return (
    <AppLayout title="Gestion des Demandes">
      <div className="page-header">
        <h2>Demandes d inscription</h2>
        <p>Gerez les demandes des etudiants pour rejoindre les groupes.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Total", value: requests.length, icon: "📋", color: "blue" },
          { label: "En attente", value: counts.pending, icon: "⏳", color: "orange" },
          { label: "Approuvées", value: counts.approved, icon: "✅", color: "green" },
          { label: "Refusées", value: counts.rejected, icon: "❌", color: "pink" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-card-top">
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            </div>
            <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Liste des demandes</h3>
          <div className="card-header-actions">
            {["all", "pending", "approved", "rejected", "archived"].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Toutes" : statusLabel[f]}
                {f === "pending" && counts.pending > 0 && (
                  <span style={{ marginLeft: 6, background: "var(--danger)", color: "#fff", borderRadius: 20, padding: "0 6px", fontSize: 11 }}>{counts.pending}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Étudiant</th>
              <th>Groupe demandé</th>
              <th>Département</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {r.student?.user?.name ?? r.student?.name ?? "N/A"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {r.student?.user?.email ?? r.student?.email ?? "N/A"}
                  </div>
                </td>
                <td>{r.group?.name ?? r.group ?? "N/A"}</td>
                <td>{r.group?.departement ?? r.dept ?? "-"}</td>
                <td>{formatDate(r.created_at ?? r.date)}</td>
                <td><span className={`badge ${statusColor[r.status] || "info"}`}>{statusLabel[r.status] || r.status}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => setSelected(r)}>👁 Détails</button>
                    {["pending", "submitted", "in_review"].includes(r.status) && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => approve(r.id)}>✓</button>
                        <button className="btn btn-sm btn-danger" onClick={() => reject(r.id)}>✗</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="card-footer header-row" style={{ alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {filtered.length} demande(s) affichée(s)
          </span>
          {counts.pending > 0 && (
            <div className="header-actions">
              <button className="btn btn-sm btn-success" onClick={() => requests.filter(r => ["pending", "submitted", "in_review"].includes(r.status)).forEach(r => approve(r.id))}>
                ✓ Tout approuver ({counts.pending})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Détails de la demande</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Étudiant</div>
                  <div style={{ fontWeight: 700 }}>
                    {selected.student?.user?.name ?? selected.student?.name ?? "N/A"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {selected.student?.user?.email ?? selected.student?.email ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Groupe</div>
                  <div style={{ fontWeight: 700 }}>{selected.group?.name ?? selected.group ?? "N/A"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {selected.group?.departement ?? selected.dept ?? "-"}
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Date de demande</div>
                <div>{formatDate(selected.created_at ?? selected.date)}</div>
              </div>
              {selected.message && (
                <div style={{ padding: "12px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Message</div>
                  <div style={{ fontSize: 14 }}>{selected.message}</div>
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                Statut actuel: <span className={`badge ${statusColor[selected.status] || "info"}`}>{statusLabel[selected.status] || selected.status}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
              {["pending", "submitted", "in_review"].includes(selected.status) && (
                <>
                  <button className="btn btn-danger" onClick={() => reject(selected.id)}>Refuser</button>
                  <button className="btn btn-success" onClick={() => approve(selected.id)}>Approuver</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
