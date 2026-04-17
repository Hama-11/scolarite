import { Link } from "react-router-dom";
import "../styles/public.css";

export default function PublicLayout({ children }) {
  return (
    <div className="public-shell">
      <header className="public-navbar">
        <div className="public-container">
          <div className="public-navbar-inner">
            <Link to="/" className="public-brand">
              Mrs. College Guide
            </Link>

            <nav className="public-navlinks" aria-label="Navigation principale">
              <a href="#universities">Universities</a>
              <a href="#courses">Courses</a>
              <a href="#community">Community</a>
              <a href="#news">News</a>
              <a href="#about">About</a>
            </nav>

            <div className="public-actions">
              <Link to="/login" className="public-link-btn">
                Login
              </Link>
              <Link to="/register" className="public-cta">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

