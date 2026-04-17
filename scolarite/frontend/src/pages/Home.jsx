import { Link } from "react-router-dom";
import { Button, Card, Badge } from "../components/ui";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="modern-page">
      <header style={{ background: "#fff", borderBottom: "1px solid var(--border-200)" }}>
        <div className="modern-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 72 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--brand-700)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800 }}>
              SC
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "var(--text-900)" }}>SCOLARITE</div>
              <div style={{ color: "var(--text-500)", fontSize: 12 }}>Gestion universitaire</div>
            </div>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link to="/login" style={{ color: "var(--text-700)", textDecoration: "none", fontWeight: 600 }}>Connexion</Link>
            <Link to="/register" style={{ textDecoration: "none" }}>
              <Button>Inscription</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section style={{ padding: "42px 0 26px", background: "#f2f2f1" }}>
        <div className="modern-container" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28, alignItems: "center" }}>
          <div>
            <Badge className="mb-4" variant="info">Plateforme academique</Badge>
            <h1 style={{ fontSize: "clamp(2rem,4vw,3.5rem)", lineHeight: 1.08, margin: "0 0 14px", color: "var(--text-900)" }}>
              Construisez votre avenir,
              <br />
              Choisissez votre parcours
            </h1>
            <p className="modern-muted" style={{ maxWidth: 520, marginBottom: 20 }}>
              Plateforme moderne de scolarite pour suivre les cours, les notes, les demandes et la communication entre etudiants, professeurs et administration.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/register" style={{ textDecoration: "none" }}>
                <Button className="rounded-full">Commencer</Button>
              </Link>
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Button variant="outline" className="rounded-full">Connexion</Button>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
              {[
                { letter: "A", bg: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
                { letter: "B", bg: "linear-gradient(135deg,#0ea5e9,#22d3ee)" },
                { letter: "C", bg: "linear-gradient(135deg,#10b981,#34d399)" },
                { letter: "D", bg: "linear-gradient(135deg,#f97316,#fb923c)" },
              ].map((p) => (
                <div
                  key={p.letter}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: p.bg,
                    color: "#fff",
                    fontWeight: 800,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 15,
                    boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                    border: "2px solid #fff",
                  }}
                >
                  {p.letter}
                </div>
              ))}
              <span className="modern-muted" style={{ marginLeft: 6, fontSize: 13 }}>
                Communauté étudiante & enseignants
              </span>
            </div>
          </div>

          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              minHeight: 280,
              background: "linear-gradient(145deg, #e8eefc 0%, #dbeafe 45%, #c7d2fe 100%)",
              border: "1px solid var(--border-200)",
            }}
          >
            <img
              src="/landing-hero.png"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 280 }}
            />
          </div>
        </div>
      </section>

      <section style={{ padding: "56px 0" }}>
        <div className="modern-container">
          <div style={{ marginBottom: 18 }}>
            <span className="modern-chip">Fonctionnalites essentielles</span>
          </div>
          <div className="modern-grid-3">
            <Card className="p-6 modern-card">
              <h3 style={{ margin: 0, color: "var(--text-900)" }}>Gestion des cours</h3>
              <p className="modern-muted" style={{ marginTop: 8 }}>Consultez les modules, supports et progressions en un seul endroit.</p>
            </Card>
            <Card className="p-6 modern-card">
              <h3 style={{ margin: 0, color: "var(--text-900)" }}>Suivi des notes</h3>
              <p className="modern-muted" style={{ marginTop: 8 }}>Visualisez rapidement les notes et performances par matiere.</p>
            </Card>
            <Card className="p-6 modern-card">
              <h3 style={{ margin: 0, color: "var(--text-900)" }}>Scolarite et demandes</h3>
              <p className="modern-muted" style={{ marginTop: 8 }}>Centralisez vos documents, notifications et demandes administratives.</p>
            </Card>
          </div>
        </div>
      </section>

      <footer style={{ background: "var(--brand-900)", color: "#d6e6ff", padding: "20px 0", marginTop: 28 }}>
        <div className="modern-container" style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <span>© {currentYear} Scolarite. Tous droits reserves.</span>
          <span>Plateforme unifiee pour etudiants, professeurs et administration.</span>
        </div>
      </footer>
    </div>
  );
}
