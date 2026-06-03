---
title: "Ré-dérivabilité du mart et de l'index : propagation d'une opposition RGPD"
---

> Étape 0.2 du plan pipeline-collaborations. Spécifie **comment une opposition
> RGPD (art. 21) se propage** au mart Parquet (partitions immuables) et à l'index
> pgvector dérivé, **sans jamais réécrire une partition de production en place**.
>
> Cadre : [ADR 0029 — Architecture du pipeline collaborations](../decisions/0029-architecture-pipeline-collaborations)
> (immutabilité des partitions, contrat Parquet + `manifest.json`) et
> [ADR 0030 — Profilage de collaborations : gate RGPD, base légale et droit
> d'opposition](../decisions/0030-rgpd-profilage-collaborations)
> (ré-dérivabilité by-design, registre d'opposition, SLA).

---

## 0. Vocabulaire et invariant central

Il s'agit d'un **droit d'opposition au titre de l'article 21 du RGPD**, **pas**
d'un retrait de consentement. La base légale du traitement est l'**intérêt public
(art. 6.1.e)** et/ou l'**intérêt légitime (art. 6.1.f)** (ADR 0030) — **jamais le
consentement (art. 6.1.a)**. Conséquence directe : le modèle est **opt-out**
(toute personne du périmètre est profilée par défaut, **sauf** opposition
explicite), à l'inverse du dispositif PWA d'origine qui était opt-in. Cette
inversion de sémantique est **le seul renversement à opérer côté consommateur**
(voir §1.3).

**Invariant préservé sur tout ce document** (ADR 0029, Invariants) :

> Les partitions de production sont **strictement immuables**. Un rejeu écrit une
> **nouvelle** partition `dt=YYYY-MM/run=<id>/`, **jamais** de réécriture en
> place. Une opposition est honorée par **RÉGÉNÉRATION** (nouvelle partition
> courante filtrée) **+ MASQUAGE** (à la lecture, pour l'historique figé) **+
> PURGE/RECHARGE** de l'index dérivé — **jamais par mutation** d'une partition
> existante.

L'immuabilité reste un invariant de **traçabilité**, **pas un droit de
conservation indéfinie** (ADR 0030). Trois rôles distincts, à ne jamais
confondre :

| Objet                                                           | Rôle                                                                            | Autorité ?                                | Mutabilité                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| **Registre d'opposition**                                       | Source de vérité du **périmètre servi** (qui est exclu)                         | Autorité du **périmètre**, pas du contrat | Append-only + projection d'état                         |
| **Mart Parquet** (`s3://citation/marts/collab/dt=.../run=.../`) | Table de fait dérivée, **régénérable**                                          | **Non** autorité du contrat               | Partitions **immuables** ; on régénère un nouveau `run` |
| **`manifest.json`**                                             | **Contrat de transfert** (validé par `sha256` + `row_count` + `schema_version`) | **Seule autorité du contrat**             | Écrit en dernier, atomique, par run                     |
| **Index pgvector**                                              | Exploration / recherche, **dérivé du mart**                                     | **Jamais** source de vérité               | **Purgeable / rechargeable**                            |

---

## 1. Le registre d'opposition (a)

### 1.1 Réutilisation du dispositif `consent-events` réinterprété

Le dispositif d'événements horodatés de la PWA (`find-an-expert`) sert de
**registre d'opposition** une fois **réinterprété en opt-out**. Le patron
technique est directement transposable :

- **`consent-events`** (env `APPWRITE_CONSENT_EVENTS_COLLECTION_ID`) — journal
  d'audit **immuable**, append-only (uniquement `create` + `list`). Attributs
  réels : `userId` (string), `consentType` (string), `action`
  (`'grant'|'revoke'`), horodatage = champ système Appwrite `$createdAt`.
- **`current-consents`** (env `APPWRITE_CURRENT_CONSENTS_COLLECTION_ID`) —
  **projection d'état courant**, 1 ligne par couple (`userId`, `consentType`),
  attribut `granted` (boolean), dernière modif = `$updatedAt`. L'unicité du
  couple est garantie **uniquement** par la logique applicative read-then-write
  de `upsert` (`repository.ts:131`), **pas** par un index/contrainte Appwrite
  confirmable depuis le repo.

Ce double dispositif **log immuable + projection** est exactement le bon patron
pour un registre d'opposition auditable : trace horodatée de chaque action +
état courant requêtable par personne.

### 1.2 Comment on dérive la liste d'exclusion

La **liste d'exclusion** consommée par le pipeline et le service de lecture est
dérivée de l'**état courant** du registre (projection `current-consents`), pas du
log :

> `est_opposé(personne) ⇔ il existe, dans current-consents, une ligne pour cette
personne dont l'état d'opposition est actif.`

En réutilisant le dispositif existant tel quel, cela correspond à un
enregistrement courant avec l'action d'opposition active (voir §1.3 pour la
sémantique recommandée). L'**absence** d'enregistrement = personne **traitée par
défaut** (opt-out). La liste d'exclusion à l'instant `T` est donc :

```
exclusion_set(T) = { clé(personne) | est_opposé(personne) à l'instant T }
```

Le **log `consent-events`** fournit l'**historique horodaté** de chaque
inscription / retrait d'opposition (preuve d'audit : qui, quand, quel sens). Il
est écrit à chaque action **avant** la mise à jour de l'état courant.

### 1.3 Renversement opt-in → opt-out

Le code stocke seulement un booléen ; il **n'impose pas** l'interprétation. Le
renversement se fait **côté consommateur** : « traiter **SI pas d'opposition** »
au lieu de « traiter SI `granted=true` ». Recommandation (la plus propre, à
implémenter — voir §1.5) : **renommer** le `ConsentType` / les valeurs en
sémantique d'opposition neutre (l'actuel `'openalex_email'` porte un nom de
marque tierce et une sémantique opt-in) et définir explicitement « est
opposé(e) » = présence d'un enregistrement courant d'opposition active. **Ne pas**
réutiliser `granted=false`/absence comme « opposé » (ambigu et confus).

### 1.4 Clé d'identification réelle — point bloquant

**État réel du code** : la **seule** clé d'identification est `userId = $id du
compte Appwrite (Appwrite Account)`. Il n'existe **aucune** autre clé matérialisée
dans le chemin consentement : ni email, ni ORCID, ni identifiant d'auteur du
référentiel bibliométrique (vérifié : aucune occurrence d'ORCID dans
`apps/find-an-expert/src`, aucun identifiant d'auteur externe dans le chemin
consentement ; le profil utilisateur ne contient que `{id, email, labels}`).

**Problème** : le mart et l'index sont clés sur l'**entité chercheur**
(`researcherId` ; les embeddings sont produits **par chercheur**, mean-pooling L2
des œuvres — pas par publication), c.-à-d. l'identité du chercheur **dans le
référentiel bibliométrique**. Un registre d'opposition doit pouvoir viser une
personne réelle **même sans compte PWA** (un chercheur du référentiel qui n'a
jamais créé de compte). **Aucune table de correspondance compte Appwrite ↔
chercheur du référentiel n'existe dans le code.**

**À ajouter (n'existe PAS aujourd'hui)** — la liste d'exclusion ne peut filtrer
le mart/index que si elle est exprimée dans la **clé du mart** :

1. Une **clé d'identification de la personne réelle** indépendante du compte
   Appwrite : `researcherId` (identifiant d'auteur du référentiel) et/ou ORCID
   et/ou email normalisé.
2. Une **table de correspondance** `compte ↔ chercheur` (à matérialiser ;
   inexistante).
3. Un **attribut de clé chercheur** sur l'enregistrement d'opposition (le schéma
   actuel ne porte que `userId`). À ajouter aux collections Appwrite (configurées
   à la main, pas de schema-as-code dans le repo).

> **La liste d'exclusion utile au pipeline est `{ researcherId }`**, pas
> `{ userId }`. Tant que la correspondance compte ↔ chercheur n'est pas
> matérialisée, l'opposition exprimée via la PWA **ne peut pas** être projetée
> sur le mart. C'est la **dette la plus structurante** de l'étape 0 (voir Gate,
> §6).

### 1.5 Manques à combler avant usage en registre d'opposition

Tous **« à ajouter »**, non supposés existants :

- **Clé chercheur + correspondance compte ↔ chercheur** (§1.4) — bloquant.
- **Renversement opt-out** explicite (sémantique du défaut) — §1.3.
- **Endpoint d'administration / DPO** : tout est scopé `locals.userId` (utilisateur
  courant). **Aucun** moyen pour un DPO d'inscrire une opposition au nom d'un tiers
  (chercheur sans compte), de lister les opposés, ou de requêter par
  ORCID/email/`researcherId`. Routes admin et requêtes non-`userId` **à ajouter**.
- **Lecture de l'historique** : `getByUserId` existe dans le repository mais
  **n'est exposé ni par le service ni par l'API** — l'historique est écrit, jamais
  relu par l'app. Endpoint de consultation **à ajouter** pour l'auditabilité.
- **Traçabilité réglementaire** : aucun champ `reason`, `source`, `expiresAt`,
  preuve. À ajouter si le DPO l'exige.
- **Garantie d'unicité** : l'unicité (`userId`, `consentType`) repose sur le
  read-then-write applicatif → **risque de doublon en concurrence**. Un index
  unique côté Appwrite serait à confirmer/ajouter.
- **Incohérence existante** `GET /api/v1/consents` : `getAllConsents` renvoie un
  `Map` JS sérialisé en `{}`. À corriger si on s'appuie dessus pour lister les
  états.

---

## 2. Régénération de la partition courante du mart (b)

### 2.1 Où l'on filtre

Le filtre d'opposition s'applique **entre `curated` et `marts`** (ADR 0030, ADR
0029, §flux) : la régénération de la **partition courante servie** se fait
**DEPUIS `curated` FILTRÉ** sur le registre d'opposition **à jour à l'instant
`T`**. C'est le **seul** point de filtrage du périmètre dans la chaîne
d'ingestion/profilage.

> À distinguer : la **déclaration des alliances** par l'utilisateur filtre
> l'**affichage** (PWA / `atlas-api`), **pas** l'ingestion/profilage (on profile
> plus de personnes qu'on n'en affiche). L'**opposition (art. 21)**, elle, retire
> la personne du **mart courant et de l'index servis** — via le **filtre appliqué
> entre `curated` et `marts`**. La personne reste présente dans `raw` (qui ingère
> tout le périmètre) : ce n'est pas l'ingestion brute qui est filtrée, mais la
> **dérivation `curated → marts`**.

### 2.2 Procédure de régénération (jamais en place)

À l'instant `T` (déclenchement par une nouvelle opposition ou par le schedule
mensuel) :

1. **Charger** `exclusion_set(T)` depuis le registre d'opposition (état courant,
   §1.2), exprimé en **clé chercheur** (`researcherId` — voir dépendance §1.4).
2. **Re-dériver** les modèles `marts` (`collab`) depuis `curated`, en **excluant**
   toute paire de chercheurs dont l'une des deux entités appartient à
   `exclusion_set(T)` (le filtre s'applique à l'**entité chercheur**, donc à toute
   **paire** la mettant en jeu, puisque la table de fait est _paires de
   chercheurs + features_).
3. **Écrire un NOUVEAU run** : `s3://citation/marts/collab/dt=YYYY-MM/run=<id'>/`
   avec un **nouvel** identifiant de run. **Aucune** écriture dans le `run=<id>`
   précédent.
4. **Écrire le `manifest.json` en dernier, atomiquement**, conforme au contrat
   ADR 0029 :
   ```json
   {
     "partition": "dt=YYYY-MM/run=<id'>",
     "schema_version": 1,
     "row_count": N,
     "parts": [{ "key": "...", "sha256": "...", "bytes": M }],
     "produced_at": "…"
   }
   ```
5. **Désigner la partition courante** : le consommateur (`atlas-api`, `index_load`)
   doit lire le run `<id'>` et **considérer `run=<id>` comme obsolète**. La sélection
   de la partition courante se fait via le manifest — selon la **convention ou le
   champ d'obsolescence restant à acter en §2.3** (le contrat actuel ne porte pas
   encore de sélecteur de « run courant » ; ne pas le supposer existant).

> **`manifest.json` = seule autorité du contrat.** Le consommateur valide
> `row_count` + `sha256` **avant** de lire et **refuse** une `schema_version`
> inconnue (ADR 0029, Invariant 1). Le mart régénéré n'est pas « cru » sur la base
> de son existence sur S3 : il l'est sur la base de son manifest validé.

### 2.3 Marquage d'obsolescence — à spécifier

Le contrat manifest **actuel** (ADR 0029) ne porte **pas** de champ d'état
d'obsolescence. Deux options, **à ajouter / arbitrer** (ne pas supposer
existantes) :

- **Convention de sélection** : « le run courant pour un `dt` = le manifest valide
  le plus récent (`produced_at`) ». Implicite, sans champ supplémentaire.
- **Champ explicite à ajouter** : p. ex. `supersedes: "run=<id>"` et/ou
  `status: "current" | "superseded"` dans le manifest, pour rendre l'obsolescence
  **explicite et traçable**. **Extension non destructive** (cohérente avec
  `schema_version` comme point d'extension, ADR 0029).

L'ancienne partition `run=<id>` **reste physiquement présente** (immuabilité,
traçabilité) ; elle n'est simplement **plus servie**. Elle relève alors du
**masquage à la lecture** (§3) au titre de partition historique figée.

---

## 3. Masquage à la lecture des partitions historiques (c)

Les partitions **figées historiques** (mois antérieurs, ou runs supersédés)
**ne sont JAMAIS réécrites** (immuabilité préservée). Pourtant elles peuvent
contenir une personne qui s'est opposée **après** leur production. L'exclusion
passe alors par un **masquage à la lecture**, appliqué dans le **service de
lecture `atlas-api`** :

1. `atlas-api` charge `exclusion_set(T)` (clé chercheur) depuis le registre
   d'opposition, **à jour à chaque lecture** (ou via un cache à TTL court borné
   par le SLA, §5).
2. **Toute** réponse servie — `/search`, recherche sémantique pgvector,
   recommandations nominatives, filtrage structuré — est **filtrée** pour
   **n'émettre aucune ligne** dont l'entité chercheur ∈ `exclusion_set(T)`, **quelle
   que soit la partition d'origine** (courante régénérée **ou** historique figée).
3. Le masquage s'applique aussi bien aux résultats issus du mart qu'à ceux issus
   de l'index pgvector (l'index étant lui-même purgé, §4 — le masquage est la
   **défense en profondeur** complémentaire couvrant la fenêtre de propagation).

> Le masquage **ne mute pas** la partition historique : il filtre la **sortie**.
> L'immuabilité est intacte ; la personne opposée n'est **jamais servie**.

**Garde-fous (ADR 0030)** :

- **Authentification obligatoire** sur **toute** route exposant des personnes ou
  des recommandations nominatives — **y compris** `/search` et le filtrage
  structuré. **Aucun** endpoint anonyme listant des chercheurs.
- **Cohérence bloquante** : une **divergence** entre le périmètre servi par
  `atlas-api` et le registre d'opposition est un **défaut bloquant** (« droit
  d'opposition opérationnel, pas théorique »). À couvrir par un test/contrôle de
  cohérence.

---

## 4. Purge / recharge de l'index pgvector (d)

L'index pgvector (sur CloudNativePG, alimenté par l'asset Dagster `index_load`
**depuis le mart**) **n'est pas source de vérité** : il est **dérivé et
régénérable**. Il porte deux faces, toutes deux clés sur l'**entité chercheur** :
FTS lexical (`tsvector`) et recherche sémantique (`vector(384)`, embeddings
`all-MiniLM-L6-v2` déjà produits par `researcher-profiles`, **par chercheur**).

Propagation d'une opposition à l'index :

1. **Purge ciblée** : `DELETE` des lignes de l'index correspondant aux entités
   chercheur ∈ `exclusion_set(T)` (la clé `researcherId` rend la purge directe,
   ligne par ligne — pas de recalcul d'embedding nécessaire : **aucun nouveau
   modèle ni GPU**, ADR 0029).
2. **Recharge depuis la partition régénérée** : `index_load` recharge l'index
   depuis la **partition courante régénérée** (§2), qui **ne contient déjà plus**
   les personnes opposées. Purge + recharge sont **idempotents** : recharger depuis
   un mart déjà filtré ne réintroduit jamais une personne exclue.
3. L'index reste **cohérent** avec la partition courante servie et avec le registre
   d'opposition.

> L'index étant **purgeable / régénérable**, l'opposition y est honorée par
> **suppression de lignes**, pas par masquage de partition. Le masquage `atlas-api`
> (§3) reste la **défense en profondeur** durant la fenêtre entre l'opposition et
> la fin de la purge/recharge.

---

## 5. SLA de propagation (e)

Une opposition **retire la personne du mart ET de l'index dans le SLA défini**
(ADR 0030, garde-fous). Le **coût de ré-dérivation est payé à chaque opposition**.

### 5.1 Définition du SLA

> **SLA de propagation** = délai maximal entre **l'opposition exprimée** (écriture
> dans le registre, `current-consents` à jour) et son **effet effectif** sur :
> **(1)** le mart courant servi, **(2)** l'index pgvector, **(3)** le service de
> lecture `atlas-api`.

> **Prérequis de mesurabilité.** Ce SLA n'est opérationnel **que si** la
> sémantique **opt-out** est effectivement branchée (§1.3) **et** la **clé
> chercheur + la correspondance compte ↔ chercheur** existent (§1.4) : sans elles,
> « l'opposition exprimée » ne peut pas être projetée sur le mart ni l'index, et
> le SLA n'a pas de cible mesurable. Tant que ces dépendances (§6.4) ne sont pas
> livrées, le SLA reste **théorique**.

### 5.2 Deux régimes de propagation

| Couche                        | Mécanisme                                               | Latence                                                            | Garantie immédiate                       |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| **`atlas-api` (lecture)**     | Masquage à la lecture sur `exclusion_set(T)` (§3)       | **Quasi-immédiat** (≤ TTL du cache de l'exclusion, à borner court) | **Oui** — c'est le filet de sécurité     |
| **Index pgvector**            | Purge ciblée (`DELETE`) + recharge (§4)                 | Purge **rapide** (ligne à ligne) ; recharge selon trigger          | Purge ciblée déclenchable hors schedule  |
| **Mart (partition courante)** | Régénération nouveau `run` depuis `curated` filtré (§2) | Coût d'un run dbt complet                                          | Non — porté par le masquage en attendant |

**Stratégie recommandée** : le **masquage `atlas-api`** garantit l'effet
**quasi-immédiat** côté service (le SLA perçu par la personne opposée), pendant que
la **régénération du mart** + la **purge/recharge de l'index** rattrapent l'état
réel des artefacts dans le SLA défini. La régénération complète peut être :

- **déclenchée à l'opposition** (régénération du run courant à `T`), ou
- **agrégée** sur un déclencheur borné par le SLA (p. ex. batch infra-mensuel),
  **à condition** que le masquage couvre l'intervalle.

### 5.3 Valeur du SLA — à arbitrer

La **valeur chiffrée** du SLA (p. ex. effet service ≤ X, rattrapage mart+index ≤ Y)
**n'est pas figée dans le code** et relève de l'**arbitrage DPO** (ADR 0030). À
**définir** lors de la gate phase 0. Contrainte d'architecture : l'effet **côté
service** doit être **immédiat** (masquage), le rattrapage des artefacts dérivés
borné et **mesurable**.

---

## 6. Conséquences, contrôles et gate

### 6.1 Invariants à ne jamais violer

- **Partitions immuables** : rejeu = **nouvelle** partition ; **jamais** de
  réécriture en place. L'opposition est absorbée par **régénération + masquage +
  purge**, **pas** par mutation (ADR 0029, ADR 0030).
- **`manifest.json` = seule autorité du contrat** : validé par `sha256` +
  `row_count` + `schema_version` ; `schema_version` inconnue **refusée**. Ni le
  mart, ni l'index ne sont autorité du contrat.
- **Index/mart jamais source de vérité** : l'index est dérivé du mart, le mart est
  régénérable ; la **source de vérité du périmètre** est le **registre
  d'opposition**.
- **Minimisation maintenue** : seule la réduction `domain/field/subfield/topic/
keyword` + historique d'articles est traitée ; aucune donnée sensible, aucun
  élargissement silencieux du périmètre.
- **Auth obligatoire** sur toute route nominative, `/search` inclus.

### 6.2 Contrôle de cohérence (bloquant)

Un contrôle doit vérifier en continu : **périmètre servi par `atlas-api`
⊇-complémentaire du registre d'opposition** — c.-à-d. **aucune** personne de
`exclusion_set(T)` n'est servie, depuis **aucune** partition. Toute **divergence**
est un **défaut bloquant** (ADR 0030).

### 6.3 Gate bloquante (phase 0)

Aucune phase manipulant des **données réelles** ne démarre tant que :

1. le **registre d'opposition est branché** (avec la **clé chercheur** et la
   **correspondance compte ↔ chercheur** — §1.4, **à construire**) ;
2. la **liste d'exclusion** est consommable par `marts` (régénération), `index_load`
   (purge) et `atlas-api` (masquage) ;
3. l'**arbitrage DPO** a eu lieu pour l'instance (bases légales art. 6.1.e/f,
   information des personnes, responsable de traitement, **valeur du SLA**).

### 6.4 Dépendances « à ajouter » récapitulées

| Manque                                                                           | Statut                   | Bloque                                       |
| -------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------- |
| Clé chercheur (`researcherId`/ORCID/email normalisé) sur l'opposition            | **À ajouter**            | Projection de l'opposition sur le mart/index |
| Table de correspondance compte Appwrite ↔ chercheur référentiel                  | **N'existe nulle part**  | Toute la chaîne de propagation               |
| Sémantique opt-out explicite (renommage `ConsentType`/valeurs)                   | **À ajouter**            | Interprétation correcte du défaut            |
| Routes admin/DPO (inscription tiers, liste des opposés, requête par ORCID/email) | **À ajouter**            | Opposition de personnes sans compte          |
| Endpoint de consultation de l'historique (`getByUserId` exposé)                  | **À ajouter**            | Auditabilité réglementaire                   |
| Champ `status`/`supersedes` dans le manifest (obsolescence explicite)            | **À ajouter / arbitrer** | Marquage d'obsolescence (§2.3)               |
| Index unique (`userId`/clé chercheur, type) côté Appwrite                        | **À confirmer/ajouter**  | Garantie d'unicité (anti-doublon)            |
| Valeur chiffrée du SLA                                                           | **À arbitrer (DPO)**     | Mesurabilité du SLA                          |

---

## Références

- [ADR 0029 — Architecture du pipeline collaborations](../decisions/0029-architecture-pipeline-collaborations)
  — partitions immuables, contrat Parquet + `manifest.json`, index pgvector dérivé.
- [ADR 0030 — Profilage de collaborations : gate RGPD, base légale et droit
  d'opposition](../decisions/0030-rgpd-profilage-collaborations) — base légale
  (art. 6.1.e/f), droit d'opposition (art. 21), ré-dérivabilité, registre
  d'opposition, SLA, gate phase 0.
