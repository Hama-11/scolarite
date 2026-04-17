import { useState } from "react";
import AppLayout from "../components/AppLayout";
import { api } from "../api/axios";
import { getUser, setAuth } from "../auth/auth";
import "../components/dashboard.css";

export default function Settings() {
  const [user, setUser] = useState(getUser());
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }

    setLoading(true);
    try {
      const data = {};
      if (name !== user.name) data.name = name;
      if (email !== user.email) data.email = email;
      if (newPassword) data.password = newPassword;

      const res = await api.put("/profile", data);
      setMessage({ type: "success", text: res.data.message });
      
      // Update user in localStorage
      setAuth(localStorage.getItem("token"), res.data.user);
      setUser(res.data.user);
      
      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = err?.response?.data?.message || "Erreur lors de la mise à jour";
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Paramètres du compte">
      <div className="page-header">
        <h2>Paramètres du compte</h2>
        <p>Modifiez vos informations personnelles et votre mot de passe.</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <h3>Informations du compte</h3>
        </div>
        <div className="card-body">
          {message.text && (
            <div className={`alert ${message.type === "success" ? "alert-success" : "alert-danger"}`}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Adresse e-mail</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rôle</label>
              <input
                type="text"
                className="form-control"
                value={user?.role_display_name || user?.role || ""}
                disabled
                style={{ background: "var(--bg)" }}
              />
            </div>

            <hr style={{ margin: "20px 0" }} />

            <h4 style={{ marginBottom: 16 }}>Changer le mot de passe</h4>

            <div className="form-group">
              <label className="form-label">Nouveau mot de passe</label>
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Laissez vide pour garder l'actuel"
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
