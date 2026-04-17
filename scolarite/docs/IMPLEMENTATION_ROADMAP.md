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

- Etudiant:
  - Dashboard personnalise (cours, planning, notes, annonces, notifications).
  - Parcours academique: credits acquis/restants.
  - Simulateur de moyenne (projection apres prochaine note).
  - Demandes + pieces jointes + suivi historique.
  - Paiements + recus.
- Enseignant:
  - Dashboard des cours enseignes, seances, annonces.
  - Saisie notes + import CSV + suivi devoirs.
  - Presence par seance avec chargement automatique des etudiants du cours.
  - Indicateurs risque (devoirs en retard comme signal operationnel initial).
- Admin/Scolarite:
  - Referentiels (facultes, departements, filieres, niveaux, semestres, modules, salles).
  - Workflow multi-niveaux et operations de masse.
  - Pilotage via espace administrateur et rapports.

## Phase 3 - Communication, BI, gouvernance

- Messagerie:
  - Conversations internes (en place) + extension pieces jointes a finaliser.
- Notifications multi-canal:
  - In-app (en place), email/SMS en extension.
  - Preferences utilisateur (en place).
- BI:
  - Dashboards direction + qualite (endpoints disponibles).
  - Alertes automatiques: regles metier a etendre.
  - Exports PDF/Excel + API BI externe: progression par increments.

## Definition of Done par module

- API + tests backend
- UI + tests e2e
- RBAC teste
- Logs/audit actifs
- Exports valides
- Documentation utilisateur/admin
