# Plan d execution (ordre optimal)

## Phase 0 - Stabilisation

- Lancer lint/build/e2e (frontend) + tests API auth (backend).
- Normaliser les roles (socle + aliases legacy).
- Appliquer middleware `role` et `permission` sur routes sensibles.
- Maintenir un dictionnaire fonctionnel unique.

## Phase 1 - Coeur academique

- Activer le modele hierarchique: faculte -> departement -> filiere -> niveau -> semestre -> module.
- Gérer prerequisites modules (many-to-many).
- Gérer groupes TD/TP, regles d affectation et capacites.
- Etendre planning (timeslots, conflits, export ICS).
- Planifier examens (normale/rattrapage), allocations salle/surveillants, PV.

## Phase 2 - Portails metier

- Etudiant: dashboard, parcours, simulateur moyenne, demandes + PJ, paiements.
- Enseignant: contenus, annonces, saisie notes, import CSV, suivi risques.
- Admin/Scolarite: referentiels, workflow multi-niveaux, operations de masse.

## Phase 3 - Communication, BI, gouvernance

- Messagerie, notifications multi-canal, preferences utilisateur.
- Dashboards direction + qualite + alertes automatiques.
- Exports PDF/Excel + API BI externe.

## Definition of Done par module

- API + tests backend
- UI + tests e2e
- RBAC teste
- Logs/audit actifs
- Exports valides
- Documentation utilisateur/admin
