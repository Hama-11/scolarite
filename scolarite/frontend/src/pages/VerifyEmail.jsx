import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";
import "../components/auth-new.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [status, setStatus] = useState("input"); // input, loading, success, error
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function handleVerify(e) {
    e.preventDefault();
    if (!email || !otpCode) {
      setMessage("Veuillez entrer votre email et le code de vérification");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await api.post("/verify-email-otp", { 
        email, 
        otp_code: otpCode 
      });
      setStatus("success");
      setMessage(res.data.message || "Email vérifié avec succès !");
    } catch (err) {
      const data = err?.response?.data;
      setStatus("error");
      setMessage(data?.message || "Code de vérification incorrect");
    }
  }

  async function handleResendOtp(e) {
    e.preventDefault();
    if (!email) {
      setMessage("Veuillez entrer votre adresse email");
      return;
    }

    setResendLoading(true);
    try {
      await api.post("/resend-verification-otp", { email });
      setMessage("Nouveau code de vérification envoyé à votre adresse email");
      setStatus("input");
    } catch (err) {
      const data = err?.response?.data;
      setMessage(data?.message || "Erreur lors de l'envoi du code");
    } finally {
      setResendLoading(false);
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
            <h1>{status === "success" ? "Email vérifié" : "Vérification email"}</h1>
            <p>{status === "success" ? message : "Entrez le code reçu par email."}</p>
          </div>

          {status === "success" ? (
            <Link className="auth-submit" to="/login" style={{ display: "inline-block", textAlign: "center", textDecoration: "none" }}>
              Se connecter
            </Link>
          ) : (
            <form onSubmit={handleVerify}>
              {message && (
                <div className={status === "error" ? "auth-error" : "auth-success"}>
                  {message}
                </div>
              )}

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
                <label>Code (6 chiffres)</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">🔑</span>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <button className="auth-submit" disabled={status === "loading" || resendLoading} type="submit">
                {status === "loading" ? (<><span className="auth-spinner" /> Vérification...</>) : "Vérifier"}
              </button>

              <div className="auth-footer" style={{ marginTop: 12 }}>
                <button type="button" className="auth-link-btn" onClick={handleResendOtp} disabled={resendLoading} style={{ marginRight: 12 }}>
                  {resendLoading ? "Envoi..." : "Renvoyer le code"}
                </button>
                <Link to="/login">Connexion</Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-content">
          <div className="auth-right-badge">Vérification</div>
          <h2>
            Sécurisez votre <span>compte</span>.
          </h2>
          <p>Confirmez votre email pour activer l’accès.</p>
        </div>
      </div>
    </div>
  );
}
