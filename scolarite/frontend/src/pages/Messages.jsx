import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Card, Input, Button, Alert, Spinner } from "../components/ui";
import "../components/dashboard.css";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const res = await api.get("/messages");
      setConversations(res.data.data || res.data || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      setError("Impossible de charger les conversations.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/conversation/${conversationId}`);
      setMessages(res.data.data || res.data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Impossible de charger les messages.");
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      await api.post("/messages", {
        receiver_id: selectedConversation.user_id,
        content: newMessage,
      });
      setNewMessage("");
      fetchMessages(selectedConversation.id);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Echec d'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conversation) => {
    return conversation.receiver || conversation.sender;
  };

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
        <h2>Messagerie</h2>
        <p>Communiquez avec les étudiants, professeurs et administrateurs.</p>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
      <div className="messages-container">
        {/* Conversations List */}
        <div className="conversations-list">
          <h3 style={{ marginBottom: 16 }}>Conversations</h3>
          {conversations.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>Aucune conversation</p>
          ) : (
            <div className="conversations">
              {conversations.map((conv) => {
                const otherUser = getOtherUser(conv);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`conversation-item ${selectedConversation?.id === conv.id ? "active" : ""}`}
                  >
                    <div className="conversation-name">{otherUser?.name || "Utilisateur"}</div>
                    <div className="conversation-preview">
                      {conv.last_message?.substring(0, 30)}...
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="messages-area" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {selectedConversation ? (
            <>
              <div className="messages-head">
                <h3>Conversation avec {getOtherUser(selectedConversation)?.name}</h3>
              </div>
              <div
                className="messages-list"
                style={{
                  overflowY: "auto",
                  marginBottom: "16px",
                  maxHeight: "52vh",
                }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message-bubble ${msg.sender_id === user?.id ? "me" : "them"}`}
                  >
                    <div>{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={sendMessage} style={{ display: "flex", gap: "10px" }}>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1"
                />
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? "Envoi..." : "Envoyer"}
                </Button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ color: "var(--text-muted)" }}>Sélectionnez une conversation</p>
            </div>
          )}
        </div>
      </div>
      </Card>
    </AppLayout>
  );
}