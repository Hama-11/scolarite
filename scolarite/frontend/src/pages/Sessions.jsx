import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import "../components/dashboard.css";

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", room: "", type: "presentiel", group: "" });

  useEffect(() => {
    api.get("/sessions").then(res => {
      setSessions(res.data);
    });
  }, []);

  const cells = buildCalendar(year, month);
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const monthSessions = sessions.filter(s => s.month === month);
  const daySessions = selectedDay ? monthSessions.filter(s => s.day === selectedDay) : [];

  function hasEvent(day) { return monthSessions.some(s => s.day === day); }

  function handleCreate(e) {
    e.preventDefault();
    setShowModal(false);
  }

  const statusColor = { confirmed: "success", pending: "warning", cancelled: "danger" };
  const statusLabel = { confirmed: "Confirmée", pending: "En attente", cancelled: "Annulée" };

  return (
    <AppLayout title="Planification des Séances">
      <div className="page-header">
        <h2>Calendrier des seances</h2>
        <p>Planifiez, visualisez et gerez toutes les seances.</p>
      </div>

      <div className="grid-70-30">
        {/* Calendar */}
        <div className="card">
          <div className="card-header">
            <button className="btn btn-sm btn-secondary" onClick={prevMonth}>‹</button>
            <h3 style={{ flex: 1, textAlign: "center" }}>{MONTH_NAMES[month]} {year}</h3>
            <button className="btn btn-sm btn-secondary" onClick={nextMonth}>›</button>
          </div>
          <div className="card-body">
            <div className="cal-grid" style={{ marginBottom: 8 }}>
              {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            </div>
            <div className="cal-grid">
              {cells.map((day, i) => (
                <div
                  key={i}
                  className={`cal-day${day === null ? "" : ""}${day === today.getDate() && month === today.getMonth() && year === today.getFullYear() ? " today" : ""}${day && hasEvent(day) ? " has-event" : ""}${day === selectedDay ? " today" : ""}`}
                  style={day === null ? {} : { cursor: "pointer" }}
                  onClick={() => day && setSelectedDay(day)}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="card-footer">
              <div className="legend-row">
                <span className="legend-item"><span className="legend-dot" style={{ background: "var(--primary)" }} /> Séances prévues</span>
                <span className="legend-item"><span className="legend-dot" style={{ background: "var(--success)" }} /> Aujourd'hui</span>
              </div>
            </div>
          </div>
        </div>

        {/* Day detail / upcoming */}
        <div className="card">
          <div className="card-header">
            <h3>{selectedDay ? `${selectedDay} ${MONTH_NAMES[month]}` : "Séances du mois"}</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>+ Ajouter</button>
          </div>
          <div className="card-body" style={{ padding: "12px 14px" }}>
            <div className="session-list">
              {(selectedDay ? daySessions : monthSessions).slice(0, 6).map((s) => (
                <div className="session-card" key={s.id}>
                  <div className="session-date-box">
                    <div className="session-date-day">{s.day}</div>
                    <div className="session-date-month">{MONTH_NAMES[s.month].slice(0, 3)}</div>
                  </div>
                  <div className="session-info">
                    <div className="session-title">{s.title}</div>
                    <div className="session-meta">{s.room} • {s.time}</div>
                    <div className="session-meta">{s.tutor} • {s.attendees} étudiants</div>
                  </div>
                  <span className={`badge ${statusColor[s.status]}`}>{statusLabel[s.status]}</span>
                </div>
              ))}
              {(selectedDay ? daySessions : monthSessions).length === 0 && (
                <div className="muted-center">Aucune séance ce jour.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All sessions table */}
      <div className="card">
        <div className="card-header">
          <h3>Toutes les séances — {MONTH_NAMES[month]}</h3>
          <div className="card-header-actions">
            <span className="badge info">{monthSessions.length} séances</span>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Professeur</th>
              <th>Date & Heure</th>
              <th>Lieu</th>
              <th>Type</th>
              <th>Participants</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.title}</td>
                <td>{s.tutor}</td>
                <td>{s.day}/{(s.month + 1).toString().padStart(2, "0")}/2026 • {s.time}</td>
                <td>{s.room}</td>
                <td><span className={`session-type ${s.type}`}>{s.type}</span></td>
                <td>{s.attendees}</td>
                <td><span className={`badge ${statusColor[s.status]}`}>{statusLabel[s.status]}</span></td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-sm btn-secondary">✏️</button>
                    <button className="btn btn-sm btn-danger btn-icon">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Session Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Planifier une séance</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Groupe</label>
                  <select className="form-control form-select" value={form.group} onChange={e => setForm({ ...form, group: e.target.value })}>
                    <option value="">Sélectionner un groupe</option>
                    <option>Mathématiques L1</option>
                    <option>Algorithmique</option>
                    <option>Physique Générale</option>
                    <option>Statistiques L2</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Heure</label>
                    <input type="time" className="form-control" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Salle / Lien</label>
                  <input className="form-control" placeholder="Ex: Salle B204 ou https://zoom.us/..." value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="presentiel">Présentiel</option>
                    <option value="online">En ligne</option>
                    <option value="mixte">Mixte</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer la séance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
