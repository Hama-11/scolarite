import { Link, useLocation } from "react-router-dom";
import { getCanonicalRole, sidebarNavKey, roleLabel } from "../auth/roles";
import "./dashboard.css";

const navConfig = {
  admin: [
    {
      section: "Principal",
      items: [
        { icon: "🏠", label: "Espace admin", path: "/admin" },
        { icon: "👤", label: "Mon profil", path: "/profile" },
        { icon: "🎓", label: "Cœur académique", path: "/admin/academic-core" },
        { icon: "👥", label: "Utilisateurs", path: "/admin/users" },
        { icon: "🛠️", label: "Admin système", path: "/admin/system-center" },
        { icon: "✅", label: "Validation dossiers", path: "/admin/student-validation" },
        { icon: "🏫", label: "Classes scolaires", path: "/admin/school-classes" },
        { icon: "📄", label: "Demandes documents", path: "/admin/official-requests" },
        { icon: "⚖️", label: "Litiges de notes", path: "/admin/conception-grade-disputes" },
        { icon: "🚀", label: "Hub modernisation", path: "/admin/modernization" },
        { icon: "👥", label: "Groupes de tutorat", path: "/groups" },
        { icon: "📅", label: "Séances", path: "/sessions" },
        { icon: "📋", label: "Demandes", path: "/requests" },
      ],
    },
    {
      section: "Rapports & accès",
      items: [
        { icon: "📊", label: "Statistiques", path: "/reports" },
        { icon: "🎓", label: "Étudiants", path: "/students" },
        { icon: "💬", label: "Messages", path: "/messages" },
        { icon: "🔔", label: "Notifications", path: "/notifications" },
        { icon: "⚙️", label: "Paramètres", path: "/settings" },
      ],
    },
  ],
  director: [
    {
      section: "Direction",
      items: [
        { icon: "🏠", label: "Tableau direction", path: "/director" },
        { icon: "✅", label: "Validation académique", path: "/director/validation" },
        { icon: "🧑‍🎓", label: "Suivi étudiants", path: "/director/students-followup" },
        { icon: "🧾", label: "Réclamations", path: "/director/claims" },
        { icon: "🧪", label: "Examens", path: "/director/exams" },
        { icon: "🎓", label: "Cœur académique", path: "/director/academic-core" },
        { icon: "📊", label: "Statistiques", path: "/reports" },
        { icon: "🎓", label: "Étudiants", path: "/students" },
        { icon: "📅", label: "Planning", path: "/schedule" },
        { icon: "⚖️", label: "Litiges de notes", path: "/director/claims" },
      ],
    },
    {
      section: "Compte",
      items: [
        { icon: "👤", label: "Mon profil", path: "/profile" },
        { icon: "⚙️", label: "Paramètres", path: "/settings" },
      ],
    },
  ],
  tutor: [
    {
      section: "Principal",
      items: [
        { icon: "🏠", label: "Tableau de bord", path: "/dashboard" },
        { icon: "👤", label: "Mon profil", path: "/profile" },
        { icon: "📚", label: "Mes cours", path: "/courses" },
        { icon: "📅", label: "Mon emploi du temps", path: "/schedule" },
        { icon: "🏫", label: "Mes classes (scolaires)", path: "/professor/school-classes" },
        { icon: "👥", label: "Étudiants", path: "/students" },
      ],
    },
    {
      section: "Gestion",
      items: [
        { icon: "📝", label: "Notes", path: "/grades" },
        { icon: "📋", label: "Devoirs", path: "/assignments" },
        { icon: "✅", label: "Absences", path: "/attendance" },
        { icon: "🚦", label: "Étudiants à risque", path: "/professor/risk" },
      ],
    },
    {
      section: "Informations",
      items: [
        { icon: "📢", label: "Annonces", path: "/announcements" },
        { icon: "📁", label: "Documents", path: "/documents" },
        { icon: "💬", label: "Messages", path: "/messages" },
        { icon: "🔔", label: "Notifications", path: "/notifications" },
      ],
    },
  ],
  /** Rôle non reconnu (données obsolètes) : éviter d’afficher le menu étudiant par défaut. */
  unknown: [
    {
      section: "Compte",
      items: [
        { icon: "👤", label: "Mon profil", path: "/profile" },
        { icon: "⚙️", label: "Paramètres", path: "/settings" },
      ],
    },
  ],
  student: [
    {
      section: "Principal",
      items: [
        { icon: "🏠", label: "Tableau de bord", path: "/dashboard" },
        { icon: "👤", label: "Mon profil", path: "/profile" },
        { icon: "📑", label: "Mon dossier scolaire", path: "/student-dossier" },
        { icon: "📚", label: "Mes cours", path: "/courses" },
        { icon: "📅", label: "Mon emploi du temps", path: "/schedule" },
      ],
    },
    {
      section: "Suivi académique",
      items: [
        { icon: "📝", label: "Mes notes", path: "/grades" },
        { icon: "🧭", label: "Parcours académique", path: "/student/pathway" },
        { icon: "📋", label: "Devoirs", path: "/assignments" },
        { icon: "✅", label: "Absences", path: "/attendance" },
      ],
    },
    {
      section: "Informations",
      items: [
        { icon: "📢", label: "Annonces", path: "/announcements" },
        { icon: "📁", label: "Documents", path: "/documents" },
        { icon: "💬", label: "Messages", path: "/messages" },
        { icon: "🔔", label: "Notifications", path: "/notifications" },
        { icon: "💳", label: "Frais de scolarité", path: "/tuitions" },
        { icon: "🎓", label: "Bourses", path: "/scholarships" },
      ],
    },
  ],
};

export default function Sidebar({ user }) {
  const location = useLocation();
  const canonical = getCanonicalRole(user);
  const navRole = canonical ? sidebarNavKey(canonical) : "unknown";
  const sections = navConfig[navRole] || navConfig.unknown;
  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const label = canonical ? roleLabel(canonical) : "Rôle à mettre à jour";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">SC</div>
        <span className="sidebar-logo-text">Scolarite</span>
        <span className="sidebar-logo-badge">pro</span>
      </div>

      {sections.map((sec) => (
        <div className="sidebar-section" key={sec.section}>
          <div className="sidebar-section-label">{sec.section}</div>
          {sec.items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item${location.pathname === item.path ? " active" : ""}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
              {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
            </Link>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || "Utilisateur"}</div>
            <div className="sidebar-user-role">{label}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
