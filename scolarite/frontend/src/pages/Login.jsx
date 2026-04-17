import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import { setAuth } from "../auth/auth";
import { defaultPathForRole, getCanonicalRole } from "../auth/roles";
import "../components/auth-new.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Step 1: Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Step 2: OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [registeredMessage, setRegisteredMessage] = useState("");

  function resolvePostLoginPath(user) {
    return defaultPathForRole(getCanonicalRole(user));
  }

  // Check if user just registered
  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      const registeredEmail = searchParams.get("email");
      if (registeredEmail) {
        setEmail(registeredEmail);
        setRegisteredMessage("Inscription réussie ! Veuillez vérifier votre adresse email avant de vous connecter.");
      }
    }
  }, [searchParams]);

  // Step 1: Submit email/password
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/login", { email, password });
      
      // If token is returned directly, login is successful (email already verified)
      if (res.data.token) {
        const u = res.data.user;
        setAuth(res.data.token, u);
        navigate(resolvePostLoginPath(u));
        return;
      }
      
      // If credentials are correct, we'll get OTP sent message
      if (res.data.otp_sent) {
        setOtpStep(true);
        setError("");
      }
    } catch (err) {
      const data = err?.response?.data;
      // Check if email is not verified
      if (data?.email_verified === false) {
        setError("Votre adresse email n'a pas été vérifiée. Veuillez vérifier votre email.");
        return;
      }
      const msg = data?.message || "Erreur de connexion";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleOtpSubmit(e) {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await api.post("/verify-otp", { 
        email, 
        otp_code: otpCode 
      });
      // Login successful
      const u = res.data.user;
      setAuth(res.data.token, u);
      navigate(resolvePostLoginPath(u));
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.message || "Code OTP incorrect";
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  }

  // Resend OTP
  async function handleResendOtp(e) {
    e.preventDefault();
    setResendLoading(true);
    try {
      await api.post("/resend-otp", { email });
      setError("Nouveau code OTP envoyé !");
      setOtpError("");
    } catch (err) {
      const data = err?.response?.data;
      setOtpError(data?.message || "Erreur lors de l'envoi du code");
    } finally {
      setResendLoading(false);
    }
  }

  // Go back to password step
  function handleBackToPassword() {
    setOtpStep(false);
    setOtpCode("");
    setOtpError("");
    setError("");
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
            <h1>{otpStep ? "Vérification OTP" : "Connexion"}</h1>
            <p>{otpStep ? `Entrez le code envoyé à ${email}` : "Accédez à votre espace."}</p>
          </div>

          {registeredMessage && <div className="auth-success">{registeredMessage}</div>}
          {!otpStep && error && <div className="auth-error">{error}</div>}

          {!otpStep ? (
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>Adresse e-mail</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">📧</span>
                  <input
                    type="email"
                    placeholder="vous@universite.dz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="auth-field">
                <label>Mot de passe</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              <button className="auth-submit" disabled={loading} type="submit">
                {loading ? (<><span className="auth-spinner" /> Connexion...</>) : "Se connecter"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              {otpError && <div className="auth-error">{otpError}</div>}
              {error && <div className="auth-success">{error}</div>}

              <div className="auth-field">
                <label>Code OTP (6 chiffres)</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔑</span>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    autoFocus
                  />
                </div>
              </div>

              <button className="auth-submit" disabled={otpLoading} type="submit">
                {otpLoading ? (<><span className="auth-spinner" /> Vérification...</>) : "Vérifier"}
              </button>

              <div className="auth-footer" style={{ marginTop: 12 }}>
                <button type="button" className="auth-link-btn" onClick={handleResendOtp} disabled={resendLoading} style={{ marginRight: 12 }}>
                  {resendLoading ? "Envoi..." : "Renvoyer le code"}
                </button>
                <button type="button" className="auth-link-btn" onClick={handleBackToPassword}>
                  Retour
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer">
            Pas encore de compte ? <Link to="/register">Créer un compte</Link>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-content">
          <div className="auth-right-badge">Plateforme universitaire</div>
          <h2>
            Gérez votre <span>scolarité</span> simplement.
          </h2>
          <p>Accès sécurisé pour Étudiants, Professeurs et Administration.</p>
          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">📅</div>
              <div>
                <div className="auth-feature-title">Emploi du temps</div>
                <div className="auth-feature-sub">Vue claire et à jour.</div>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">📝</div>
              <div>
                <div className="auth-feature-title">Notes & suivi</div>
                <div className="auth-feature-sub">Moyennes et détails par module.</div>
              </div>
            </div>
          </div>
          <div className="auth-testimonial">
            <div className="auth-testimonial-text">
              “Une interface simple, rapide et professionnelle.”
            </div>
            <div className="auth-testimonial-author">
              <div className="sidebar-avatar" style={{ width: 36, height: 36, display: "grid", placeItems: "center" }}>U</div>
              <div>
                <div className="auth-feature-title">Université</div>
                <div className="auth-feature-sub">Espace numérique</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
