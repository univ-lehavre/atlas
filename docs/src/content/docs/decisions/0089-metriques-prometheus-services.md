---
title: "0089 — Métriques Prometheus des services applicatifs (/metrics via Effect)"
---

## Contexte

Le contrat d'interface avec le cluster ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/),
ligne « Métriques ») exige que **chaque service applicatif expose `/metrics`** et
déclare un `ServiceMonitor`, _« aucune donnée personnelle dans les labels
(cardinalité + RGPD) »_. Côté plateforme, **Prometheus** scrappe ces
`ServiceMonitor` (observabilité déléguée au cluster, [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).

Aujourd'hui **aucun service `atlas` n'expose `/metrics`** : le `ServiceMonitor`
côté cluster scrappe du vide (finding de l'audit de maturité 2026-06-15, issue
#400, priorité _high_). Le service `services/crf` (Hono) a déjà une instrumentation
**OpenTelemetry de traces** (`telemetry.ts`), opt-in et _no-op safe_, montée comme
**Layer Effect** — mais **rien côté métriques**.

Termes (charte 0052, R2) :

- **métrique Prometheus** : série temporelle numérique (compteur, jauge,
  histogramme) exposée en texte sur un endpoint HTTP, que Prometheus collecte
  périodiquement (_scrape_).
- **`ServiceMonitor`** : ressource Kubernetes (CRD de l'opérateur Prometheus) qui
  déclare _quel_ service scraper et _où_ ; elle vit côté **cluster**, pas ici.
- **cardinalité** : nombre de combinaisons de labels d'une métrique. Une étiquette
  à valeurs non bornées (identifiant, e-mail, URL brute) fait exploser la mémoire
  de Prometheus — et, si elle porte une donnée personnelle, viole le RGPD.

## Décision

Exposer `/metrics` sur `services/crf` en **réutilisant le socle Effect/OTel
existant**, pas une seconde pile d'observabilité.

1. **Production des métriques via `Metric` d'Effect.** Le code applicatif déclare
   ses métriques avec l'API `Metric` native d'Effect (compteurs/jauges/histogrammes),
   homogène avec le runtime Effect du dépôt
   ([ADR 0045](/atlas/decisions/0045-runtime-central-effect/)). Pas de
   `prom-client` parallèle. Première métrique livrée : un compteur
   `crf_http_requests_total{method,route,status}` (middleware Hono), où `route`
   est la **route _templatée_** (`/api/v1/records/:id`) — jamais l'URL réelle.

2. **Export via le pont OTel → Prometheus.** Un `MeterProvider` OpenTelemetry
   (`@opentelemetry/sdk-metrics`) équipé du `PrometheusExporter`
   (`@opentelemetry/exporter-prometheus`) — **tous deux déjà au lockfile**, alignés
   sur la version OTel des traces — sert le registre. Le pont `Metric` Effect →
   OTel est fourni par `@effect/opentelemetry` (déjà dépendance du service).

3. **Endpoint `/metrics` porté par le service, pas un second port.** Le
   `PrometheusExporter` OTel démarre par défaut son propre serveur HTTP (port 9464) : on **désactive** ce serveur intégré et on branche le rendu du registre
   sur une **route Hono `/metrics`** du service. Un seul port exposé, un seul
   `Service`/`ServiceMonitor` à déclarer côté cluster.

4. **Opt-in et _no-op safe_, comme les traces.** Les métriques ne démarrent que si
   activées par variable d'environnement (même convention que `telemetry.ts` :
   un drapeau dédié, p. ex. `OTEL_METRICS_ENABLED`, et les `OTEL_*` standard). Si
   désactivé, `/metrics` répond `404`/`503` sans coût ni dépendance collecteur —
   le service tourne exactement comme avant.

5. **Garde-fou RGPD sur les labels (opposable).** Aucune métrique ne porte en
   label une donnée à cardinalité non bornée ou personnelle : pas d'ID de projet,
   d'e-mail, de token, d'URL brute. Les labels autorisés sont **bornés et
   non-identifiants** (méthode HTTP, route _templatée_ `/api/v1/records` — jamais
   l'URL réelle, code de statut, nom logique du service). Vérifié en revue ; toute
   nouvelle métrique respecte cette règle.

**Périmètre de la première itération : `services/crf` seul.** L'app SvelteKit
`apps/find-an-expert` (autre runtime, route serveur SvelteKit) fera l'objet d'un
**second incrément** une fois le patron validé ici.

## Alternatives écartées

- **`prom-client` (lib Prometheus dédiée) montée sur une route Hono.** Plus direct,
  mais introduit une **seconde pile d'observabilité** à côté d'OTel/Effect, avec sa
  propre API de métriques et son propre registre — divergence des conventions et
  double maintenance. Écarté au profit de la continuité du socle.

- **Laisser le `PrometheusExporter` exposer son propre port (9464).** Évite une
  route applicative, mais oblige à exposer **deux ports** et à déclarer un
  `ServiceMonitor` pointant sur un port distinct du trafic applicatif — friction
  côté contrat cluster et côté `Service` k8s. Écarté : un seul port, `/metrics` sur
  le service.

- **Livrer le `ServiceMonitor` dans cette PR.** C'est un **point de contact cluster**
  (ADR 0033, garde-fou « même PR ») ; le manifeste `ServiceMonitor` et le `Service`
  k8s relèvent du déploiement, côté cluster. Atlas livre la **capacité** (`/metrics`
  exposable) ; le câblage du scrape est tracé séparément. À cadrer avec le dépôt
  `cluster` quand le déploiement réel l'exige.

## Statut

Accepted.

## Conséquences

- **Capacité, pas garantie.** Atlas rend `/metrics` _exposable_ ; l'activation
  effective (drapeau d'env) et le scrape (`ServiceMonitor`) sont décidés au
  déploiement — cohérent avec la posture « le code permet, le déployeur décide »
  ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
- **Test de non-régression.** Le `/metrics` activé doit répondre `200` avec un
  corps au format d'exposition Prometheus, et `503` quand désactivé — couvert par
  des tests du service (unité + intégration via `createApp`).
- **Forçage du build au boot (piège `ManagedRuntime`).** Le runtime Effect
  construit son `Layer` _paresseusement_, au premier effet exécuté ; or le pont
  `Metrics.layer` ne lie le reader Prometheus à son `MeterProvider` qu'à ce
  moment-là. Un scrape arrivant avant tout trafic verrait donc `/metrics` **vide
  indéfiniment**. `makeCrfRuntime` force donc le build une fois au démarrage
  (exécution d'`Effect.void`) quand les métriques sont actives. Le runtime est
  par ailleurs construit avec `makeRuntimeWithShutdown` pour que le finalizer du
  reader tourne à l'arrêt (`SIGTERM`/`SIGINT`), symétrique avec les traces.
- **Met à jour l'ADR 0033 « même PR » le jour du `ServiceMonitor`.** Quand le scrape
  sera câblé, le point de contact cluster sera reflété dans l'ADR 0033 dans la même
  PR (garde-fou existant).
- **Incrément suivant : `find-an-expert`.** Même décision, runtime SvelteKit ;
  rouvre uniquement le point 3 (où monter la route `/metrics` dans SvelteKit).
- **Avance l'issue #400** (finding _high_ « `/metrics` Prometheus ») et la maturité
  CNCF/observabilité du contrat.

Voir aussi [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(contrat cluster, exigence métriques) et le `telemetry.ts` du service `crf`
(patron opt-in _no-op safe_ pour les traces, transposé ici aux métriques).
