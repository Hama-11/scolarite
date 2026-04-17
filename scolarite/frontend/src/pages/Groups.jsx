import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import "../components/dashboard.css";

const depts = ["Tous", "Sciences", "Informatique", "Gestion", "Droit"];
const types = ["Tous", "presentiel", "online", "mixte"];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [filterDept, setFilterDept] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", dept: "Informatique", tutor_id: "", max: 20, type: "presentiel" });

  useEffect(() => {
    api.get("/groups").then((res) => {
      setGroups(res.data);
    });
    api.get("/professors").then((res) => {
      setProfessors(res.data);
    }).catch(() => setProfessors([]));
  }, []);

  const filtered = groups.filter((g) => {
    const matchDept = filterDept === "Tous" || g.dept === filterDept;
    const matchType = filterType === "Tous" || g.type === filterType;
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.tutor.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchType && matchSearch;
  });

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const res = await api.post("/groups", {
        name: form.name,
        departement: form.dept,
        professor_id: form.tutor_id,
        max_students: parseInt(form.max),
      });
      setGroups([...groups, { ...res.data, students: 0, type: "presentiel", status: "waiting" }]);
      setShowModal(false);
      setForm({ name: "", dept: "Informatique", tutor_id: "", max: 20, type: "presentiel" });
    } catch {
      alert("Erreur lors de la création du groupe");
    }
  }

  return (
    <AppLayout title="Gestion des Groupes">
      <div className="page-header">
        <h2>Groupes de tutorat</h2>
        <p>Creez, organisez et suivez les groupes par departement.</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="card-toolbar">
          <input
            className="form-control"
            style={{ width: 220 }}
            placeholder="🔍 Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-control form-select" style={{ width: 160 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            {depts.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="form-control form-select" style={{ width: 160 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div className="spacer">
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Créer un groupe</button>
          </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Total groupes", value: groups.length, icon: "👥" },
          { label: "Actifs", value: groups.filter(g => g.status === "active").length, icon: "✅" },
          { label: "En attente", value: groups.filter(g => g.status === "waiting").length, icon: "⏳" },
          { label: "Total étudiants", value: groups.reduce((a, g) => a + g.students, 0), icon: "📚" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-value" style={{ fontSize: 22 }}>{s.icon} {s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Groups grid */}
      <div className="grid-auto">
        {filtered.map((g) => (
          <div key={g.id} className="group-card">
            <div className="group-card-header">
              <div>
                <div className="group-name">{g.name}</div>
                <div className="group-dept">{g.dept}</div>
              </div>
              <span className={`badge ${g.status === "active" ? "success" : "warning"}`}>
                {g.status === "active" ? "Actif" : "En attente"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
              <span>👨‍🏫</span> {g.tutor}
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span>Effectif</span>
                <span>{g.students}/{g.max}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill primary" style={{ width: `${(g.students / g.max) * 100}%` }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className={`session-type ${g.type}`}>{g.type}</span>
              <div className="table-actions">
                <button className="btn btn-sm btn-secondary">✏️</button>
                <button className="btn btn-sm btn-secondary">👥</button>
                <button className="btn btn-sm btn-secondary">📅</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Créer un groupe de tutorat</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du groupe *</label>
                  <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Mathématiques L1" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Département</label>
                    <select className="form-control form-select" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
                      {depts.filter(d => d !== "Tous").map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type de séance</label>
                    <select className="form-control form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="presentiel">Présentiel</option>
                      <option value="online">En ligne</option>
                      <option value="mixte">Mixte</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Professeur responsable</label>
                  <select className="form-control form-select" value={form.tutor_id} onChange={(e) => setForm({ ...form, tutor_id: e.target.value })}>
                    <option value="">Sélectionner un professeur</option>
                    {professors.map(p => <option key={p.id} value={p.id}>{p.name} - {p.specialite}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacité maximale</label>
                  <input className="form-control" type="number" min={5} max={50} value={form.max} onChange={(e) => setForm({ ...form, max: +e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer le groupe</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
