# Dictionnaire Fonctionnel Unique

Ce dictionnaire normalise les termes de la plateforme.

## Structure academique

- **Faculte**: entite academique racine regroupant des departements.
- **Departement**: unite pedagogique rattachée a une faculte.
- **Filiere (Program)**: parcours d etudes (ex: Informatique, Gestion).
- **Niveau (Level)**: annee d etude (L1, L2, M1, M2...).
- **Semestre**: periode academique du niveau (S1, S2...).
- **Module**: unite pedagogique avec credits, coefficient et type d evaluation.
- **Prerequis**: module requis avant inscription a un autre module.

## Enseignement et suivi

- **Cours**: instance d enseignement rattachee a un module/programme.
- **Groupe TD/TP**: sous-groupe d etudiants pour travaux diriges/pratiques.
- **Affectation de groupe**: association etudiant -> groupe selon regles/capacite.
- **Emploi du temps**: planification des seances par groupe/enseignant/salle.
- **Conflit planning**: collision de salle, enseignant ou groupe.

## Evaluations et examens

- **Evaluation CC/TP/Examen**: types de controle utilises dans le calcul final.
- **Session normale**: session d examen principale.
- **Session rattrapage**: session de seconde chance.
- **PV (Proces-verbal)**: rapport officiel de session/examen.

## Administratif

- **Demande administrative**: attestation, releve, reclamation note, report.
- **SLA**: delai cible de traitement d une demande (ex: 72h).
- **Historique de statut**: journal des transitions de workflow.
- **Piece jointe**: document justificatif rattache a une demande.

## Finance

- **Echeance**: montant attendu a une date donnee.
- **Paiement**: transaction effectuee.
- **Recu**: justificatif PDF de paiement (potentiellement signe + QR).

## Gouvernance et qualite

- **RBAC**: controle d acces par roles/permissions.
- **Audit log**: trace non modifiable des actions sensibles.
- **Export BI**: extraction de donnees pour tableaux de bord externes.
