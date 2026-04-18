import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCanonicalRole, roleLabel } from "../auth/roles";
import Sidebar from "./Sidebar";
import "./dashboard.css";
import { notificationService } from "../services/api";

export default function AppLayout({ children, title = "Tableau de bord" }) {
  const navigate = useNavigate();
  const { user: me, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  useEffect(() => {
    let mounted = true;
    async function loadUnread() {
      try {
        const res = await notificationService.getUnreadCount();
        const count = Number(res?.data?.unread_count ?? res?.data?.count ?? res?.data ?? 0);
        if (mounted) setUnreadCount(Number.isFinite(count) ? count : 0);
      } catch {
        // ignore (no fake fallback)
        if (mounted) setUnreadCount(0);
      }
    }
    if (me) loadUnread();
    return () => { mounted = false; };
  }, [me]);

  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      setNotifLoading(true);
      try {
        const res = await notificationService.getAll({ per_page: 6 });
        const payload = res?.data;
        const list = Array.isArray(payload) ? payload : (payload?.data || []);
        const mapped = list.map((n) => ({
          id: n.id,
          text: n.title || n.message || n.text || "Notification",
          time: n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : "",
          raw: n,
          readAt: n.read_at || null,
        }));
        if (mounted) setNotifications(mapped);
      } catch {
        if (mounted) setNotifications([]);
      } finally {
        if (mounted) setNotifLoading(false);
      }
    }
    if (me && showNotifications) loadNotifications();
    return () => { mounted = false; };
  }, [me, showNotifications]);

  return (
    <div className="app-layout">
      <Sidebar user={me} />
      <div className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">{title}</h1>
          <div className="topbar-search" title="Recherche globale : prochainement">
            <span aria-hidden="true">⌕</span>
            <input readOnly placeholder="Recherche (bientôt disponible)…" aria-label="Recherche globale, bientôt disponible" />
          </div>
          <button className="topbar-icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
            N
            {unreadCount > 0 ? <span className="topbar-notif-dot" /> : null}
            {showNotifications && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <span>Notifications</span>
                  <button onClick={() => setShowNotifications(false)}>✕</button>
                </div>
                <div className="notif-list">
                  {notifLoading ? (
                    <div className="muted-center">Chargement...</div>
                  ) : notifications.length === 0 ? (
                    <div className="muted-center">Aucune notification.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="notif-item">
                        <div className="notif-text">{n.text}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="notif-footer">
                  <button onClick={() => { setShowNotifications(false); navigate("/notifications"); }}>
                    Voir tout
                  </button>
                </div>
              </div>
            )}
          </button>
          <button className="topbar-icon-btn" onClick={() => setShowSettings(!showSettings)}>S
            {showSettings && (
              <div className="settings-dropdown">
                <div className="settings-header">
                  <span>Paramètres</span>
                  <button onClick={() => setShowSettings(false)}>✕</button>
                </div>
                <div className="settings-list">
                  <div className="settings-item" onClick={() => { navigate("/settings"); setShowSettings(false); }}>
                    <span>•</span> General
                  </div>
                  <div className="settings-item" onClick={() => { navigate("/settings"); setShowSettings(false); }}>
                    <span>•</span> Aide
                  </div>
                </div>
                <div className="settings-footer">
                  <button onClick={() => { handleLogout(); setShowSettings(false); }}>Deconnexion</button>
                </div>
              </div>
            )}
          </button>
          {me && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 13
              }}>
                {me.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{me.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {roleLabel(getCanonicalRole(me))}
                </div>
              </div>
            </div>
          )}
        </header>
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
}
