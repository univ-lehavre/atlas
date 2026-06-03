---
title: Comprendre le code
---

Cette page s'adresse à un **développeur ou data scientist** qui veut se faire
une idée du code sans tout lire. Elle indique **par où entrer** selon ce qu'on
cherche à comprendre, et **quels paquets lire ensemble**.

> Pour le néophyte qui veut surtout savoir _ce que font_ les applications, voir
> plutôt la [structure du monorepo](/atlas/architecture/monorepo/) et les README de chaque app.

## Le réflexe : la carte des paquets

La question « pour comprendre tel paquet, lesquels dois-je lire ? » a une réponse
directe dans la [carte des paquets](/atlas/architecture/packages/), générée depuis le code. Pour
chaque paquet, elle donne son **rôle**, ce dont il **dépend**, et **qui le
consomme**. C'est le point de départ de toute exploration.

Trois lectures complémentaires :

- la [structure du monorepo](/atlas/architecture/monorepo/) — les 8 catégories et leurs règles
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

Chaque parcours liste les paquets à lire **dans l'ordre**, du socle à l'usage.

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

### Outils transverses

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
