---
title: "0040 — Caches applicatifs : flux + backing-service injectable vs fichier local"
---

## Contexte

L'[audit cloud-native du 2026-06-04](/atlas/audit/2026-06-04-cloud-native/)
relève deux écarts qui se rejoignent sur le même mécanisme — les caches
applicatifs persistés en **fichiers JSON locaux** :

- **Facteur VIII (Concurrency).** Plusieurs caches sont des fichiers JSON
  écrits sur le disque local, **sans verrou**. Hors d'un déploiement
  mono-instance, deux processus qui rafraîchissent le même cache se marchent
  dessus (lecture/écriture concourantes, dernier écrivain gagne, fichier
  corrompu).
- **Facteur XI (Logs).** `crf-logs` **persiste** des données dérivées de logs
  dans un fichier (`.crf-stats.json`) au lieu de traiter le flux à la volée.

Le code montre deux états de maturité différents face à ce problème :

- `packages/crf-logs/src/cache.ts` code le chemin **en dur** :
  `const CACHE_PATH = path.resolve(process.cwd(), ".crf-stats.json")`, avec un
  TTL de 24 h (`isCacheStale` compare `Date.now() - cache.savedAt` à
  `CACHE_TTL_MS`). Le chemin n'est **pas injectable** : il dépend du répertoire
  de travail du processus. En multi-instance, chaque instance écrit son propre
  fichier (caches divergents) ou, si elles partagent un volume, se corrompent
  mutuellement.
- `packages/atlas-stats/src/cache.ts` a **déjà** l'indirection attendue :
  `resolveCachePath()` lit la variable d'environnement `ATLAS_STATS_CACHE_PATH`
  (avec `path.resolve` et garde sur la chaîne vide) et **retombe** sur la racine
  du workspace (`resolveWorkspaceRoot`, marqueur `pnpm-workspace.yaml`) sinon.
  Le **point d'injection par variable d'environnement existe déjà** ; seul le
  _back-end_ reste un fichier.

Le pattern de l'indirection est donc **acquis sur un paquet, absent sur
l'autre**. Il faut trancher une posture commune avant que d'autres caches ne
soient écrits sur le même moule du fichier en dur.

Périmètre : ce dépôt de **code** — quels back-ends de cache le code doit
supporter et comment il les sélectionne. Le **dimensionnement de l'infra**
(quel Redis, quelle base, quel cluster) relève du
[contrat d'interface avec le cluster (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/),
hors de cet ADR.

## Décision

**Un cache applicatif n'est pas un fichier JSON local. C'est un _backing
service_ injecté par variable d'environnement, avec un back-end choisi à
l'exécution selon l'environnement.**

### Le cache est un backing service, pas un état local du processus

On aligne les caches sur le facteur IV (backing services) déjà appliqué pour
le CRF, le BaaS et la télémétrie : une ressource externe attachée par
**URL + credentials en variables d'environnement**, et non un fichier lié au
système de fichiers du processus. Le processus reste **stateless** (facteur VI) :
son cache vit en dehors de lui et survit à son redémarrage comme à sa
réplication.

### Le back-end est sélectionné à l'exécution, pas codé en dur

Le code expose une **interface de cache** (`readCache` / `writeCache` /
`isCacheStale`, signatures déjà présentes dans les deux paquets) et choisit son
implémentation **à partir de l'environnement** :

- **dev** — implémentation **in-memory** (Map en mémoire de processus), zéro
  dépendance, jetable au redémarrage ;
- **test** — implémentation **mock** déterministe (état injecté par le test,
  aucune écriture disque, aucun TTL horloge-réelle) ;
- **prod** — **backing service partagé** : un cache clé-valeur en mémoire
  distribuée, ou la **base relationnelle** déjà présente comme stockage de
  l'application. Le choix prod-précis relève de l'infra ; le code doit
  **supporter au moins l'un des deux** derrière la même interface.

La sélection passe par une **variable d'environnement** (sur le modèle déjà en
place : `ATLAS_STATS_CACHE_PATH` côté `atlas-stats`). On généralise ce point
d'injection : la variable ne désigne plus un _chemin de fichier_ mais une
**ressource** (back-end + sa connexion). Le fallback fichier reste toléré
**uniquement en local mono-instance**, jamais comme cible de production.

### `crf-logs` acquiert l'indirection, et traite ses logs en flux

- `packages/crf-logs/src/cache.ts` doit **abandonner `CACHE_PATH` en dur** et
  passer par le même point d'injection que `atlas-stats`. C'est le **minimum**
  pour fermer l'écart du facteur VIII.
- Au-delà du cache, `crf-logs` doit **traiter les logs en flux** plutôt que de
  les persister dans `.crf-stats.json` (facteur XI) : la source de vérité des
  logs est le flux stdout, le cache n'est qu'une **vue dérivée et
  reconstructible**, jamais le stockage primaire.

### Garde-fous de cohérence en multi-instance

Tout cache de production doit assumer la **concurrence** (facteur VIII) : accès
atomiques (le backing service garantit l'atomicité, pas le code applicatif),
TTL porté par le back-end quand il le permet, et **aucune hypothèse
mono-instance** dans le code. Un cache qui ne tolère pas deux écrivains
simultanés n'est pas prod-ready.

## Statut

Accepted (2026-06-04).

## Conséquences

**Bénéfices.**

- L'écart **VIII (Concurrency)** de l'audit se ferme : plus de fichier JSON
  local sans verrou, un cache partagé et atomique en multi-instance.
- L'écart **XI (Logs)** se ferme côté `crf-logs` : flux comme source de vérité,
  cache comme vue dérivée jetable.
- Le processus devient **réellement stateless** (VI) : il peut être répliqué ou
  redémarré sans perdre — ni corrompre — son cache.
- Le **point d'injection existe déjà** (`ATLAS_STATS_CACHE_PATH`) : on
  généralise un acquis plutôt que d'inventer un mécanisme, et `crf-logs`
  s'aligne sur un paquet voisin.
- dev / test / prod partagent **la même interface**, ce qui rapproche
  l'environnement de dev de la prod (facteur X) sans imposer un backing service
  lourd en local.

**Prix à payer.**

- `packages/crf-logs/src/cache.ts` doit être **réécrit** : `CACHE_PATH` en dur
  disparaît, et la persistance fichier des logs cède la place au traitement en
  flux. C'est un changement de contrat interne, pas un simple paramétrage.
- La prod gagne une **dépendance d'infra** (cache distribué ou base) là où un
  fichier suffisait apparemment — coût réel, mais c'est le prix d'un
  déploiement multi-instance correct.
- Trois implémentations à maintenir derrière l'interface (in-memory, mock,
  backing service), au lieu d'une seule lecture/écriture fichier.

**Garde-fous.**

- Le **fallback fichier** reste autorisé **en local mono-instance uniquement**
  (DX, démos), jamais en production : la variable d'environnement pointe alors
  vers un vrai backing service.
- La sélection du back-end est **explicite par variable d'environnement** —
  pas de détection magique : un environnement non configuré tombe sur
  l'implémentation in-memory (dev), jamais silencieusement sur un fichier
  partagé.
- Le **dimensionnement de l'infra** de cache reste hors de cet ADR : il relève
  du [contrat d'interface avec le cluster (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/).
- Suivi opérationnel : la mise en flux de `crf-logs` (logs) et la sûreté en
  concurrence (caches) sont les deux chantiers issus de l'audit
  ([#305](https://github.com/univ-lehavre/atlas/issues/305) — logs en flux ; [#306](https://github.com/univ-lehavre/atlas/issues/306) —
  concurrence) ; cet ADR fixe la posture, les issues portent l'exécution
  (cf. [cadence d'audit, ADR 0039](/atlas/decisions/0039-cadence-audit-transverse/)).
