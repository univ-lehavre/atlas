---
title: Comprendre le code
---

Cette page s'adresse à un **développeur ou data scientist** qui veut se faire
une idée du code sans tout lire. Elle indique **par où entrer** selon ce qu'on
cherche à comprendre, et **quels paquets lire ensemble**.

> Pour le néophyte qui veut surtout savoir _ce que font_ les applications, voir
> plutôt la [structure du monorepo](./monorepo) et les README de chaque app.

## Le réflexe : la carte des paquets

La question « pour comprendre tel paquet, lesquels dois-je lire ? » a une réponse
directe dans la [carte des paquets](./packages), générée depuis le code. Pour
chaque paquet, elle donne son **rôle**, ce dont il **dépend**, et **qui le
consomme**. C'est le point de départ de toute exploration.

Trois lectures complémentaires :

- la [structure du monorepo](./monorepo) — les 8 catégories et leurs règles
  (vue d'ensemble) ;
- le [flux de données](./data-flow) — comment une donnée circule de bout en
  bout, et les **contrats** qui la typent (vue pour l'expert data) ;
- les **ADR** sous [`docs/decisions/`](../decisions/) — le _pourquoi_ de chaque
  choix structurant (Effect, SvelteKit/Hono, monorepo…).

## Trois conventions à connaître avant de lire

Quelques repères qui se retrouvent partout dans le code :

- **[Effect](../glossary)** structure la logique métier : une fonction qui peut
  échouer retourne un `Effect<A, E>` (description d'un calcul) au lieu de lever une
  exception. L'exécution réelle (`runSync`/`runPromise`) est **déclenchée au plus
  tard**, par les consommateurs finaux — voir
  [ADR 0005](../decisions/0005-effect-pour-la-pf).
- **Les niveaux de documentation** : ce qui n'est pas dans la prose est dans la
  JSDoc du code (intention, invariants, dérogations) — voir
  [la politique de documentation](../quality/documentation).
- **La séparation thin CLI / lib** : les outils en ligne de commande (`cli/`)
  sont minces ; la logique vit dans les bibliothèques (`packages/`) — voir
  [ADR 0008](../decisions/0008-clis-thins-logique-dans-packages).

## Parcours thématiques

Chaque parcours liste les paquets à lire **dans l'ordre**, du socle à l'usage.

### Authentification et sessions

Comment un utilisateur se connecte (magic link) et comment les apps vérifient sa
session.

1. **[`baas`](../../packages/baas/README.md)** — le client Appwrite partagé
   (utilitaires _backend-as-a-service_).
2. **[`auth`](../../packages/auth/README.md)** — le service d'authentification
   bâti dessus (login, logout, signup, lecture de session).
3. **[`sveltekit-handler`](../../packages/sveltekit-handler/README.md)** — le
   wrapper de handler `+server.ts` (try/catch + mapping d'erreurs uniforme) qui
   enveloppe les routes d'API des apps.
4. **[`sveltekit-csp`](../../packages/sveltekit-csp/README.md)** — les en-têtes de
   sécurité et la CSP appliqués à chaque réponse.
5. Côté app : les `hooks.server.ts` et les routes `src/routes/api/v1/auth/*` d'une
   app comme [`ecrin`](../../apps/ecrin/README.md) montrent l'assemblage.

### Données structurées de formulaires (CRF / REDCap)

Comment Atlas lit et valide les données structurées des formulaires (aucune
donnée de santé ni sensible — voir [ADR 0007](../decisions/0007-redcap-appwrite-plateformes)).

1. **[`crf-core`](../../packages/crf-core/README.md)** — le cœur fonctionnel
   (Effect) : types du domaine, validation, et les **brands** (identifiants typés :
   `CrfToken`, `RecordId`, `InstrumentName`, `FieldName`, `UserId`…). C'est ici que
   vivent les contrats.
2. **[`crf-client`](../../packages/crf-client/README.md)** — le client d'API typé
   (Effect) qui parle à une instance REDCap, avec des adaptateurs par version.
3. **[`crf-fixtures`](../../packages/crf-fixtures/README.md)** — le parseur de
   dictionnaire CSV et le générateur déterministe de faux enregistrements (tests,
   bancs d'essai).
4. **[`crf-project-template`](../../packages/crf-project-template/README.md)** — la
   trame déclarative d'un projet CRF (instruments, champs, métadonnées) en Effect
   Schema.
5. **[`services/crf`](../../services/crf/README.md)** — le microservice HTTP (Hono)
   qui expose ces capacités en API.

### Bibliographie et profils de chercheurs

Comment Atlas enrichit ses données avec des sources publiques.

1. **[`citation-types`](../../packages/citation-types/README.md)** puis
   **[`citation`](../../packages/citation/README.md)** — les types et la logique de
   récupération/regroupement de citations (OpenAlex).
2. **[`citation-fetch`](../../packages/citation-fetch/README.md)** et
   **[`fetch-one-api-page`](../../packages/fetch-one-api-page/README.md)** — la
   pagination et la récupération HTTP bas niveau.
3. **[`researcher-profiles`](../../packages/researcher-profiles/README.md)** — la
   génération de profils de chercheurs à partir de ces données.

### Outils transverses

- **[`errors`](../../packages/errors/README.md)** — les types d'erreurs partagés et
  leur mapping HTTP, consommés par presque tous les autres paquets.
- **[`validators`](../../packages/validators/README.md)** — les validateurs
  partagés (email, contenu JSON…).
- **[`net`](../../packages/net/README.md)** — les diagnostics réseau (DNS, TLS,
  connectivité).

## Et ensuite ?

- Pour les **signatures précises** (fonctions et types exportés par chaque
  paquet), chaque README de paquet documente son interface publique, complétée
  par la JSDoc du code. Une **Référence API** générée (TypeDoc) est prévue pour
  centraliser ces signatures.
- Pour le **détail d'une décision** (pourquoi tel choix), l'[index des
  ADR](../decisions/) trace le raisonnement.
