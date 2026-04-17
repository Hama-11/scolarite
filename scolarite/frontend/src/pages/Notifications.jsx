import { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import { Card, Spinner, Alert, Button, Badge } from "../components/ui";
import { notificationService } from "../services/api";

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await notificationService.getAll({ per_page: 20 });
      const payload = res?.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setItems(list);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    try {
      await notificationService.markAllAsRead();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la mise à jour.");
    }
  }

  async function markRead(id) {
    try {
      await notificationService.markAsRead(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la mise à jour.");
    }
  }

  async function remove(id) {
    try {
      await notificationService.delete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la suppression.");
    }
  }

  return (
    <AppLayout title="Notifications">
      <div className="page-header">
        <h2>Notifications</h2>
        <p>Historique depuis la base de données.</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="card-toolbar" style={{ marginBottom: 14 }}>
        <Button variant="outline" onClick={load}>Rafraîchir</Button>
        <Button variant="secondary" onClick={markAllRead}>Tout marquer comme lu</Button>
        <div className="spacer" />
        <Badge variant="gray">{items.length} item(s)</Badge>
      </div>

      {loading ? (
        <div className="muted-center"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card><div className="muted-center">Aucune notification.</div></Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((n) => (
            <Card key={n.id} className="ui-card compact">
              <div className="item-row" style={{ alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <div className="item-title" style={{ fontSize: 14 }}>
                    {n.title || "Notification"}
                  </div>
                  <div className="item-subtitle" style={{ marginTop: 4 }}>
                    {n.message || n.text || ""}
                  </div>
                  <div className="item-subtitle" style={{ marginTop: 8 }}>
                    {n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : ""}
                  </div>
                </div>
                <div className="table-actions">
                  {n.read_at ? <Badge variant="gray">Lu</Badge> : <Badge variant="warning">Non lu</Badge>}
                  {!n.read_at ? (
                    <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>Marquer lu</Button>
                  ) : null}
                  <Button size="sm" variant="danger" onClick={() => remove(n.id)}>Supprimer</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

