# Documentation

Atlas se documente selon une politique unique, qui répond à trois
questions : **dans quelle langue et pour qui** écrire, **comment
organiser** les différents niveaux de détail, et **quel ton** adopter.
Chaque réponse est tracée par une _décision d'architecture_ (ADR) ; cette
page consolide la politique et renvoie aux ADR pour le _pourquoi_.

<DocBadge />

> Une ADR (_Architecture Decision Record_) note **pourquoi** un choix a
> été fait, son contexte et l'alternative écartée. Cette page note
> **comment** appliquer ces choix au quotidien.

## Langue et public

La documentation narrative du monorepo est rédigée **en français** et
pour un **public non-expert** : agent administratif, étudiant en stage,
contributeur occasionnel, autant que développeur confirmé.

Tout terme technique non trivial est **défini sur place** à sa première
occurrence, ou pointé vers le [glossaire](../glossary.md) qui regroupe les
définitions transverses.

Le code, les API et les identifiants restent en anglais (conventions du
Web) : la règle porte sur la documentation, pas sur le code.

→ [ADR 0013 — Documentation pour public non-expert, en français](../decisions/0013-documentation-public-non-expert-fr.md)

## Trois niveaux de documentation

Une même information a un emplacement canonique. Le **niveau** détermine
où elle vit, pour quelle audience, et avec quel degré de détail.

| Niveau         | Audience                   | Emplacement                                                                              | Contenu                                                                                                                                               |
| -------------- | -------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Surface**    | Néophyte                   | `README.md` (racine, apps, services), pages d'accueil sous `docs/`                       | Ce que fait le composant, à quoi il sert, comment l'utiliser, avec exemples concrets                                                                  |
| **Profondeur** | Expert                     | `docs/architecture/`, `docs/quality/`, `docs/collaboration/`, ADR sous `docs/decisions/` | Détails techniques, choix de conception, compromis, garanties (qualité / sécurité / perf), bibliothèques et alternatives écartées, limites et risques |
| **Inline**     | Développeur lisant le code | Commentaires, JSDoc/TSDoc                                                                | Intention, invariants, et surtout **dérogations** aux principes généraux — concis                                                                     |

**Portée du « tout expliquer ».** Documenter ne veut pas dire paraphraser
le code. On expose les principes généraux **une fois** au niveau adéquat,
puis on détaille chaque **dérogation** là où elle survient, avec sa
raison. Exemple : la stratégie de tests est décrite une fois en niveau
profondeur ([docs/quality/tests.md](tests.md)) ; un test qui s'en écarte
porte un commentaire inline expliquant pourquoi.

**Échelle monorepo.** La documentation suit la hiérarchie du dépôt :
racine → catégorie → paquet → sous-module. L'information vit au niveau le
plus spécifique qui la contient entièrement ; elle n'est pas dupliquée
vers le haut.

**Déclencheur de mise à jour.** Une PR qui modifie le comportement, l'API
ou les dépendances d'un composant met à jour la documentation du même
niveau **dans la même PR**. La doc fait partie du changement, pas d'un
chantier différé.

→ [ADR 0025 — Documentation à plusieurs niveaux (surface, profondeur, inline)](../decisions/0025-documentation-multi-niveaux.md)

## Ton : factuel, non promotionnel

La documentation présente le dépôt pour ce qu'il est techniquement — un
monorepo d'applications et de bibliothèques — sans framing institutionnel
superflu ni registre promotionnel. Les garanties de qualité, de sécurité
ou de performance se documentent **avec preuves ou liens** (résultats de
CI, ADR, audits), pas en affirmations valorisantes.

L'ancrage institutionnel se limite à l'organisation GitHub
`@univ-lehavre`, la licence et le propriétaire, et les plateformes
externes quand elles ont un sens technique direct.

→ [ADR 0012 — Neutralisation du framing institutionnel](../decisions/0012-neutralisation-framing-institutionnel.md)

## En revue de documentation

Une contribution documentaire est relue sur ces critères :

- **Bon niveau** — un détail d'implémentation dans un README de surface,
  ou un commentaire inline qui paraphrase le code, est un écart.
- **Accessibilité** — un nouveau contributeur sans contexte comprendrait-il
  cette page ? Tout terme technique est défini ou pointé vers le glossaire.
- **Ton factuel** — pas de framing institutionnel superflu, pas de
  registre promotionnel ; les garanties sont étayées.
- **Mise à jour synchrone** — la doc accompagne le changement de code dans
  la même PR.

## ADR liées

| ADR                                                                | Question tranchée        |
| ------------------------------------------------------------------ | ------------------------ |
| [0012](../decisions/0012-neutralisation-framing-institutionnel.md) | Ton et framing           |
| [0013](../decisions/0013-documentation-public-non-expert-fr.md)    | Langue et public         |
| [0025](../decisions/0025-documentation-multi-niveaux.md)           | Niveaux de documentation |
