---
title: "Matrice de couverture de bout en bout"
---

Cette page cartographie la **couverture de bout en bout** (_end-to-end_, ci-après
**E2E** : un parcours complet exercé contre ses vraies dépendances) des chaînes
fonctionnelles d'Atlas, décidée par l'[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/),
volet (c). Elle complète la [pyramide de tests](/atlas/quality/tests/) — qui
décrit les **niveaux** — d'une vue **par chaîne** : pour chacune, quels niveaux
existent, et surtout **« a-t-elle déjà tourné en vrai ? »**. La mémoire des
écarts E2E ne se limite plus au [registre de drifts](/atlas/decisions/0056-registre-drifts/)
(réactif, post-mortem) : les **trous connus** sont nommés ici, d'un coup d'œil.

Atlas **déploie sur** un cluster ([ADR 0043](/atlas/decisions/0043-publication-images-ghcr/))
mais ne possède ni matériel ni topologie : cette matrice cartographie ses
**chaînes de test**, pas une infrastructure.

## Lire la matrice

- **Niveaux** : _unitaire_ (logique pure, _mocks_), _intégration_ (modules
  combinés, parfois une vraie dépendance locale via [Docker](/atlas/glossary/)),
  _E2E_ (parcours complet contre la pile réelle).
- **« A tourné ? »** distingue trois états :
  - **CI** — exécuté automatiquement en intégration continue, donc tourné à
    chaque déclenchement concerné ;
  - **banc** — joué à la main sur un banc local (preuve d'intégration,
    [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)), pas
    en CI ;
  - **_self-skip_** — câblé mais **se saute** silencieusement quand sa dépendance
    est absente ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/),
    [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)) : un _skip_ n'est
    pas un échec, mais un **état** que cette page rend visible.

## La matrice

| Chaîne fonctionnelle                                                  | Unitaire |                Intégration                 |                 E2E                 | A tourné ?                                                                         | Trous connus                                                                                                         |
| --------------------------------------------------------------------- | :------: | :----------------------------------------: | :---------------------------------: | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **App `amarre`** (auth _magic link_ → demande CRF)                    |    ✅    |     ✅ Appwrite + REDCap (_self-skip_)     | ✅ _smoke_ Playwright (_self-skip_) | CI nocturne `e2e.yml` **si REDCap présent**, sinon _self-skip_                     | _Smoke_ E2E **skippé si REDCap absent** (cf. `e2e.yml`) ; sur runner public sans ZIP REDCap, job vert sans tester    |
| **App `sillage`** (auth _magic link_ → accueil membre)                |    ✅    |     ✅ endpoint projets (mock service)     | ✅ _smoke_ Playwright (_self-skip_) | CI nocturne `e2e.yml` **si REDCap présent**, sinon _self-skip_                     | _Smoke_ E2E **skippé si REDCap absent** ; câblage REDCap du parcours `sillage` encore partiel (pré-REDCap)           |
| **Contrat REDCap** (client CRF ↔ instance REDCap)                     |    ✅    | ✅ `surveys.test.ts` (_self-skip_ REDCap)  |    — (porté par le _smoke_ app)     | _Self-skip_ sans REDCap local ; banc via les sandboxes                             | Pas de job CI dédié hors `e2e.yml` ; couverture E2E réelle conditionnée à la présence du ZIP REDCap                  |
| **Contrat Appwrite** (flux d'auth _magic link_)                       |    ✅    | ✅ `signup.test.ts` (_self-skip_ Appwrite) |    — (porté par le _smoke_ app)     | _Self-skip_ sans Appwrite + Mailpit locaux ; banc via les sandboxes                | Pas de job CI dédié hors `e2e.yml`                                                                                   |
| **Service `crf`** (Hono : routes → service → dépôt)                   |    ✅    |     ✅ routes contre dépôt en mémoire      |       — (exercé via `amarre`)       | CI `ci.yml` (vitest)                                                               | Pas de _smoke_ HTTP du service déployé en propre ; validé indirectement par le _smoke_ `amarre`                      |
| **DataOps `citation`** (ingestion → Dagster → dbt → lignage → dérive) |    ✅    |   ✅ _smoke_ MinIO (Docker, _self-skip_)   | ✅ chaîne GitOps complète sur banc  | CI `ci.yml` : purs + intégration MinIO **si Docker** ; chaîne complète au **banc** | Chaîne complète (ingestion réelle → run K8s → Marquez → MLflow) **non câblée en CI**, jouée au banc                  |
| **DataOps `mediawatch`** (GKG GDELT → Dagster → dbt → lignage)        |    ✅    |   ✅ _smoke_ MinIO (Docker, _self-skip_)   |     ⏳ chaîne GitOps (en cours)     | CI `ci.yml` : purs + intégration MinIO **si Docker**                               | Bout-en-bout GitOps moins mûr que `citation` ; lignage vérifié par convention de nommage, pas via Marquez réel en CI |

> Légende — ✅ couvert · ⏳ partiel / en cours · — sans objet (couvert par une
> autre ligne). « A tourné ? » : **CI** (intégration continue), **banc** (joué à
> la main, [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)),
> **_self-skip_** (se saute si la dépendance manque).

## Le trou nommé : _smoke_ E2E skippable si REDCap absent

Le _smoke_ E2E des applications (`sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts`
et `sandbox/sillage-sandbox/tests/e2e/smoke.spec.ts`) ne tourne en CI (`e2e.yml`)
**que si la source REDCap est présente**. [REDCap](/atlas/glossary/) est un
logiciel propriétaire dont le ZIP n'est pas committé : sur un runner public sans
ce ZIP, le _workflow_ détecte l'absence et **se termine en succès avec un avis
explicite** plutôt que d'échouer — le step `Detect REDCap source availability`
de `e2e.yml` pose `available=false` et conditionne tous les steps suivants.

C'est un **état assumé**, pas un défaut masqué. Forcer ce _smoke_ à échouer quand
REDCap manque rouvrirait le piège que l'[ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/)
écarte (une CI rouge pour une dépendance absente, sans rapport avec le code
poussé) et contredirait le _self-skip_ assumé par l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/).
La matrice **rend l'état lisible** ; elle n'arme aucune porte qui frictionnerait
au mauvais moment. Côté test, la suite se saute elle aussi (`test.skip` sur
`isStackReachable()`) quand Mailpit ou Appwrite n'est pas joignable, pour qu'un
`pnpm test:smoke` local reste sûr sans la pile Docker.

## La chaîne DataOps de bout en bout

La chaîne `citation` enchaîne **ingestion** (`raw_snapshot`, sync incrémental
rclone) → **orchestration** [Dagster](/atlas/glossary/) → **transformations**
dbt (staging → curated → marts) → **traçabilité de lignage** (OpenLineage) →
**suivi de dérive** ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/),
[ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/)). Sa couverture est
**à deux étages** :

- **En CI** (`ci.yml`, job _DataOps (Python)_ via `pnpm dataops:check`) :
  l'essentiel des tests sont **purs et hermétiques** (loaders DuckDB ou S3
  _monkeypatchés_, aucune I/O réelle). Les tests d'**intégration** lancent un
  vrai `dbt build` contre un [MinIO](/atlas/glossary/) éphémère (épinglé par
  digest) — `test_dbt_models.py`, `test_index_load.py`,
  `test_researcher_embeddings.py`, `test_lakehouse.py`, `test_minio_fixture.py` —
  et **se sautent si Docker est absent** (`conftest.py` appelle `pytest.skip`).
- **Au banc** : le bout-en-bout réel (ingestion d'un échantillon borné, run dans
  des pods Kubernetes, lignage visible dans Marquez, métriques dans MLflow) est
  une **preuve d'intégration jouée à la main** ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)),
  **non câblée en CI**. Les tests de lignage et de dérive vérifient en CI la
  **convention** (graphe de datasets connecté, no-op sans `OPENLINEAGE_URL` /
  `MLFLOW_TRACKING_URI`) ; la visibilité réelle dans Marquez reste une preuve de
  banc.

La chaîne `mediawatch` (GKG GDELT, [ADR 0064](/atlas/decisions/0064-collecte-mediawatch-gkg/)
et [ADR 0065](/atlas/decisions/0065-classification-universites-heuristique-referentiel/))
suit le même modèle de tests mais son bout-en-bout GitOps est **moins mûr** que
celui de `citation`.

## Miroir testé doc ↔ specs

Cette matrice ne peut pas **dériver** des tests réels sans qu'un contrôle
bronche : un **miroir testé doc ↔ specs** ([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/),
dans l'esprit de l'[ADR 0028](/atlas/decisions/0028-documentation-verifiable/))
vérifie que les chaînes listées correspondent aux fichiers de test réels du
dépôt — `*.spec.ts` côté Node, `test_*.py` côté DataOps. Concrètement, les
ancres de cette page doivent rester alignées avec :

- `sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts`,
  `sandbox/sillage-sandbox/tests/e2e/smoke.spec.ts` (_smoke_ Playwright) ;
- `apps/amarre/tests/integration/crf/surveys.test.ts` (contrat REDCap),
  `apps/amarre/tests/integration/auth/signup.test.ts` (contrat Appwrite) ;
- `dataops/citation-dagster/tests/test_*.py`,
  `dataops/mediawatch-dagster/tests/test_*.py` (chaîne DataOps).

Si une chaîne de test apparaît, disparaît ou change de niveau, la matrice est
**rédigée à la main** : le miroir **signale** la dérive, à charge de mettre cette
page à jour dans la même trace — comme un drift `ouvert` lie une issue
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
