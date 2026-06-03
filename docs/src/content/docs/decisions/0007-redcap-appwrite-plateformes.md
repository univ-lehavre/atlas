---
title: 0007 — REDCap et Appwrite comme plateformes externes
---

## Contexte

Les applications du monorepo ont besoin de deux capacités externalisables :

1. **Formulaires structurés administratifs** — capture de données métadonnées
   (descripteurs de projets, inscriptions, suivis administratifs).
   Le besoin est mature et bien servi par REDCap, qui apporte
   contrôle de version des questionnaires, exports CSV/JSON, et un
   modèle de permissions éprouvé.
2. **Backend as a service (BaaS)** — authentification, base de données
   documents, stockage de fichiers. Le besoin est commun aux trois
   apps SvelteKit ; le construire en interne aurait dispersé l'effort.
   Appwrite couvre les trois axes avec une API homogène et un mode
   self-host possible.

REDCap est un outil de **collecte de données généraliste** (formulaires
structurés, enquêtes, suivis), adapté à tout domaine métier. Le risque
clé est l'**enfermement métier** : si REDCap héberge des données **sensibles**,
le coût de migration en cas de changement de stratégie devient prohibitif.

## Décision

- **REDCap** est utilisé pour des formulaires **structurés administratifs**
  (descripteurs de projets, inscriptions, suivis). **Aucune donnée de santé ni
  donnée sensible** n'est saisie dans REDCap depuis ce monorepo.
- **Appwrite** est utilisé comme BaaS (auth / base / stockage). Les
  apps déployées (`amarre`, `ecrin`, `find-an-expert`) utilisent le
  SDK officiel `node-appwrite` côté serveur (voir [ADR 0010](/atlas/decisions/0010-node-appwrite-sdk-25/)).

Toute extension du périmètre REDCap vers des données de santé ou sensibles
demande une révision explicite de cet ADR.

## Statut

Accepted.

## Conséquences

**Bénéfices.** Le périmètre des données saisies dans REDCap (formulaires
structurés administratifs, aucune donnée de santé ni sensible) est explicite et
révisable. L'effort sur le BaaS est concentré sur Appwrite, ce qui
permet un package partagé (`packages/baas`, `packages/auth`) plutôt
qu'une réimplémentation par app.

**Prix à payer.** Deux plateformes externes à maintenir et à surveiller
(rotations de secrets, mises à jour de SDK, suivi des CVE). La migration
depuis Appwrite serait coûteuse si le projet devait basculer ; le
package `@univ-lehavre/atlas-baas` mitige en encapsulant l'API, mais
n'élimine pas le coût.

**Garde-fous.**

- Les secrets REDCap et Appwrite sont inventoriés dans
  [docs/quality/security.md](/atlas/quality/security/) avec leur procédure
  de rotation.
- Les SDK Appwrite sont pinnés et leur upgrade fait l'objet d'une PR
  isolée pour faciliter le rollback.
- Toute introduction de données de santé ou sensibles dans REDCap nécessite une
  révision de cet ADR **et** une revue conformité.
