---
title: "0028 — Documentation vérifiable : un miroir contrôlable du code"
---

## Contexte

La politique de documentation du monorepo est posée par trois ADR :
[0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) (français, public
non-expert, termes définis), [0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/)
(ton factuel, pas de registre promotionnel) et
[0025](/atlas/decisions/0025-documentation-multi-niveaux/) (trois niveaux : surface,
profondeur, inline). Ces ADR disent **comment écrire** la documentation. Aucune
ne dit comment **empêcher qu'elle dérive** du code.

Deux manques en découlaient :

- **Rien ne reliait la doc au code par une garantie mécanique.** Tout le reste
  du dépôt est audité (structure, licences, code mort, couverture…) ; la
  documentation, elle, ne l'était pas. Une dépendance inter-paquet pouvait
  changer sans que la doc le reflète, un README pouvait référencer un ADR
  renommé, une page pouvait devenir injoignable — sans que la CI bronche.
- **La structure _spécifique_ du code n'était lisible nulle part.** La
  structure _générale_ (les huit catégories) était décrite dans
  [`architecture/monorepo`](/atlas/architecture/monorepo/), mais aucune page ne
  disait _quel paquet fait quoi_, _qui dépend de qui_, ni _par où entrer dans
  le code_. Un expert devait fouiller le code pour se faire une idée.

L'objectif : qu'on puisse **reconstruire la structure du monorepo et entrer
dans le code par le bon endroit en lisant seulement la documentation**, et que
**toute dérive casse la CI**.

## Décision

> **La documentation est un miroir contrôlable du code.** Ce qui est _factuel
> et dérivable du code_ est **généré** et vérifié à jour en CI. Ce qui est
> _rédigé_ reste manuel mais est **audité** (présence, structure, liens,
> cohérence avec `package.json`). On ne génère jamais de prose ; on n'audite
> jamais la qualité rédactionnelle.

Ce principe **étend** [0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) /
[0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/) /
[0025](/atlas/decisions/0025-documentation-multi-niveaux/) (il ne les remplace pas) avec la
dimension _vérifiable / anti-dérive_.

### Ce qui est généré (factuel)

- **La carte des paquets** — [`architecture/packages`](/atlas/architecture/packages/)
  est produite par `scripts/docs/generate-packages-map.mjs` à partir des
  `package.json`. Par paquet : rôle, catégorie, dépendances internes,
  consommateurs, lien README, plus un graphe par catégorie. Le fichier est
  **commité** (pas gitignoré) pour permettre un contrôle de fraîcheur par diff.
- **La référence API** — `docs/api/**` est produite par TypeDoc
  (`pnpm docs:api`) à partir des signatures et de la JSDoc du code. Elle liste
  les exports publics de chaque paquet publiable. Le dossier est **gitignoré**
  (volumineux) ; il est régénéré à chaque build de la doc.

### Ce qui est audité (rédigé)

`scripts/audit/documentation.mjs` (`pnpm audit:docs`) vérifie des invariants
**structurels**, jamais la qualité d'écriture :

- README présent pour tout paquet publiable, avec un titre H1 cohérent avec le
  nom du paquet et un paragraphe de description ;
- liens relatifs internes valides (README et pages `docs/`) ;
- ADR référencé (cible d'un lien) existant ;
- page `docs/**` non orpheline (joignable depuis la nav VitePress).

Des règles non bloquantes (avertissements) mesurent la dette sans l'imposer :
description `package.json`, sous-chemins `exports` et commandes `bin` mentionnés
au README.

### Comment la dérive est empêchée

- **Carte périmée → CI rouge.** `pnpm docs:generate:check` régénère la carte en
  mémoire et la compare au disque (modèle `check-lockfile`). Changer une
  dépendance inter-paquet sans régénérer échoue en hook pre-push **et** en CI.
- **Doc incohérente → CI rouge.** `pnpm audit:docs` tourne en hook pre-push
  (quand un README, une page docs ou la nav change) et dans le job Audit.
- **Paquet absent de l'API → CI rouge.** `pnpm docs:api:check` vérifie que les
  `entryPoints` TypeDoc correspondent aux paquets publiables réels.

### Exception assumée : la référence API est en anglais

La référence générée par TypeDoc est **en anglais** — le code et ses
commentaires le sont. C'est une entorse délibérée à
[ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) (qui veut du français),
justifiée par le fait que cette zone est **dérivée du code, non rédigée** : la
traduire reviendrait à maintenir à la main ce qui doit rester généré. Elle est
**cantonnée** à la section « Référence API » de la navigation, balisée comme
générée et anglaise, et destinée au niveau Inline/expert de
[ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/). Le reste de la documentation
reste français.

## Statut

Accepted (2026-06-01). Complète [0013](/atlas/decisions/0013-documentation-public-non-expert-fr/),
[0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/) et
[0025](/atlas/decisions/0025-documentation-multi-niveaux/) sans les remplacer.

> **Amendé par [0037](/atlas/decisions/0037-retrait-reference-api-typedoc/).** Le
> volet « référence API générée par TypeDoc » décrit ci-dessous a été **retiré** :
> les signatures publiques restent documentées par les README et la JSDoc, et
> l'anti-dérive des liens est désormais assurée par `starlight-links-validator`.
> Le reste de cet ADR (carte des paquets générée, audit de la doc rédigée)
> demeure en vigueur.

## Conséquences

**Bénéfices.** La structure spécifique du code (qui fait quoi, qui dépend de
qui) est lisible depuis la doc, et un expert sait par où entrer
([`architecture/comprendre-le-code`](/atlas/architecture/comprendre-le-code/)).
La doc ne peut plus dériver en silence : carte périmée, lien mort, ADR fantôme
ou page orpheline cassent la CI. La frontière généré / rédigé est nette, donc
on ne génère pas de prose et on n'audite pas le style.

**Prix à payer.** Le générateur de carte doit produire exactement le style
Prettier, sinon le contrôle de fraîcheur boucle. L'audit des liens et des
pages orphelines lit la nav VitePress par analyse textuelle : il faudra le
faire évoluer si la nav devient programmatique. La référence API ajoute une
zone anglaise dans une doc française — exception bornée, pas tendance.

**Dettes connues, non résolues par ce chantier.**

- La plupart des README de paquets sont **rédigés en anglais**, alors que
  [ADR 0013](/atlas/decisions/0013-documentation-public-non-expert-fr/) demande le français.
  L'audit vérifie leur _structure_ (présence, titre, liens), **pas leur
  langue** : les traduire est un travail rédactionnel séparé.
- Les avertissements de `audit:docs` (exports / bin non mentionnés) ne sont pas
  bloquants : ils mesurent un écart qu'on pourra promouvoir en règle bloquante
  quand les README l'auront résorbé.

**Garde-fous.**

- `pnpm docs:generate:check`, `pnpm audit:docs` et `pnpm docs:api:check` sont
  branchés dans le job Audit de la CI et en hook pre-push.
- Toute PR qui modifie un `package.json`, un README ou une page docs régénère
  la carte et passe l'audit dans la **même PR** (cf.
  [ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/), déclencheur de mise à jour).
