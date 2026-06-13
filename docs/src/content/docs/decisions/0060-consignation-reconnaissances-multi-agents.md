---
title: "0060 — Consignation des reconnaissances multi-agents pré-implémentation"
---

## Contexte

L'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/) a cadré l'**audit
transverse** : un workflow multi-agents (Claude Code) qui lit le code et vérifie ses
constats de manière adversariale, produisant un rapport **daté et figé** dans
[`docs/audit/`](/atlas/audit/), conduit **chaque trimestre** et comparé au précédent.

Mais le même outil — un workflow d'agents en éventail (fan-out de lecture, vérification
adversariale, synthèse) — sert un **second usage**, distinct et de plus en plus fréquent :
la **reconnaissance ponctuelle avant d'écrire du code**. Avant chaque lot du chantier
producteur `researchers` ([plan](/atlas/plans/2026-06-11-producteur-researchers/),
[ADR 0059](/atlas/decisions/0059-mart-researchers-author-id-grain/)), une reconnaissance
a cartographié le terrain réel (modèles dbt existants pris comme gabarits, forme exacte
du brut, état des fixtures, frontières entre lots), levé les points durs que le plan
laissait « à confirmer sur le code », et rendu un verdict **GO / NO-GO** assorti des
décisions à trancher avec le mainteneur.

Ces reconnaissances ont une **valeur de trace** : elles expliquent _pourquoi_ le code a
pris la forme qu'il a (quel gabarit suivi, quelle hypothèse retenue faute de preuve dans
le repo, quel seuil choisi et contre quelle alternative). Or, conduites en session, elles
**s'évaporent** dans l'historique de conversation — la décision survit dans le code et les
ADR, mais le _cheminement vérifié_ qui y a mené n'est consigné nulle part. Rien ne dit non
plus _quand_ en produire une, ni _quoi_ y mettre, ni _où_ la ranger. L'audit transverse a
sa cadence et son dossier ; la reconnaissance pré-lot n'a ni l'un ni l'autre.

Deux écueils si on ne tranche pas :

1. **Confusion avec l'audit transverse.** Les ranger pêle-mêle brouillerait la cadence
   trimestrielle de l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/) (un
   audit transverse mesure _l'état du dépôt_ ; une reconnaissance prépare _un changement
   précis_) et fausserait la comparaison T vs T-1.
2. **Sur-process.** Imposer un compte-rendu pour la moindre exploration tuerait l'outil :
   la plupart des recons sont jetables (vérifier un fait, localiser un symbole).

## Décision

> **Une reconnaissance multi-agents conduite pour préparer un changement
> _structurant_ est consignée dans un compte-rendu daté sous `docs/audit/`, distinct
> de l'audit transverse trimestriel. La consignation est réservée aux reconnaissances
> dont le résultat oriente une décision ou un lot de travail ; les explorations jetables
> ne sont pas consignées.**

En conséquence :

- **Même dossier, deux natures.** Les comptes-rendus de reconnaissance vivent dans
  [`docs/audit/`](/atlas/audit/), aux côtés des audits transverses, sous la convention
  existante (`YYYY-MM-DD-titre.md`, frontmatter `title`, entrée dans
  [`audit/index.md`](/atlas/audit/)). La colonne **Méthode** de l'index dit déjà la
  nature ; on y ajoute le type (**reconnaissance** vs **audit transverse**) pour ne pas
  les confondre. La cadence trimestrielle de l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)
  **ne s'applique qu'aux audits transverses** : une reconnaissance est par nature
  hors-calendrier, déclenchée par le travail qu'elle prépare.
- **Critère de consignation (le « structurant »).** On consigne quand la reconnaissance
  remplit **au moins un** de ces critères : elle précède un **lot livrable** (PR) d'un
  chantier planifié ; elle **tranche une hypothèse** que le plan ou l'ADR laissait à
  confirmer sur le code ; elle rend un **GO / NO-GO** assorti de décisions du mainteneur.
  Sinon (localiser du code, vérifier un fait isolé, explorer une piste abandonnée) : pas
  de compte-rendu.
- **Contenu minimal.** Un compte-rendu porte : l'**objectif** (le changement préparé) ;
  les **agents lancés** (axes de recherche, en éventail) ; les **constats** prouvés par
  le code (`chemin:ligne`) ; les **hypothèses non confirmables depuis le repo**, dites
  comme telles (jamais inventées) ; les **décisions tranchées avec le mainteneur** et
  leurs alternatives écartées ; le **verdict GO / NO-GO**. Un gabarit réutilisable est
  fourni dans [`audit/index.md`](/atlas/audit/).
- **Honnêteté de la trace.** Un compte-rendu **ne prononce pas** de vérité sur le code
  qu'il ne prouve pas : une hypothèse de travail non vérifiée (ex. la forme exacte d'un
  brut absent du repo, validée plus tard au banc réel) est étiquetée comme telle, fidèle
  à la [documentation vérifiable](/atlas/decisions/0028-documentation-verifiable/). C'est
  une trace **point-in-time** : elle reflète le terrain au moment de la reconnaissance,
  pas un état vivant.

### Frontière reconnaissance / audit transverse

|             | **Audit transverse** ([ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)) | **Reconnaissance** (cet ADR)         |
| ----------- | ---------------------------------------------------------------------------------- | ------------------------------------ |
| Mesure      | l'état du dépôt à un instant T                                                     | le terrain d'un changement précis    |
| Déclencheur | cadence trimestrielle (rappel automatisé)                                          | un lot/une décision à préparer       |
| Comparaison | T vs T-1 (dérive)                                                                  | aucune (jetée une fois le lot livré) |
| Sortie      | findings → issues/ADR/plan                                                         | GO/NO-GO + décisions du mainteneur   |

Les deux partagent l'outil (workflow multi-agents, vérification adversariale), le dossier
(`docs/audit/`) et l'exigence de preuve par le code — d'où le même foyer, distingués par
leur nature, pas séparés en silos.

## Statut

Accepted (2026-06-13). **Étend** l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)
(qui ne couvrait que l'audit transverse trimestriel) à un second usage du même outil, sans
le contredire : la cadence trimestrielle reste le plancher des audits transverses ; cet ADR
ajoute la consignation des reconnaissances ponctuelles. Ne remet en cause aucun ADR.

## Conséquences

**Bénéfices.**

- Le _cheminement vérifié_ qui mène à une décision survit au-delà de la session : on sait
  _pourquoi_ un lot a pris sa forme (gabarit suivi, hypothèse retenue, seuil choisi contre
  quelle alternative), pas seulement *ce qu'*il fait.
- La revue de PR dispose d'un contexte daté : une divergence assumée (ex. un seuil qui
  s'écarte du plan) est tracée et justifiée, pas lue comme une erreur.
- L'outil reste **léger** : seules les reconnaissances structurantes sont consignées, les
  explorations jetables ne paient aucun coût de process.

**Prix à payer.**

- Un compte-rendu a un **coût rédactionnel** (au-delà du coût en jetons de la
  reconnaissance elle-même) ; le critère « structurant » borne ce coût aux cas qui le
  méritent, au prix d'un **jugement** à chaque fois (où est la frontière du jetable ?).
- La trace est **point-in-time** et peut vieillir : un compte-rendu décrit le terrain au
  moment T, pas l'état courant — d'où l'étiquetage explicite des hypothèses non vérifiées.

**Garde-fous.**

- Un compte-rendu **ne prononce ni conformité ni vérité non prouvée** : il distingue le
  constat (cité `chemin:ligne`) de l'hypothèse (étiquetée), fidèle à l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/).
- La cadence trimestrielle de l'[ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)
  **n'est pas diluée** : une reconnaissance ne compte jamais comme l'audit transverse du
  trimestre (natures distinctes, marquées dans l'index).
- Les comptes-rendus respectent `pnpm audit:docs` (liens internes valides, page
  non-orpheline via l'autogenerate du dossier `audit/`) comme toute page de la doc.
