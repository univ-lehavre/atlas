# 0026 — Périmètre RGPD hors dépôt, questions ouvertes

## Contexte

La PR #127 a retiré du périmètre du dépôt la documentation RGPD, sur le
principe « le repo est du code, pas une politique de conformité ». La
question ressurgit régulièrement (que faire des métadonnées de commit,
des données collectées par les apps déployées, des logs Appwrite ?) sans
qu'une décision de cadrage n'ait été actée — elle vivait jusqu'ici comme
un item « à arbitrer » dans `TODO.md`, fichier supprimé en fin de plan de
résorption.

Sans cadrage écrit, deux dérives : soit on tente d'écrire une politique
RGPD dans le dépôt (hors compétence, hors responsabilité du code), soit
la question reste invisible et personne ne sait qui en répond.

## Décision

**Le périmètre RGPD est hors du dépôt `atlas`.** Le dépôt contient du
code et de l'outillage ; il n'est pas le lieu d'une politique de
protection des données à caractère personnel. La responsabilité du
traitement incombe vraisemblablement à **l'institution exploitante / aux
opérateurs d'infrastructure** (qui déploient les apps et hébergent
Appwrite), pas au dépôt lui-même.

Cette décision n'est pas un refus de traiter le sujet : c'est un cadrage
qui dit **où** il doit être traité (politique institutionnelle, hors
repo) et qui acte les **questions ouvertes** ci-dessous comme relevant
d'une décision projet future, pas d'un chantier code.

### Questions ouvertes (pour décision future)

1. **Métadonnées des commits** (emails de contributeurs externes) :
   suffit-il d'un renvoi vers la politique GitHub, ou faut-il une mention
   propre ?
2. **Données collectées par les apps déployées** (amarre, ecrin,
   find-an-expert) : relèvent des apps elles-mêmes — où les documenter
   (politique par app ? page institutionnelle ?) ?
3. **Dépendances tierces appelant des services externes** (OpenAlex,
   Appwrite…) : à inventorier comme sous-traitants potentiels.
4. **Logs Appwrite** (IP, user-agent) : qui est responsable de
   traitement, et avec quelle rétention ?
5. **Forme du livrable** : un `PRIVACY.md` racine ? une politique par
   app ? un renvoi vers une politique institutionnelle existante ?
6. **Responsable de traitement** : à identifier explicitement
   (probablement les opérateurs d'infrastructure, pas le dépôt).

## Statut

Accepted (2026-06-01).

## Conséquences

**Bénéfices.** La question RGPD a un lieu de décision identifié (hors
repo) et une trace écrite de son cadrage. On ne tente plus d'écrire une
politique de conformité dans du code. Les six questions ouvertes sont
nommées pour que le jour où une demande de conformité arrive, le travail
préparatoire soit déjà fait.

**Prix à payer.** Aucune politique RGPD n'est produite par cette
décision : si une obligation légale ou un audit l'exige, le travail
reste entier (mais cadré). Le risque est qu'une donnée personnelle soit
traitée sans politique formelle tant que l'arbitrage institutionnel n'a
pas eu lieu.

**Garde-fous.**

- Une demande de conformité, un audit RGPD, ou la collecte d'un nouveau
  type de donnée personnelle par une app déployée rouvre cette décision.
- L'item de suivi opérationnel correspondant (Phase 5.1) figure dans le
  tableau sine die de [ADR 0001](0001-devsecops-perimetre-repo-sine-die.md).
- `SECURITY.md` peut, si besoin, renvoyer vers une politique
  institutionnelle une fois celle-ci désignée.
