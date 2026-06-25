---
title: "0077 — Topologie : deux dépôts cluster & atlas, frontière outillée"
---

## Contexte

Le travail se répartit sur **deux dépôts Git distincts** sous l'organisation `univ-lehavre`,
fortement intriqués mais à responsabilités séparées :

- [`cluster`](https://github.com/univ-lehavre/cluster) — **socle d'infrastructure** générique
  (Kubernetes, stockage Ceph, plateforme DataOps Dagster/Marquez, provisioning Ansible/OpenTofu),
  doc VitePress, DOI Zenodo `10.5281/zenodo.20287209` ;
- [`atlas`](https://github.com/univ-lehavre/atlas) — **applicatif/métier** (monorepo apps SvelteKit,
  paquets TS, services Hono, CLI, + `dataops/` Python), doc Astro Starlight, DOI Zenodo
  `10.5281/zenodo.18310357`.

La frontière est **conçue, pas accidentelle** : posée par l'[ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md)
(le métier vit dans `atlas`, jamais dans `cluster` ; le socle n'expose que des valeurs d'exemple
génériques) et formalisée par l'[ADR cluster 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md)
— un **contrat d'interface machine-lisible** que `cluster` publie vers `atlas`, en sens unique
(miroir applicatif : [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).

Trois contenus vivent en apparence « à cheval » sur les deux dépôts, d'où la question de topologie :

- **ADR** — chaque dépôt tient sa propre série numérotée (`0001…`), si bien qu'un même numéro
  désigne deux décisions sans rapport (`0033` = _Orchestration Ansible DataOps_ côté cluster,
  _Contrat d'interface_ côté atlas) ; plusieurs ADR parlent de l'autre dépôt ou de la frontière.
- **Drifts** — un registre de dérives dont la discipline (ADR cluster 0046,
  [ADR 0056](/atlas/decisions/0056-registre-drifts/)) veut qu'un drift soit **corrigé dans le code
  et consigné dans la même PR**.
- **Python / dataops** — l'arrivée du Python dans `atlas` (`dataops/citation-dagster`,
  `dataops/citation-dbt`) alors que la _plateforme_ DataOps (Dagster, Marquez) vit, elle, dans `cluster`.

> Faut-il **fusionner** `cluster` et `atlas` ? Créer un **3ᵉ dépôt documentation** (ADR + drifts) ?
> Le Python de dataops justifie-t-il un **dépôt Python dédié** ? Ou **garder et durcir** la séparation ?

Méthode de tranchage : analyse multi-agents avec lecture réelle du code des deux dépôts
(cartographie 6 dimensions → 5 architectures-cibles → panel de notation à 4 lentilles → vérification
adversariale par 3 sceptiques indépendants).

## Décision

> **Garder DEUX dépôts. Ne pas fusionner `cluster` et `atlas`. Ne pas créer de 3ᵉ dépôt
> « documentation ». Ne pas extraire de dépôt « Python/dataops » — pour l'instant. On adopte le
> _statu quo renforcé_ : la frontière `cluster ↔ atlas` n'est pas subie, elle est _outillée_ là où
> elle est aujourd'hui tenue à la main.**

La **mise en œuvre** de ce durcissement (hygiène de citabilité, lever la double source de vérité,
index ADR-système, check statique intra-cluster, e2e assumé manuel) fait l'objet d'un **plan
d'exécution** dédié : [Topologie des dépôts — feuille de route](/atlas/plans/2026-06-11-topologie-depots-cluster-atlas/).
Cet ADR porte le _pourquoi_ ; le plan porte le _comment_.

### Le couplage réel est de déploiement, pas de code

**Zéro import croisé** TypeScript ↔ Python, **zéro dépendance pip commune** (vérifié).
`atlas/dataops/citation-dagster` consomme `cluster` uniquement par **variables d'environnement et
noms de Service** (FQDN `*.svc.cluster.local`, `BUCKET_HOST`/`BUCKET_PORT`/`BUCKET_NAME`,
`AWS_ACCESS_KEY_ID`), jamais la structure interne des manifestes. C'est la **signature canonique
d'une frontière saine** : fusionner ne supprimerait aucun import — il n'y en a pas.

### La frontière est une décision, réaffirmée quatre fois

Les [ADR cluster 0023](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0023-plateforme-exemple-generique.md)
(métier ↔ socle) et **0041** (« dbt, data quality… vivent dans atlas, PAS dans ce dépôt »), leur
miroir [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/), et l'**ADR cluster 0042**
(cas-limite des sandbox tranché _en faveur_ de la frontière) la posent. Le code confirme : la
plateforme Dagster côté cluster est livrée `load_from: []` ; `atlas` l'enregistre via
`workspace-patch.yaml`. Fusionner contredirait frontalement des ADR _Accepted_ récents et leur
enforcement (`audit:structure`).

### Quasi rien à dédupliquer, deux objets citables réels

Glossaires **disjoints** (1 seul terme commun, « Docker »). 52 ADR infra / 57 ADR applicatifs sur
des domaines indépendants. La seule vraie duplication d'outillage est le sous-bloc `[tool.ruff.lint]`
(~10 lignes) — et encore partielle (`py312` cluster vs `py310` atlas, imposé par la parité de l'image
Dagster). Surtout : **deux DOI Zenodo distincts et vivants** (deux intégrations GitHub↔Zenodo) —
fusionner en détruirait un, perte de citabilité académique **irréversible**.

### L'e2e n'est pas un garde-fou CI (correction adversariale)

La première analyse faisait du smoke-test e2e (banc Lima) un filet mécanique bloquant en CI. **C'est
faux** : `cluster/.github/workflows/bench-freshness.yml` documente que le banc Lima **ne peut pas**
tourner en CI (nested virt, arm64, ~30 min) et tourne **à la main** (bus-factor 1). Le vrai garde-fou
automatisable est un **check statique intra-cluster** (contrat ↔ `platform/`), pas l'e2e — qui reste
une preuve datée manuelle, à assumer comme telle.

## Alternatives écartées

Cinq options évaluées (somme des notes d'un panel à 4 lentilles — coût/réversibilité, couplage/
frontière, gouvernance académique, expérience développeur — sur 40, + note minimale) :

| Rang  | Option                                                  | Score /40 | Min   | Motif de rejet                                                                                      |
| ----- | ------------------------------------------------------- | --------- | ----- | --------------------------------------------------------------------------------------------------- |
| **1** | **Statu quo renforcé** (2 dépôts, frontière outillée)   | **31**    | **7** | ✅ **Retenue** — seule sans verdict < 7, seule pleinement réversible                                |
| 2     | Hybride (2 dépôts + paquet d'outillage partagé extrait) | 25        | 5     | Le mini-dépôt partagé sort la source de vérité hors du périmètre des DOI                            |
| 3     | Dépôt Python/dataops dédié                              | 20        | 3     | Prématuré ; le couplage runtime du Python pointe à 100 % vers cluster (pas vers un orphelin)        |
| 4     | Dépôt documentation dédié                               | 17        | 4     | La doc atlas est générée depuis le code ; le registre de drifts doit naître dans la PR du correctif |
| 5     | Monorepo unique (fusion)                                | 13        | 2     | Coût élevé, partiellement irréversible, casse un DOI                                                |

- **Fusionner (option 5)** — collision intégrale des numéros d'ADR `0001`–`0052` (renumérotation/
  namespace sur ~109 fichiers), conversion d'en-tête VitePress↔Starlight, réconciliation des chaînes
  de release (`release-please` ↔ Changesets), stratégies Git divergentes, réveil du conflit Vite
  qu'atlas a payé pour fuir. Tout cela pour 1 à 6 % des commits qui dialoguent à travers la frontière.
- **3ᵉ dépôt documentation (option 4)** — la doc atlas est **dérivée du code** ; la sortir transforme
  des sources uniques en copies à synchroniser. Le registre de drifts doit **naître dans la PR du
  correctif** (ADR cluster 0046, [ADR 0056](/atlas/decisions/0056-registre-drifts/)) ; le déporter
  casse cette discipline. Citer un flux éditorial vivant sous un DOI (snapshot figé) est une tension.
- **Dépôt Python/dataops dédié (option 3)** — le couplage runtime pointe à 100 % vers cluster ; le
  bon geste, le cas échéant, serait dataops _dans_ cluster, pas un orphelin.
  L'[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) a choisi `dataops/` _dans_ le monorepo
  pour co-localiser producteur Python et futur consommateur TS. Extraire le seul Dagster scinderait la
  paire **Dagster ↔ dbt** (`dataops/` contient aussi `citation-dbt`).
  **Signal de réévaluation** : le jour où un consommateur TS du Parquet est écrit **et** que la charge
  data monte, rouvrir cette question en évaluant **dataops complet → cluster**.
- **Hybride (option 2)** — un paquet d'outillage partagé extrait sort la source de vérité hors du
  périmètre des DOI, pour économiser ~10 lignes de config ruff. Coût > gain.

## Statut

Accepted (2026-06-25). **Extrait** la décision portée jusqu'ici par le plan transverse
[Topologie des dépôts cluster & atlas](/atlas/plans/2026-06-11-topologie-depots-cluster-atlas/)
(scission de la page-frontière repérée par l'[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/) :
décision → cet ADR, feuille de route → le plan conservé). **S'appuie sur** l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(contrat d'interface, dont le présent ADR confirme la frontière) sans le modifier. **Cohérent avec**
l'[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (dataops dans le monorepo) et
l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) (registre des drifts). Côté `cluster`, la
décision miroir relève des ADR cluster 0023/0041/0042/0043.

## Conséquences

**Bénéfices.** La topologie cesse d'être une question ouverte : les quatre options sont tranchées par
écrit, avec leur score et leur motif de rejet — plus de re-débat. La citabilité académique (deux DOI)
est **préservée**. La frontière saine (couplage de déploiement, pas de code) est **documentée et
opposable**. La voie de durcissement est tracée dans un plan séparé, réversible et à faible coût.

**Prix à payer.** La cohérence fine du contrat `cluster ↔ atlas` **reste partiellement tenue par
discipline humaine** (bus-factor 1, banc e2e non-CI-able) — la fusion ne résoudrait pas ce point. Les
numéros d'ADR restent **homonymes** entre dépôts (`0033` ici ≠ `0033` cluster) : on contourne par
namespace de citation (`CL-`/`AT-` dans l'index-système prévu au plan), pas par renumérotation.

**Garde-fous.** Le présent ADR **ne change aucun point de contact** du contrat d'interface : il
documente une topologie, il ne touche pas aux noms de bucket/namespace/Service. Le garde-fou « tout
changement d'un point de contact → mettre à jour l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
dans la même PR » **reste** la règle, inchangée. Les ADR du dépôt `cluster` sont cités en **lien
GitHub absolu** (séries numérotées disjointes). Le **seuil de bascule** est inscrit : si un consommateur
TS du Parquet est écrit **et** la charge data croît, rouvrir l'option (3) en évaluant dataops complet
→ cluster.
