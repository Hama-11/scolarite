import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/axios";
import { setAuth } from "../auth/auth";
import "../components/auth-new.css";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [roleId, setRoleId] = useState(0);
  const [roles, setRoles] = useState([]);
  const [matricule, setMatricule] = useState("");
  const [classe, setClasse] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [grade, setGrade] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/roles").then(res => {
      const list = Array.isArray(res.data) ? res.data : [];
      // Déduplication (certains seeds peuvent créer des doublons)
      const seen = new Set();
      const unique = list.filter((r) => {
        const key = String(r?.name || r?.id || "");
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const allowedRoles = unique.filter((r) => ["etudiant", "enseignant"].includes(String(r?.name).toLowerCase()));
      setRoles(allowedRoles);
      const studentRole = allowedRoles.find((r) => String(r?.name).toLowerCase() === "etudiant");
      setRoleId(Number((studentRole || allowedRoles[0])?.id || 0));
    }).catch(() => {
      setRoles([
        { id: 1, name: "etudiant", display_name: "Étudiant" },
        { id: 2, name: "enseignant", display_name: "Enseignant" },
      ]);
      setRoleId(1);
    });
  }, []);

  const selectedRole = roles.find((r) => Number(r.id) === Number(roleId));

  function nextStep(e) {
    e.preventDefault();
    setError("");
    if (step === 0 && password !== passwordConfirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setStep(s => s + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      console.log("Registering with:", { name, email, password, password_confirmation: passwordConfirmation, role_id: parseInt(roleId) });
      const res = await api.post("/register", {
        name, email, password,
        password_confirmation: passwordConfirmation,
        role_id: Number(roleId),
        ...(selectedRole?.name === "etudiant" ? { matricule, classe } : { specialite, grade }),
      });
      console.log("Registration response:", res.data);
      
      // Check if email verification is required
      if (res.data.email_verification_required) {
        navigate("/verify-email?email=" + encodeURIComponent(email));
        return;
      }
      
      // If no verification required, set auth and redirect to dashboard
      setAuth(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      console.log("Registration error:", err);
      const data = err?.response?.data;
      console.log("Error response data:", data);
      const msg = (data?.errors ? Object.values(data.errors).flat().join("\n") : null) || data?.message || "Inscription échouée";
      setError(msg);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">🎓</div>
          <div className="auth-brand-name">Scolarité</div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Inscription</h1>
            <p>Créez votre compte (Étudiant / Professeur).</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-steps">
            <div className={`auth-step ${step === 0 ? "active" : step > 0 ? "done" : ""}`}>
              <div className="auth-step-dot">1</div>
              <div className="auth-step-label">Compte</div>
              <div className="auth-step-line" />
            </div>
            <div className={`auth-step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
              <div className="auth-step-dot">2</div>
              <div className="auth-step-label">Rôle</div>
              <div className="auth-step-line" />
            </div>
            <div className={`auth-step ${step === 2 ? "active" : ""}`}>
              <div className="auth-step-dot">3</div>
              <div className="auth-step-label">Confirmer</div>
            </div>
          </div>

          {step === 0 && (
            <form onSubmit={nextStep}>
              <div className="auth-field">
                <label>Nom complet</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input placeholder="Ahmed Boudiaf" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>

              <div className="auth-field">
                <label>Adresse e-mail</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">📧</span>
                  <input type="email" placeholder="vous@universite.dz" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="auth-field">
                <label>Mot de passe</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input type={showPass ? "text" : "password"} placeholder="Min. 8 caractères" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                  <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label>Confirmer mot de passe</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">✅</span>
                  <input type="password" placeholder="••••••••" value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} required />
                </div>
              </div>

              <button className="auth-submit" type="submit">Suivant</button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={nextStep}>
              <div className="auth-field">
                <label>Rôle</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🎭</span>
                  <select value={roleId} onChange={(e) => setRoleId(Number(e.target.value))}>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedRole?.name === "etudiant" && (
                <>
                  <div className="auth-field">
                    <label>Matricule</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🆔</span>
                      <input placeholder="2025-0001" value={matricule} onChange={e => setMatricule(e.target.value)} />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Classe</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🏫</span>
                      <input placeholder="L2 Informatique" value={classe} onChange={e => setClasse(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {selectedRole?.name === "enseignant" && (
                <>
                  <div className="auth-field">
                    <label>Spécialité</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">📚</span>
                      <input placeholder="Mathématiques" value={specialite} onChange={e => setSpecialite(e.target.value)} />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Grade</label>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon">🏅</span>
                      <input placeholder="Maître de conférences" value={grade} onChange={e => setGrade(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="auth-footer" style={{ marginTop: 12 }}>
                <button type="button" className="auth-link-btn" onClick={() => setStep(0)} style={{ marginRight: 12 }}>
                  Retour
                </button>
                <span style={{ color: "#94a3b8" }}>Étape 2/3</span>
              </div>

              <button className="auth-submit" type="submit">Suivant</button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="auth-confirm-summary">
                <div className="auth-confirm-row"><span>Nom</span> <b>{name || "-"}</b></div>
                <div className="auth-confirm-row"><span>Email</span> <b>{email || "-"}</b></div>
                <div className="auth-confirm-row"><span>Rôle</span> <b>{selectedRole?.display_name || "-"}</b></div>
              </div>

              <button className="auth-submit" disabled={loading} type="submit">
                {loading ? (<><span className="auth-spinner" /> Création...</>) : "Créer le compte"}
              </button>

              <div className="auth-footer" style={{ marginTop: 12 }}>
                <button type="button" className="auth-link-btn" onClick={() => setStep(1)}>
                  Retour
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer">
            Déjà un compte ? <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-content">
          <div className="auth-right-badge">Création de compte</div>
          <h2>
            Rejoignez la plateforme <span>universitaire</span>.
          </h2>
          <p>Inscription rapide, accès aux services selon votre rôle.</p>
          <div className="auth-stats-row">
            <div>
              <div className="auth-stat-val">24/7</div>
              <div className="auth-stat-lbl">Accès</div>
            </div>
            <div>
              <div className="auth-stat-val">2</div>
              <div className="auth-stat-lbl">Rôles</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
