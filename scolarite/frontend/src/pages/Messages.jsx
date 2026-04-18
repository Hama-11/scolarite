import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Alert, Spinner, Select, Textarea } from "../components/ui";
import { courseService, messageService } from "../services/api";
import { getEcho } from "../realtime/echo";
import "../components/dashboard.css";

export default function Messages() {
  const { isProfessor } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCourses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCourseId) {
      fetchMessages(selectedCourseId, page);
    }
  }, [selectedCourseId, page]);

  useEffect(() => {
    if (!selectedCourseId) return undefined;
    const echo = getEcho();
    if (!echo) return undefined;

    const channelName = `course.${selectedCourseId}`;
    const channel = echo.private(channelName);
    channel.listen(".course.message.posted", (event) => {
      setMessages((prev) => {
        if (prev.some((m) => Number(m.id) === Number(event.id))) return prev;
        return [event, ...prev];
      });
    });

    return () => {
      echo.leaveChannel(`private-${channelName}`);
    };
  }, [selectedCourseId]);

  const loadCourses = async () => {
    try {
      const response = isProfessor() ? await courseService.getProfessorCourses() : await courseService.getMyCourses();
      const payload = response.data;
      const list = Array.isArray(payload) ? payload : (payload?.data || []);
      setCourses(list);
      if (list.length) setSelectedCourseId(String(list[0].id));
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les cours.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (courseId, targetPage = 1) => {
    try {
      const res = await messageService.getCourseThread(courseId, { per_page: 20, page: targetPage });
      const data = res?.data?.data || [];
      setMessages(data);
      setLastPage(res?.data?.last_page || 1);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger la discussion.");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCourseId) return;

    setSending(true);
    try {
      await messageService.postCourseMessage(selectedCourseId, {
        body: newMessage,
        subject: "Discussion de cours",
      });
      setNewMessage("");
      fetchMessages(selectedCourseId, 1);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError("Echec d'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === String(selectedCourseId)) || null,
    [courses, selectedCourseId]
  );

  if (loading) {
    return (
      <AppLayout title="Messages">
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Messages">
      <div className="page-header">
        <h2>Discussion par cours</h2>
        <p>Canal de communication pédagogique entre enseignant et étudiants.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <div style={{ display: "grid", gap: 12 }}>
          <Select
            label="Cours"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setPage(1);
            }}
            options={[
              { value: "", label: "Sélectionnez un cours" },
              ...courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
            ]}
          />

          {selectedCourse ? (
            <div className="item-subtitle">
              Fil de discussion du cours: {selectedCourse.name} ({selectedCourse.code})
            </div>
          ) : null}

          <div className="messages-list" style={{ maxHeight: "52vh", overflowY: "auto", display: "grid", gap: 8 }}>
            {messages.length === 0 ? (
              <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                Aucun message pour ce cours.
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="ui-card compact">
                  <div className="item-row">
                    <strong>{msg?.sender?.name || "Utilisateur"}</strong>
                    <span className="item-subtitle">{new Date(msg.created_at).toLocaleString("fr-FR")}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{msg.body}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Précédent
            </Button>
            <span className="item-subtitle">Page {page} / {lastPage}</span>
            <Button variant="outline" disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))}>
              Suivant
            </Button>
          </div>

          <form onSubmit={sendMessage} style={{ display: "grid", gap: 8 }}>
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message au cours..."
              rows={3}
            />
            <div>
              <Button type="submit" variant="primary" disabled={sending || !selectedCourseId}>
                {sending ? "Envoi..." : "Publier"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </AppLayout>
  );
}