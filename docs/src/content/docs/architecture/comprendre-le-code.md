---
title: Comprendre le code
---

« Comprendre le code », ici, ne veut pas dire « tout lire » : cette page est un
**guide de lecture** qui dit **par où entrer** dans le dépôt selon ce qu'on
cherche, et **quels paquets** (les unités de code réutilisables du monorepo)
**lire ensemble** pour saisir une fonctionnalité. Elle s'adresse à un
**développeur ou data scientist** qui découvre le code et veut un itinéraire
plutôt qu'une visite exhaustive. On y trouve : le point d'entrée unique (la carte
des paquets), trois conventions de code à connaître avant de plonger, et des
**parcours thématiques** qui ordonnent les paquets à lire, du socle à l'usage.

> Pour le néophyte qui veut surtout savoir _ce que font_ les applications, voir
> plutôt la [structure du monorepo](/atlas/architecture/monorepo/) et les README de chaque app.

## Le réflexe : la carte des paquets

La question « pour comprendre tel paquet, lesquels dois-je lire ? » a une réponse
directe dans la [carte des paquets](/atlas/architecture/packages/), générée depuis le code. Pour
chaque paquet, elle donne son **rôle**, ce dont il **dépend**, et **qui le
consomme**. C'est le point de départ de toute exploration.

Cette carte porte aussi les **graphes de dépendances** (des schémas où une flèche
`A → B` se lit « A dépend de B ») : pour visualiser d'un coup d'œil ce qu'un
livrable tire derrière lui, regardez le
[graphe du livrable concerné](/atlas/architecture/packages/#graphes-de-dépendances-par-livrable).
Ces graphes ne sont pas reproduits ici à dessein : le **détail par paquet vit
dans la carte des paquets**, cette page-ci se limite à l'itinéraire de lecture.

Trois lectures complémentaires :

- la [structure du monorepo](/atlas/architecture/monorepo/) — les 9 catégories et leurs règles
  (vue d'ensemble) ;
- le [flux de données](/atlas/architecture/data-flow/) — comment une donnée circule de bout en
  bout, et les **contrats** qui la typent (vue pour l'expert data) ;
- les **ADR** sous [`docs/decisions/`](/atlas/decisions/) — le _pourquoi_ de chaque
  choix structurant (Effect, SvelteKit/Hono, monorepo…).

## Trois conventions à connaître avant de lire

Quelques repères qui se retrouvent partout dans le code :

- **[Effect](/atlas/glossary/)** structure la logique métier : une fonction qui peut
  échouer retourne un `Effect<A, E>` (description d'un calcul) au lieu de lever une
  exception. L'exécution réelle (`runSync`/`runPromise`) est **déclenchée au plus
  tard**, par les consommateurs finaux — voir
  [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/).
- **Les niveaux de documentation** : ce qui n'est pas dans la prose est dans la
  JSDoc du code (intention, invariants, dérogations) — voir
  [la politique de documentation](/atlas/quality/documentation/).
- **La séparation thin CLI / lib** : les outils en ligne de commande (`cli/`)
  sont minces ; la logique vit dans les bibliothèques (`packages/`) — voir
  [ADR 0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/).

## Parcours thématiques

C'est le cœur de la page. Un **parcours** prend une fonctionnalité (se connecter,
lire un formulaire, enrichir des données…) et liste les paquets à lire **dans
l'ordre**, du socle (les briques bas niveau) à l'usage (l'app qui les assemble).
Suivre cet ordre évite de tomber dans un fichier au hasard sans en saisir le
contexte. Choisissez le parcours qui correspond à ce que vous cherchez à
comprendre.

### Authentification et sessions

Comment un utilisateur se connecte (magic link) et comment les apps vérifient sa
session.

1. **[`baas`](/atlas/packages/packages/baas/)** — le client Appwrite partagé
   (utilitaires _backend-as-a-service_).
2. **[`auth`](/atlas/packages/packages/auth/)** — le service d'authentification
   bâti dessus (login, logout, signup, lecture de session).
3. **[`sveltekit-handler`](/atlas/packages/packages/sveltekit-handler/)** — le
   wrapper de handler `+server.ts` (try/catch + mapping d'erreurs uniforme) qui
   enveloppe les routes d'API des apps.
4. **[`sveltekit-csp`](/atlas/packages/packages/sveltekit-csp/)** — les en-têtes de
   sécurité et la CSP appliqués à chaque réponse.
5. Côté app : les `hooks.server.ts` et les routes `src/routes/api/v1/auth/*` d'une
   app comme [`ecrin`](/atlas/packages/apps/ecrin/) montrent l'assemblage.

### Données structurées de formulaires (CRF / REDCap)

Comment Atlas lit et valide les données structurées des formulaires (aucune
donnée de santé ni sensible — voir [ADR 0007](/atlas/decisions/0007-redcap-appwrite-plateformes/)).

1. **[`crf-core`](/atlas/packages/packages/crf-core/)** — le cœur fonctionnel
   (Effect) : types du domaine, validation, et les **brands** (identifiants typés :
   `CrfToken`, `RecordId`, `InstrumentName`, `FieldName`, `UserId`…). C'est ici que
   vivent les contrats.
2. **[`crf-client`](/atlas/packages/packages/crf-client/)** — le client d'API typé
   (Effect) qui parle à une instance REDCap, avec des adaptateurs par version.
3. **[`crf-fixtures`](/atlas/packages/packages/crf-fixtures/)** — le parseur de
   dictionnaire CSV et le générateur déterministe de faux enregistrements (tests,
   bancs d'essai).
4. **[`crf-project-template`](/atlas/packages/packages/crf-project-template/)** — la
   trame déclarative d'un projet CRF (instruments, champs, métadonnées) en Effect
   Schema.
5. **[`services/crf`](/atlas/packages/services/crf/)** — le microservice HTTP (Hono)
   qui expose ces capacités en API.

### Bibliographie et profils de chercheurs

Comment Atlas enrichit ses données avec des sources publiques.

1. **[`citation-types`](/atlas/packages/packages/citation-types/)** puis
   **[`citation`](/atlas/packages/packages/citation/)** — les types et la logique de
   récupération/regroupement de citations (OpenAlex).
2. **[`citation-fetch`](/atlas/packages/packages/citation-fetch/)** et
   **[`fetch-one-api-page`](/atlas/packages/packages/fetch-one-api-page/)** — la
   pagination et la récupération HTTP bas niveau.
3. **[`researcher-profiles`](/atlas/packages/packages/researcher-profiles/)** — la
   génération de profils de chercheurs à partir de ces données.

### Pipeline DataOps et MLOps (Python)

Pour le data scientist : l'ingestion, la transformation et le modèle vivent dans
`dataops/`, en **Python natif** (Dagster, dbt) hors du graphe pnpm
([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)). Le **DataOps**
(_Data Operations_) applique au cycle de vie des données les garde-fous que le
DevSecOps applique au code ; le **MLOps** fait de même pour un modèle.

1. **`dataops/README.md`** — la catégorie Python et sa frontière avec le code
   Node (contrat de données, manifeste).
2. **Ingestion** — `dataops/citation-dagster` : snapshots S3 partitionnés et
   chargement de l'index ([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/),
   collecte _mediawatch_ dans `dataops/mediawatch-dagster`,
   [ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)).
3. **Transformation** — `dataops/citation-dbt` : modèles dbt en couches
   `staging` → `curated` → `marts`, avec tests dbt et asset checks.
4. **Modèle (MLOps)** — `dataops/citation-dagster/.../assets/uplift.py` (modèle
   d'uplift FWCI, [ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/))
   et `.../assets/drift.py` (suivi de dérive,
   [ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
   [ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)).

### Outils transverses

Ces paquets ne forment pas un parcours : ce sont des **briques de base** que les
autres réutilisent un peu partout. Les connaître évite de réexpliquer la même
mécanique (erreurs, validation, réseau) dans chaque parcours ci-dessus.

- **[`errors`](/atlas/packages/packages/errors/)** — les types d'erreurs partagés et
  leur mapping HTTP, consommés par presque tous les autres paquets.
- **[`validators`](/atlas/packages/packages/validators/)** — les validateurs
  partagés (email, contenu JSON…).
- **[`net`](/atlas/packages/packages/net/)** — les diagnostics réseau (DNS, TLS,
  connectivité).

## Et ensuite ?

- Pour les **signatures précises** (fonctions et types exportés par chaque
  paquet), chaque README de paquet documente son interface publique, complétée
  par la JSDoc lue directement dans le code et l'éditeur.
- Pour le **détail d'une décision** (pourquoi tel choix), l'[index des
  ADR](/atlas/decisions/) trace le raisonnement.
