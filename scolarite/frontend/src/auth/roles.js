/**
 * Rôles canoniques alignés sur l’API Laravel (table roles + /me).
 * Une seule source de vérité pour éviter les conflits student/professor vs etudiant/enseignant.
 */
export const ROLE = {
  ETUDIANT: "etudiant",
  ENSEIGNANT: "enseignant",
  ADMIN: "admin",
};

const ALIASES = {
  student: ROLE.ETUDIANT,
  étudiant: ROLE.ETUDIANT,
  etudiant: ROLE.ETUDIANT,
  professor: ROLE.ENSEIGNANT,
  professeur: ROLE.ENSEIGNANT,
  enseignant: ROLE.ENSEIGNANT,
  administrator: ROLE.ADMIN,
  admin: ROLE.ADMIN,
  super_admin: ROLE.ADMIN,
  admin_scolarite: ROLE.ADMIN,
  adminscolarite: ROLE.ADMIN,
  chef_departement: ROLE.ADMIN,
  chefdepartement: ROLE.ADMIN,
  finance: ROLE.ADMIN,
  support: ROLE.ADMIN,
};

/**
 * @param {{ role?: string | { name?: string } } | null} user
 * @returns {'etudiant' | 'enseignant' | 'admin' | null}
 */
export function getCanonicalRole(user) {
  if (!user?.role) return null;
  const raw = typeof user.role === "string" ? user.role : user.role?.name;
  if (raw == null || raw === "") return null;
  const key = String(raw).toLowerCase().trim();
  if (ALIASES[key]) return ALIASES[key];
  if (["etudiant", "enseignant", "admin"].includes(key)) return key;
  return null;
}

export function roleLabel(canonical) {
  const map = {
    [ROLE.ETUDIANT]: "Étudiant",
    [ROLE.ENSEIGNANT]: "Enseignant",
    [ROLE.ADMIN]: "Administrateur",
  };
  return map[canonical] || canonical || "Utilisateur";
}

/** Clé pour la configuration de menu (Sidebar) */
export function sidebarNavKey(canonical) {
  if (canonical === ROLE.ADMIN) return "admin";
  if (canonical === ROLE.ENSEIGNANT) return "tutor";
  return "student";
}

/** Redirection après login / OTP */
export function defaultPathForRole(canonical) {
  if (canonical === ROLE.ADMIN) return "/admin";
  return "/dashboard";
}

/** Normalise un nom de rôle (API ou code) vers la forme canonique. */
export function normalizeRoleName(role) {
  if (role == null || role === "") return null;
  const k = String(role).toLowerCase().trim();
  if (ALIASES[k]) return ALIASES[k];
  if (["etudiant", "enseignant", "admin"].includes(k)) return k;
  return null;
}
