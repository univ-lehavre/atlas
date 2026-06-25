---
title: "0078 — Barre latérale thématique, navigation Diátaxis intra-catégorie"
---

## Contexte

L'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/) a adopté **Diátaxis** comme
axe d'**intention** — un principe de **rédaction** (une page sert _un_ mode dominant : tutorial,
how-to, reference ou explanation ; on **renvoie** vers les autres modes plutôt que de les recopier).
Il n'imposait **pas** une arborescence de navigation par mode : son esquisse de barre latérale par
intention était « **volontairement non câblée** », explicitement renvoyée à un plan de mise en œuvre.

L'[ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/) a, lui, **câblé** une
barre latérale **par intention** (groupes « Apprendre / Faire / Consulter / Comprendre ») et, pour
compenser l'éclatement thématique que cela provoque, ajouté deux **portails** d'orientation
(`quality/bonnes-pratiques`, `quality/gouvernance`) plus un accueil-vitrine.

À l'usage, le regroupement par intention **éclate les sujets**. `architecture/packages` (reference)
atterrit dans « Consulter », loin du reste d'`architecture/*` (explanation) dans « Comprendre » ;
`quality/*` se répartit sur trois groupes. Un lecteur qui pense « architecture » ou « sécurité » ne
trouve plus son sujet d'un bloc. Or — c'est le constat qui motive le présent ADR — **Diátaxis
prescrit des principes de rédaction, jamais une arborescence de navigation par mode** : ranger la
barre latérale par intention était une option, pas une obligation de la doctrine. Le besoin réel —
qu'un lecteur retrouve un **sujet** d'un bloc — est mieux servi par une barre latérale **thématique**.

Les deux **portails** de l'ADR 0076 n'existaient que pour **recoudre** les sujets que la navigation
par intention découpait. Une barre latérale thématique les rend **redondants** : le portail
« Gouvernance » double la catégorie qui réunit Décisions + Audits + Plans ; le portail « Bonnes
pratiques » double les conventions désormais rangées dans leurs catégories thématiques.

Précédent maison de **révision partielle** : l'[ADR 0037](/atlas/decisions/0037-retrait-reference-api-typedoc/)
a amendé une décision antérieure « sur le seul point » d'une couche, le reste demeurant en vigueur.
On reprend ce patron.

## Décision

> **La barre latérale redevient THÉMATIQUE, organisée par domaine d'ingénierie : Architecture & code,
> Données & modèles (RGPD), Tests & qualité, Sécurité, Contribuer & livrer, et Gouvernance (qui réunit
> Décisions + Audits + Plans). Les principes Diátaxis de l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
> restent appliqués en RÉDACTION. La navigation Diátaxis se matérialise « dans une même page » par
> l'ORDRE des entrées au sein de chaque catégorie — d'abord _comprendre_ (explanation), puis
> _consulter_ (reference), puis _faire_ (how-to) —, jamais affiché en badge au lecteur. Les deux
> portails de l'[ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/) sont
> RETIRÉS, leur fonction de recouture étant désormais portée par la structure thématique elle-même.**

### Six catégories par domaine

Le découpage range chaque page par **domaine d'ingénierie réel**, ce qui démantèle le fourre-tout
`quality/` (sécurité, tests, accessibilité, conventions, indicateurs… n'ont pas à cohabiter) :

1. **Architecture & code** — structure du monorepo, lecture du code, flux de données, choix
   techniques ; conventions de code et politique de documentation ; carte des paquets (reference).
2. **Données, modèles & RGPD** — modèle d'uplift, ré-dérivabilité mart/index (opposition RGPD). Ouverte
   dès maintenant : ce domaine grossira (ingestion, MLOps, veille médiatique).
3. **Tests & qualité** — stratégie de test, matrice de couverture, tableau de bord, preuves,
   accessibilité.
4. **Sécurité** — garde-fous et conventions de sécurité ; réponse à incident.
5. **Contribuer & livrer** — prise en main (tutoriel) ; flux de contribution, environnement, CLIs,
   paramétrage GitHub ; pipeline CI et hooks ; checklist de mise en service et releases.
6. **Gouvernance** — bilan vérifiable (`normes`, en tête) ; Décisions (ADR), Audits & écarts, Plans.

Le glossaire reste un lien transverse en pied de barre latérale ; l'accueil (`index.mdx`) reste la
page splash racine.

### Navigation Diátaxis intra-catégorie : ordre, pas badge

Au sein d'une catégorie, les pages sont **ordonnées par intention** (comprendre → consulter → faire),
éventuellement via des **sous-sections nommées par thème** (« Comprendre le système », « Conventions
de code », « Chaîne de livraison »…) dont le contenu interne suit cette progression. Le mode n'est
**jamais** affiché au lecteur sous forme d'étiquette — l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
a écarté les badges (cargo-cult de Diátaxis). L'ordre vit dans les `items` explicites de la
configuration (`docs/astro.config.mjs`), au même endroit que la structure et lisible en revue —
**pas** dispersé dans le frontmatter de chaque page (qui dériverait et ne s'appliquerait de toute
façon pas aux collections datées autogénérées).

### Migration « config-only » au lancement

On réécrit le **seul** bloc `sidebar:` de `docs/astro.config.mjs`. **Aucun fichier n'est déplacé,
aucune URL ne change** : les pages restent sous leurs chemins actuels (`/atlas/quality/security/`
porte le libellé « Sécurité » sans déménager). Ce décalage URL ↔ libellé est une **dette assumée**,
résorbable plus tard par un déplacement physique des fichiers (avec redirections), hors du périmètre
du présent ADR.

## Alternatives écartées

- **Conserver la barre latérale par intention (ADR 0076).** Écartée : elle éclate les sujets, et le
  coût (le lecteur thématique perd son fil) dépasse le gain. Diátaxis n'imposait pas cette arborescence
  ([ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/) l'avait laissée « non câblée »).
- **Barre latérale thématique mais ordre par `sidebar.order` en frontmatter.** Écartée : disperse
  l'ordre dans des dizaines de frontmatters non vérifiés (dérive garantie) et **ne s'applique pas** aux
  collections datées en `autogenerate` (triées par date/numéro). Les `items` explicites obtiennent le
  même ordre, au même endroit que la structure.
- **Encart « Comprendre · Faire · Consulter » en tête de chaque page.** Écartée : recrée l'affichage
  du mode au lecteur que l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/) a
  rejeté, et multiplie les liens internes à maintenir.
- **Garder les portails.** Écartée : doublons de la structure thématique (Gouvernance double sa
  catégorie ; Bonnes pratiques double les conventions rangées par domaine).
- **Déplacer les fichiers dès maintenant pour des URLs parlantes.** Écartée à ce stade : impose
  redirections et recensement exhaustif des référents (liens internes, racine, ADR) pour un gain
  cosmétique ; à coupler à une future passe si elle a lieu, pas au lancement.

## Statut

Accepted (2026-06-25). **Amende** l'[ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/)
sur le **seul** volet « barre latérale par intention » (remplacée par une barre latérale thématique) et
**retire** les deux portails qu'il instaurait ; le **reste** de l'ADR 0076 — le patron « pointer, pas
recopier » (hérité de l'[ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)) et
l'accueil-vitrine mettant en avant [`quality/normes`](/atlas/quality/normes/) — **demeure en vigueur**.
**N'affecte pas** l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/), qui reste la
doctrine d'intention appliquée en **rédaction** (et qui n'avait jamais câblé de barre latérale par
mode). Vérifiabilité garantie par `pnpm audit:docs` ([ADR 0028](/atlas/decisions/0028-documentation-verifiable/))
et validation des liens par `pnpm docs:build`.

## Conséquences

**Bénéfices.** Le lecteur qui pense en thèmes retrouve son sujet d'un bloc ; le fourre-tout `quality/`
est démantelé par domaine. La navigation Diátaxis **survit**, portée par l'ordre intra-catégorie, sans
badge ni page surnuméraire. Deux portails redondants disparaissent. La bascule est un réordonnancement
d'affichage, **réversible d'un `git revert`**, sans aucune URL cassée.

**Prix à payer.** Un **décalage transitoire** entre l'URL (`/atlas/quality/security/`) et le libellé
de catégorie (« Sécurité »), tant qu'on ne déplace pas les fichiers. L'ordre intra-catégorie est posé
**à la main** dans la config (jugement de rédaction, comme le mode lui-même — non mécanisé). La
catégorie « Données & modèles » est **squelettique** au lancement (deux pages), pari assumé sur sa
croissance.

**Garde-fous.** `pnpm docs:build` (validation des liens) casse sur tout lien resté vivant vers un
portail retiré — il **force** le nettoyage de l'accueil. Le contrôle de pages orphelines (B9,
[ADR 0028](/atlas/decisions/0028-documentation-verifiable/)) reste satisfait : chaque page des dossiers
listés en `link:` y figure, et les collections datées restent couvertes par `autogenerate`. Le
principe « une page = un mode dominant » de l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/)
continue de garantir la cohérence interne des pages.
