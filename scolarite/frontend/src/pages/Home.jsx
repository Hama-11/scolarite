import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import "./home-landing.css";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-logo">SC</div>
            <div className="landing-brand-text">
              <div className="landing-brand-title">SCOLARITE</div>
              <div className="landing-brand-sub">Digital Campus Platform</div>
            </div>
          </Link>

          <nav className="landing-nav">
            <a href="#programmes">Programmes</a>
            <a href="#admission">Admission</a>
            <a href="#campus">Campus</a>
            <Link to="/login">Connexion</Link>
            <Link to="/register">
              <Button>Inscription</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div className="landing-hero-copy">
            <span className="landing-kicker">UNIVERSITY EDUCATION PLATFORM</span>
            <h1>
              Build your future
              <br />at modern college
            </h1>
            <p>
              Une expérience complète pour étudiants, enseignants, directeur des études et administration:
              cours, notes, planning, admissions et performance académique dans une seule plateforme.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register">
                <Button>Apply now</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline">Student login</Button>
              </Link>
            </div>
            <div className="landing-stats">
              <div>
                <strong>12k+</strong>
                <span>Students</span>
              </div>
              <div>
                <strong>320+</strong>
                <span>Professors</span>
              </div>
              <div>
                <strong>96%</strong>
                <span>Success rate</span>
              </div>
            </div>
            <div className="trust-row">
              <span>Trusted by:</span>
              <b>Tech Faculty</b>
              <b>Business School</b>
              <b>Engineering Hub</b>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-shape hero-shape-a" />
            <div className="hero-shape hero-shape-b" />
            <div className="hero-shape hero-shape-c" />
            <div className="hero-card hero-card-top">
              <span>Admission 2026 Open</span>
              <strong>+2,450 applications</strong>
            </div>
            <div className="hero-card hero-card-main">
              <h3>College Life & Learning</h3>
              <p>Interactive classes, digital administration, and career-focused programs.</p>
              <div className="hero-pill-row">
                <span>Science</span>
                <span>Business</span>
                <span>Engineering</span>
              </div>
            </div>
            <div className="hero-side-card">
              <small>Top ranked campus</small>
              <strong>#1 student support</strong>
            </div>
            <div className="hero-card hero-card-bottom">
              <span>Campus events this week</span>
              <strong>18 Activities</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="programmes" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head">
            <span>OUR PROGRAMS</span>
            <h2>Explore academic paths</h2>
          </div>
          <div className="landing-cards-3">
            <article>
              <h3>Computer Science</h3>
              <p>Software engineering, data systems, AI fundamentals and modern labs.</p>
              <a href="#">Read more</a>
            </article>
            <article>
              <h3>Business & Management</h3>
              <p>Finance, entrepreneurship, analytics and strategic leadership skills.</p>
              <a href="#">Read more</a>
            </article>
            <article>
              <h3>Engineering</h3>
              <p>Applied sciences with practical projects and industry mentoring.</p>
              <a href="#">Read more</a>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section highlight-strip">
        <div className="landing-container highlight-grid">
          <article>
            <strong>Smart Scheduling</strong>
            <p>Conflict detection and optimized timetables in real time.</p>
          </article>
          <article>
            <strong>Academic Insights</strong>
            <p>Live dashboards for success rate, attendance and student progress.</p>
          </article>
          <article>
            <strong>Fast Workflows</strong>
            <p>Admissions, claims and validation flows centralized end-to-end.</p>
          </article>
        </div>
      </section>

      <section id="admission" className="landing-section alt">
        <div className="landing-container split">
          <div>
            <div className="landing-section-head">
              <span>HOW TO APPLY</span>
              <h2>Admission process</h2>
            </div>
            <ul className="admission-steps">
              <li><strong>1.</strong> Create your account and complete your profile.</li>
              <li><strong>2.</strong> Upload required documents and validate your dossier.</li>
              <li><strong>3.</strong> Follow status, results and registration in real-time.</li>
            </ul>
          </div>
          <div className="quote-box">
            <p>"A modern platform that connects every actor of university life."</p>
            <span>Scolarite Platform</span>
            <div className="quote-metrics">
              <div>
                <strong>45+</strong>
                <small>Programs</small>
              </div>
              <div>
                <strong>96%</strong>
                <small>Graduation rate</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="campus" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-head">
            <span>CAMPUS LIFE</span>
            <h2>Student experience</h2>
          </div>
          <div className="landing-cards-3 mini">
            <article>
              <h3>Events & clubs</h3>
              <p>Academic and cultural activities across departments.</p>
            </article>
            <article>
              <h3>Digital schedule</h3>
              <p>Centralized timetable with conflict detection.</p>
            </article>
            <article>
              <h3>Performance tracking</h3>
              <p>Analytics dashboard for students and staff.</p>
            </article>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <span>© {currentYear} Scolarite. Tous droits reserves.</span>
          <span>Plateforme unifiee pour etudiants, enseignants, directeur et administration.</span>
        </div>
      </footer>
    </div>
  );
}
