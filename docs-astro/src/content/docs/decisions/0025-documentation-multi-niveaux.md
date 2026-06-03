---
title: 0025 — Documentation à plusieurs niveaux (surface, profondeur, inline)
---

## Contexte

La documentation du monorepo doit servir des audiences aux besoins
opposés sans qu'aucune ne paie le prix de l'autre :

- un **néophyte** (agent administratif, étudiant en stage, contributeur
  occasionnel) qui veut comprendre _ce que fait_ une app ou un service,
  sans prérequis technique ;
- un **expert** (développeur qui étend ou intègre un composant) qui veut
  les détails d'implémentation, les compromis et les références pour
  aller plus loin.

[ADR 0013](0013-documentation-public-non-expert-fr) a déjà tranché la
**langue** (français) et a posé que la documentation vise un **public
non-expert**. Mais elle ne dit pas _comment cohabitent_ l'exigence
d'accessibilité et le besoin de détail technique : à trop vouloir tout
mettre au niveau néophyte, on appauvrit la doc experte ; à l'inverse, une
doc uniformément technique exclut le néophyte que 0013 veut servir.

Il manque aussi une règle d'**emplacement** : sans convention, les mêmes
informations se dispersent entre README, `docs/`, commentaires de code et
TODO, et personne ne sait où une information donnée _doit_ vivre ni quand
elle doit être mise à jour.

L'ambiguïté la plus coûteuse est le slogan « la doc doit tout expliquer ».
Pris au pied de la lettre, il pousse à paraphraser le code en commentaires
— bruit qui périme à la première refonte. Pris trop large, il justifie
l'absence de doc. Il faut le borner.

## Décision

La documentation est structurée en **trois niveaux**, chacun avec une
audience, un emplacement et un contenu attendus. Le niveau détermine où
une information donnée doit vivre.

### Niveau 1 — Surface (néophyte)

- **Audience** : non-expert (cf. [ADR 0013](0013-documentation-public-non-expert-fr)).
- **Emplacement** : `README.md` racine, `README.md` de chaque app/service,
  pages d'accueil sous `docs/`.
- **Contenu** : ce que fait le composant, à quoi il sert, comment il
  s'utilise, avec **exemples concrets**. Tout terme technique non trivial
  est défini sur place ou pointé vers
  [`docs/glossary.md`](../glossary) (règle héritée de 0013). Les
  conséquences implicites d'un choix sont rendues explicites.
- **Applications en bout de chaîne** : la doc de surface décrit comment
  les apps consommatrices interagissent avec les services/composants et
  ce qu'elles en retirent — la valeur se lit depuis l'usage, pas depuis
  l'implémentation.

### Niveau 2 — Profondeur (expert)

- **Audience** : développeur qui intègre, étend ou audite.
- **Emplacement** : `docs/architecture/`, `docs/quality/`,
  `docs/collaboration/`, et les ADR sous `docs/decisions/` pour le
  _pourquoi_.
- **Contenu** : détails techniques, choix de conception et compromis,
  références pour approfondir. Y figurent explicitement :
  - les **garanties** de qualité / sécurité / performance, documentées
    avec preuves ou liens (résultats de CI, ADR, audits) — **pas** en
    registre promotionnel ;
  - les **bibliothèques** développées ou importées : pourquoi ce choix,
    comment elles sont utilisées, **alternatives écartées** et raison de
    l'écart (le _pourquoi_ durable relève de l'ADR ;
    cf. [README ADR]()) ;
  - les **limites et risques** des choix techniques, les mesures
    d'atténuation, et les **recommandations** pour qui veut étendre.

### Niveau 3 — Inline (dans le code)

- **Audience** : développeur lisant le code.
- **Emplacement** : commentaires, JSDoc/TSDoc dans le code source.
- **Contenu** : **concis**. Documente l'**intention**, les invariants,
  et surtout les **dérogations** aux principes généraux (« pourquoi ce
  code s'écarte de la règle ici »). Ne paraphrase pas ce que le code dit
  déjà ; n'explique pas un principe général que sa documentation de
  niveau 2 porte déjà.

### Portée du « tout expliquer »

« Documenter tout ce qui se passe » signifie : **exposer les principes
généraux une fois** (au niveau adéquat) et **détailler chaque
dérogation** là où elle survient, avec sa raison. Exemple : la stratégie
de tests (unitaires, intégration, performance) est décrite une fois en
niveau 2 ; un test qui s'écarte de cette stratégie porte un commentaire
inline expliquant pourquoi. Cela **n'autorise pas** la paraphrase du code.

### Échelle monorepo

La documentation suit la hiérarchie du dépôt : racine → catégorie
(cf. [ADR 0002](0002-monorepo-huit-categories)) → paquet →
sous-module. L'information vit au niveau le plus spécifique qui la
contient entièrement ; elle n'est pas dupliquée vers le haut.

### Déclencheur de mise à jour

Une PR qui modifie le comportement, l'API ou les dépendances d'un
composant **met à jour la documentation du même niveau dans la même PR**.
La doc n'est pas un chantier différé : elle fait partie du changement.

## Statut

Accepted (2026-06-01). Complète [ADR 0013](0013-documentation-public-non-expert-fr)
(langue et public) sans la remplacer.

## Conséquences

**Bénéfices.** Chaque audience trouve son niveau sans subir l'autre. Une
information a un emplacement canonique, ce qui réduit la dispersion et les
doublons. Le « tout expliquer » est borné : on documente intentions et
dérogations, pas la paraphrase, ce qui limite la doc qui périme.

**Prix à payer.** Maintenir trois niveaux cohérents demande de la
discipline : un même changement peut toucher README (surface), `docs/`
(profondeur) et un commentaire (inline). La frontière surface/profondeur
reste un jugement, pas une règle mécanique.

**Garde-fous.**

- Les revues de documentation vérifient que l'information est au **bon
  niveau** (un détail d'implémentation dans un README de surface, ou un
  commentaire qui paraphrase le code, est un écart à signaler).
- Toute PR qui change comportement / API / dépendances d'un composant
  met à jour la doc correspondante dans la même PR.
- Le _pourquoi_ durable d'un choix de bibliothèque ou d'architecture va
  en ADR, pas en commentaire inline (cf. [README ADR]()).
- Voir aussi [ADR 0012](0012-neutralisation-framing-institutionnel)
  (neutralisation du framing) : les garanties se documentent avec
  preuves, pas en registre promotionnel.
