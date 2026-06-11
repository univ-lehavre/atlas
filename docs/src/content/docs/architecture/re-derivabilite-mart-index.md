---
title: "Ré-dérivabilité du mart et de l'index : propagation d'une opposition RGPD"
---

## De quoi parle cette page

**En une phrase.** Quand une personne s'oppose à ce que ses données soient
traitées, comment faire pour qu'elle disparaisse vraiment de tous les jeux de
données que nous produisons à partir d'elle — alors même que ces jeux de données
sont, par conception, **impossibles à modifier après coup** ?

**Glose du titre.** « Ré-dérivabilité du mart et de l'index » se lit : la
capacité à **re-fabriquer** (ré-dériver) deux jeux de données — le **mart** et
l'**index** — à partir de la donnée brute, plutôt que de les modifier sur place.
Ces deux mots sont définis ci-dessous ; retenez pour l'instant qu'ils désignent
les données « finales » exploitées par l'application, et qu'on s'interdit de les
retoucher directement.

- **Mart** : une table de données « prête à l'emploi », pré-calculée à partir de
  données plus brutes pour répondre vite à un usage précis (ici : décrire des
  collaborations entre chercheurs). Terme de l'entrepôt de données (_data
  warehouse_) : un _data mart_ est une vue métier dérivée, pas la source de
  vérité.
- **Index** : ici, une base de données spécialisée dans la **recherche**
  (recherche par mots-clés et recherche « sémantique » par proximité de sens),
  construite **à partir du mart**. C'est ce qui permet à l'application de
  retrouver rapidement des chercheurs.

**Le problème que cette page résout.** Le mart et l'index sont stockés en
**partitions immuables** : une fois écrites, elles ne sont **jamais** modifiées
ni effacées (c'est un choix d'architecture qui garantit la traçabilité — voir
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)).
Or le RGPD donne à toute personne un **droit d'opposition** (article 21 :
demander l'arrêt du traitement de ses données). Ces deux exigences semblent
contradictoires : comment retirer quelqu'un de données qu'on s'interdit de
modifier ? La réponse est la **ré-dérivabilité** : on ne corrige pas l'ancien,
on **re-fabrique du neuf sans la personne**, et on masque l'ancien à la lecture.
Cette page spécifie précisément ce mécanisme.

> Repères de vocabulaire utilisés partout dans la page :
>
> - **RGPD** — Règlement général sur la protection des données (règlement
>   européen 2016/679) ; **art. 21** = droit d'opposition.
> - **Partition** — un « bloc » de données daté et figé (p. ex. les
>   collaborations d'un mois). **Immuable** = jamais réécrit après coup.
> - **Registre d'opposition** — la liste, faisant autorité, des personnes ayant
>   demandé à ne plus être traitées.
> - **SLA** (_Service Level Agreement_) — engagement de délai : ici, le temps
>   maximal entre une opposition et sa prise d'effet réelle.

**Ce que vous trouverez ici.** La page suit le **chemin d'une opposition** à
travers le système, de son enregistrement jusqu'à son effet sur chaque jeu de
données :

1. **Vocabulaire et invariant central** (§0) — les règles du jeu et le principe
   « on régénère, on ne mute jamais ».
2. **Le registre d'opposition** (§1) — où l'on note qu'une personne s'est
   opposée, et la dette technique qui empêche aujourd'hui d'en tirer parti.
3. **Régénération du mart** (§2) — re-fabriquer la donnée courante sans la
   personne opposée.
4. **Masquage à la lecture** (§3) — cacher les personnes opposées dans les
   données historiques qu'on ne peut pas réécrire.
5. **Purge de l'index** (§4) — supprimer les personnes opposées du moteur de
   recherche.
6. **SLA de propagation** (§5) — dans quel délai tout cela prend effet.
7. **Conséquences, contrôles et gate** (§6) — les garde-fous et ce qu'il reste à
   construire avant tout usage sur données réelles.

> **Place dans le projet.** Étape 0.2 du plan _pipeline-collaborations_. Cette
> page spécifie **comment une opposition RGPD (art. 21) se propage** au mart
> Parquet (format de fichier en colonnes, voir §0) et à l'index pgvector
> (extension de recherche vectorielle de PostgreSQL), **sans jamais réécrire une
> partition de production en place**. Elle opérationnalise deux décisions
> d'architecture :
>
> - [ADR 0029 — Architecture du pipeline collaborations](/atlas/decisions/0029-architecture-pipeline-collaborations/)
>   (immutabilité des partitions, contrat Parquet + `manifest.json`) ;
> - [ADR 0030 — Profilage de collaborations : gate RGPD, base légale et droit
>   d'opposition](/atlas/decisions/0030-rgpd-profilage-collaborations/)
>   (ré-dérivabilité dès la conception, registre d'opposition, SLA).

---

## 0. Vocabulaire et invariant central

Avant tout détail, cette section pose les **deux fondations** sur lesquelles
repose le reste de la page : (1) **quel droit** est exactement en jeu — un droit
d'opposition, qui n'est pas la même chose qu'un retrait de consentement, et la
conséquence majeure que cette distinction entraîne ; (2) **l'invariant** — la
règle absolue « on régénère, on ne modifie jamais une partition existante » —
qui dicte toute la mécanique des sections suivantes. Si vous ne deviez retenir
qu'une chose de la page, c'est l'invariant ci-dessous.

### 0.1 Quel droit est en jeu : opposition, pas consentement

Il s'agit d'un **droit d'opposition au titre de l'article 21 du RGPD**, **pas**
d'un retrait de consentement. La distinction est lourde de conséquences. La
**base légale** (le fondement juridique qui autorise un traitement de données)
est ici l'**intérêt public (art. 6.1.e)** et/ou l'**intérêt légitime
(art. 6.1.f)** (ADR 0030) — **jamais le consentement (art. 6.1.a)**.

Conséquence directe : le modèle est **opt-out** et non **opt-in**.

- **Opt-in** : on ne traite une personne **que si** elle a dit oui (consentement
  préalable). C'était le fonctionnement de l'application web d'origine.
- **Opt-out** : on traite **toute** personne du périmètre **par défaut**, **sauf**
  celles qui ont explicitement dit non (exercé leur opposition).

Cette **inversion de sémantique** (passer de « traiter si oui » à « traiter sauf
si non ») est **le seul renversement à opérer côté consommateur** des données
(voir §1.3).

### 0.2 L'invariant : on régénère, on ne mute jamais

C'est la règle qui structure toute la suite. **Muter** signifie ici modifier des
données déjà écrites (en corriger ou en supprimer une ligne sur place). Cette
opération est **interdite** sur les partitions de production. Toute opposition
est donc absorbée par re-fabrication, pas par retouche.

**Invariant préservé sur tout ce document** (ADR 0029, Invariants) :

> Les partitions de production sont **strictement immuables**. Un rejeu (une
> ré-exécution du calcul) écrit une **nouvelle** partition `dt=YYYY-MM/run=<id>/`
> — où `dt` est le mois et `run` l'identifiant de l'exécution — **jamais** de
> réécriture en place. Une opposition est honorée par **RÉGÉNÉRATION** (nouvelle
> partition courante filtrée) **+ MASQUAGE** (à la lecture, pour l'historique
> figé) **+ PURGE/RECHARGE** de l'index dérivé — **jamais par mutation** d'une
> partition existante.

Ces trois mécanismes (régénération, masquage, purge/recharge) sont précisément
l'objet des sections §2, §3 et §4. L'immuabilité reste un invariant de
**traçabilité** (pouvoir prouver ce qui a été produit et quand), **pas un droit
de conservation indéfinie** (ADR 0030) : on garde l'historique pour l'auditer,
on ne s'en sert jamais pour continuer à servir une personne opposée.

### 0.3 Quatre objets, quatre rôles à ne jamais confondre

Le tableau ci-dessous distingue les quatre objets manipulés dans la page. Le
piège à éviter : croire que le mart ou l'index « font foi ». **La seule autorité
sur _qui est exclu_ est le registre d'opposition** ; la seule autorité sur _ce
qui a été transféré_ est le `manifest.json` (le « bon de livraison » qui certifie
le contenu d'une partition, voir §2). Le mart et l'index ne sont, eux, que des
**dérivés régénérables**. (`s3://…` désigne un emplacement de stockage objet de
type S3 ; `sha256` une empreinte cryptographique servant à vérifier l'intégrité
d'un fichier ; `row_count` le nombre de lignes attendu.)

| Objet                                                           | Rôle                                                                            | Autorité ?                                | Mutabilité                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| **Registre d'opposition**                                       | Source de vérité du **périmètre servi** (qui est exclu)                         | Autorité du **périmètre**, pas du contrat | Append-only + projection d'état                         |
| **Mart Parquet** (`s3://citation/marts/collab/dt=.../run=.../`) | Table de fait dérivée, **régénérable**                                          | **Non** autorité du contrat               | Partitions **immuables** ; on régénère un nouveau `run` |
| **`manifest.json`**                                             | **Contrat de transfert** (validé par `sha256` + `row_count` + `schema_version`) | **Seule autorité du contrat**             | Écrit en dernier, atomique, par run                     |
| **Index pgvector**                                              | Exploration / recherche, **dérivé du mart**                                     | **Jamais** source de vérité               | **Purgeable / rechargeable**                            |

---

## 1. Le registre d'opposition (a)

Le **registre d'opposition** est la liste, faisant autorité, des personnes qui
se sont opposées. C'est le **point de départ** de toute la chaîne : tant qu'on ne
sait pas de façon fiable « qui est opposé », on ne peut filtrer ni le mart, ni
l'index, ni les lectures. Cette section explique (1) qu'on **réutilise** un
dispositif existant — le journal de consentement de l'application web — en le
**réinterprétant** en registre d'opposition ; (2) comment on en tire la **liste
d'exclusion** consommée par le reste du pipeline ; puis (3) elle expose une
**dette technique bloquante** : aujourd'hui ce registre identifie les personnes
par leur compte applicatif, alors que le mart les identifie par leur identité de
chercheur — et **aucune correspondance entre les deux n'existe** (§1.4). C'est le
nœud du chantier.

### 1.1 Réutilisation du dispositif `consent-events` réinterprété

On part de l'existant. L'application web (une **PWA**, _Progressive Web App_ :
application web installable comme une app native) gère déjà un journal de
consentement. On montre ici qu'il fournit exactement le bon patron — un **journal
immuable** doublé d'une **projection de l'état courant** — pour servir de
registre d'opposition auditable, à condition de le réinterpréter (§1.3).
(_Append-only_ = on ne fait qu'**ajouter** des entrées, jamais en modifier ou en
supprimer ; _upsert_ = « insérer ou mettre à jour » selon que la ligne existe
déjà.)

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

La **liste d'exclusion** est l'ensemble des personnes à retirer du périmètre
servi à un instant donné. C'est l'objet concret que consomment le pipeline (pour
régénérer le mart) et le service de lecture (pour masquer). Cette sous-section
définit comment on la calcule : on la dérive de l'**état courant** du registre
(la projection `current-consents`, qui dit « voici l'état présent de chacun »),
**pas** du journal historique :

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

Réutiliser le dispositif existant suppose d'**inverser son interprétation**
(§0.1). Cette sous-section précise comment, et pourquoi le code le permet
sans réécriture lourde : il stocke un simple oui/non, c'est l'usage qu'on en fait
qui change.

Le code stocke seulement un booléen ; il **n'impose pas** l'interprétation. Le
renversement se fait **côté consommateur** : « traiter **SI pas d'opposition** »
au lieu de « traiter SI `granted=true` ». Recommandation (la plus propre, à
implémenter — voir §1.5) : **renommer** le `ConsentType` / les valeurs en
sémantique d'opposition neutre (l'actuel `'openalex_email'` porte un nom de
marque tierce et une sémantique opt-in) et définir explicitement « est
opposé(e) » = présence d'un enregistrement courant d'opposition active. **Ne pas**
réutiliser `granted=false`/absence comme « opposé » (ambigu et confus).

### 1.4 Clé d'identification réelle — point bloquant

Voici le **point dur** annoncé en introduction de la section. Une opposition n'a
de valeur que si elle peut **désigner** sans ambiguïté la personne à retirer du
mart et de l'index. Or les deux mondes n'utilisent pas la même clé
d'identification : le registre identifie un **titulaire de compte applicatif**,
le mart identifie un **chercheur du référentiel bibliométrique** (la base
documentaire des publications et de leurs auteurs). Sans **table de
correspondance** entre ces deux identités, l'opposition exprimée dans
l'application ne peut tout simplement pas être projetée sur le mart. C'est, dit
le texte, « la dette la plus structurante de l'étape 0 ».

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
   applicatif : `researcherId` (identifiant d'auteur du référentiel) et/ou ORCID
   (_Open Researcher and Contributor ID_, identifiant pérenne international d'un
   chercheur) et/ou email normalisé.
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

Cette sous-section **récapitule en une liste** tout ce qui doit être construit
avant que le dispositif existant puisse servir de registre d'opposition
réglementaire. Aucun de ces éléments n'existe aujourd'hui : ce sont tous des
**« à ajouter »**. (Un **DPO**, _Data Protection Officer_, est le délégué à la
protection des données ; un **endpoint** est un point d'accès d'une API, c.-à-d.
une URL appelable par un programme.)

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

Premier des trois mécanismes de l'invariant (§0.2) : la **régénération**.
Puisqu'on ne peut pas retirer une personne d'une partition existante, on
**re-fabrique** la partition « courante » (celle qui est servie aujourd'hui) en
laissant la personne opposée de côté dès le calcul. Cette section répond à trois
questions : **où** dans la chaîne de traitement on applique le filtre (§2.1) ;
**comment** se déroule la régénération, étape par étape, sans jamais écrire en
place (§2.2) ; et **comment** on signale que l'ancienne partition est désormais
périmée (§2.3).

Le pipeline de données passe par des couches successives, du plus brut au plus
raffiné : **`raw`** (données ingérées telles quelles), **`curated`** (nettoyées
et normalisées), puis **`marts`** (tables métier prêtes à l'emploi — voir « mart »
en tête de page). La transformation `curated → marts` est réalisée avec **dbt**
(_data build tool_, outil de transformation de données en SQL versionné).

### 2.1 Où l'on filtre

C'est le **point d'application unique** du filtre d'opposition dans toute la
chaîne d'ingestion. Le situer correctement évite deux confusions courantes :
filtrer trop tôt (on perdrait la donnée brute, qu'on a le droit de conserver) ou
confondre ce filtrage réglementaire avec le simple filtrage d'**affichage**.

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

Voici la procédure pas à pas. L'enchaînement importe : on **charge** la liste
d'exclusion, on **re-dérive** le mart sans les personnes opposées, on **écrit un
nouveau run** (jamais l'ancien), on **scelle** le tout par un `manifest.json`
atomique, et on **désigne** ce nouveau run comme courant. Le `manifest.json`
écrit en dernier joue le rôle de « bon de livraison » : tant qu'il n'est pas là,
le run n'est pas considéré comme valide.

À l'instant `T` (déclenchement par une nouvelle opposition ou par le _schedule_
mensuel — l'exécution planifiée récurrente) :

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

Une fois le nouveau run écrit, encore faut-il que le consommateur sache **lequel
servir**. Comment marquer l'ancien run comme « périmé » sans le modifier (ce qui
violerait l'immuabilité) ? Cette sous-section présente les deux options
possibles, **encore à arbitrer** : ne supposez aucune des deux déjà en place.

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

Deuxième mécanisme de l'invariant : le **masquage à la lecture**. La régénération
(§2) ne règle que la partition **courante**. Mais les partitions **historiques**
(les mois passés, déjà figés) peuvent contenir une personne qui s'est opposée
**après** leur production — et on s'interdit de les réécrire. La parade : ne pas
toucher au stockage, mais **filtrer la sortie** au moment où on la lit. Concrètement,
le service de lecture retire les personnes opposées de **chaque** réponse qu'il
renvoie, quelle que soit la partition d'origine. Cette section décrit ce filtrage
et les garde-fous qui l'entourent (authentification, contrôle de cohérence).

(Un **run supersédé** est un run remplacé par un plus récent ; `atlas-api` est le
service applicatif qui répond aux requêtes de recherche.)

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

Troisième mécanisme : la **purge/recharge** de l'index. L'index est le moteur de
recherche dérivé du mart (voir « index » en tête de page). Comme il n'est jamais
source de vérité et qu'il est entièrement régénérable, on n'a pas besoin d'y
ruser : on **supprime directement** les lignes des personnes opposées (purge),
puis on **recharge** depuis le mart déjà filtré (§2). Cette section décrit ces
deux temps et la propriété qui les rend sûrs : l'**idempotence** — recharger
plusieurs fois depuis un mart déjà filtré donne toujours le même résultat et ne
réintroduit jamais une personne exclue.

L'index pgvector (sur CloudNativePG, une distribution de PostgreSQL pour
Kubernetes ; alimenté par l'**asset** — unité de données produite — du framework
d'orchestration **Dagster** `index_load`, **depuis le mart**) **n'est pas source
de vérité** : il est **dérivé et régénérable**. Il porte deux faces, toutes deux
clés sur l'**entité chercheur** : une **FTS** lexicale (_full-text search_,
recherche plein texte par mots-clés, stockée en `tsvector`) et une **recherche
sémantique** (par proximité de sens, via des vecteurs `vector(384)`). Ces
vecteurs sont des **embeddings** : des représentations numériques du « sens » d'un
texte, ici produites **par chercheur** par le modèle `all-MiniLM-L6-v2` (déjà
calculées en amont par `researcher-profiles`).

**Schéma concret de l'index (livré en [étape 4.1](/atlas/plans/2026-06-02-pipeline-collaborations/)).**
La purge n'est plus abstraite : le schéma `pgvector` existe (paquet
`@univ-lehavre/atlas-citation`, migrations versionnées). Deux tables, toutes deux
clés sur l'**entité chercheur** et porteuses des coordonnées de partition `(dt, run)` :

- **`researchers`** `(researcher_id, embedding vector(384), dt, run)` — un vecteur par
  chercheur (clé naturelle `(researcher_id, dt, run)`) ;
- **`pairs`** `(author_a, author_b, cross_citations, a_to_b, b_to_a, dt, run)` — une
  paire par couple `(author_a, author_b, dt, run)`.

Propagation d'une opposition à l'index, exprimée sur ce schéma :

1. **Purge ciblée** : `DELETE` direct des lignes dont l'entité chercheur ∈
   `exclusion_set(T)` — ligne par ligne, sans recalcul d'embedding (**aucun nouveau
   modèle ni GPU**, ADR 0029). Concrètement, l'opposition d'un chercheur `R` retire :

   ```sql
   DELETE FROM researchers WHERE researcher_id = ANY($exclusion_set);
   -- une paire est servie dès lors qu'UNE de ses deux entités est opposée :
   DELETE FROM pairs
     WHERE author_a = ANY($exclusion_set) OR author_b = ANY($exclusion_set);
   ```

   La clé chercheur (`researcher_id` / `author_a` / `author_b`) rend la purge directe.
   La FTS lexicale (`tsvector`, [étape 4.2](/atlas/plans/2026-06-02-pipeline-collaborations/),
   non encore matérialisée) sera purgée de la même façon, sur la même clé.

2. **Recharge depuis la partition régénérée** : `index_load`
   ([étape 4.4](/atlas/plans/2026-06-02-pipeline-collaborations/)) recharge
   l'index depuis la **partition courante régénérée** (§2) — désignée par ses
   coordonnées `(dt, run')` —, qui **ne contient déjà plus** les personnes opposées. Le
   chargement se fait **par partition** : recharger `(dt, run')` **remplace** les lignes
   de cette partition (pas de doublon). Purge + recharge sont **idempotents** :
   recharger depuis un mart déjà filtré ne réintroduit jamais une personne exclue.
3. L'index reste **cohérent** avec la partition courante servie et avec le registre
   d'opposition.

> L'index étant **purgeable / régénérable**, l'opposition y est honorée par
> **suppression de lignes**, pas par masquage de partition. Le masquage `atlas-api`
> (§3) reste la **défense en profondeur** durant la fenêtre entre l'opposition et
> la fin de la purge/recharge.

> **Capacité côté index : prête ; reste à brancher l'entrée.** Le **mécanisme** de
> purge décrit ci-dessus est réalisable sur le schéma livré (tables `researchers` /
> `pairs` clés sur la personne, coordonnées `(dt, run)`) : le dépôt **permet** la
> purge. Ce qui manque n'est pas côté index mais côté **entrée** — la
> `exclusion_set(T)` exprimée en **clé chercheur** (§1.4) : tant que la correspondance
> compte ↔ chercheur n'est pas matérialisée et que le déployeur n'a pas branché le
> registre d'opposition, la purge n'a pas de liste à appliquer. Le code fournit la
> mécanique ; **l'actionner** (brancher le registre, trancher la recevabilité d'une
> opposition, fixer le SLA) relève du **déployeur** (responsable de traitement).

---

## 5. SLA de propagation (e)

Les sections précédentes décrivent **comment** une opposition est honorée ; celle-ci
décrit **en combien de temps**. Le **SLA de propagation** est l'engagement de
délai entre le moment où une personne s'oppose et le moment où elle a réellement
disparu du mart, de l'index et des réponses servies. Cette section en donne la
définition précise (§5.1), distingue les deux régimes de vitesse — l'effet
**quasi-immédiat** côté service grâce au masquage, et le **rattrapage** plus lent
des artefacts de fond (§5.2) — et rappelle que la **valeur chiffrée** du délai
relève d'un arbitrage du DPO, non du code (§5.3).

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

La propagation n'est pas uniforme : une couche prend effet **tout de suite**, les
autres **rattrapent** ensuite. Le tableau ci-dessous compare les trois couches
selon leur mécanisme, leur latence et le fait qu'elles garantissent ou non un
effet immédiat. (TTL, _Time To Live_ : durée de validité d'une donnée en cache
avant rafraîchissement.) La lecture clé : `atlas-api` est le **filet de
sécurité** instantané, le mart est le plus lent — d'où la stratégie expliquée
juste après.

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

Cette dernière section **verrouille** tout ce qui précède. Elle rassemble : les
**invariants** qu'aucune évolution future ne doit casser (§6.1) ; le **contrôle
de cohérence** automatique qui vérifie en continu qu'aucune personne opposée
n'est servie (§6.2) ; la **gate** — la barrière de démarrage qui interdit tout
traitement de données réelles tant que des conditions ne sont pas remplies
(§6.3) ; et le **récapitulatif des dépendances à construire** avant de pouvoir
avancer (§6.4). C'est la check-list de conformité de l'étape 0.

### 6.1 Invariants à ne jamais violer

Rappel synthétique des règles non négociables disséminées dans la page : les
violer reviendrait à casser soit l'immuabilité, soit la garantie d'opposition.

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

Au-delà des invariants, on veut une **vérification automatique** que le système
respecte réellement l'opposition. Le principe : ce que sert `atlas-api` ne doit
**jamais** contenir une personne du registre d'opposition ; tout écart est un
défaut qui bloque.

Un contrôle doit vérifier en continu : **périmètre servi par `atlas-api`
⊇-complémentaire du registre d'opposition** — c.-à-d. **aucune** personne de
`exclusion_set(T)` n'est servie, depuis **aucune** partition. Toute **divergence**
est un **défaut bloquant** (ADR 0030).

### 6.3 Gate bloquante (phase 0)

Une **gate** est un point de passage obligatoire : tant que ses conditions ne
sont pas toutes remplies, l'étape suivante ne démarre pas. Ici, elle interdit de
manipuler la moindre **donnée réelle** avant que le dispositif d'opposition soit
réellement opérationnel.

Aucune phase manipulant des **données réelles** ne démarre tant que :

1. le **registre d'opposition est branché** (avec la **clé chercheur** et la
   **correspondance compte ↔ chercheur** — §1.4, **à construire**) ;
2. la **liste d'exclusion** est consommable par `marts` (régénération), `index_load`
   (purge) et `atlas-api` (masquage) ;
3. l'**arbitrage DPO** a eu lieu pour l'instance (bases légales art. 6.1.e/f,
   information des personnes, responsable de traitement, **valeur du SLA**).

### 6.4 Dépendances « à ajouter » récapitulées

Synthèse, en un seul tableau, de tout ce qui **n'existe pas encore** et qu'il
faut construire — avec, pour chaque manque, son statut et ce qu'il bloque. C'est
la liste de travail de l'étape 0 ; les deux premières lignes (clé chercheur et
table de correspondance) sont les verrous les plus structurants.

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

- [ADR 0029 — Architecture du pipeline collaborations](/atlas/decisions/0029-architecture-pipeline-collaborations/)
  — partitions immuables, contrat Parquet + `manifest.json`, index pgvector dérivé.
- [ADR 0030 — Profilage de collaborations : gate RGPD, base légale et droit
  d'opposition](/atlas/decisions/0030-rgpd-profilage-collaborations/) — base légale
  (art. 6.1.e/f), droit d'opposition (art. 21), ré-dérivabilité, registre
  d'opposition, SLA, gate phase 0.
