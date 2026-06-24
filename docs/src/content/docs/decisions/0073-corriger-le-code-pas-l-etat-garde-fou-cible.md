---
title: "0073 — Corriger le code, pas l'état, et garde-fou de cible de déploiement"
---

## Contexte

Atlas s'apprête à piloter des **déploiements réels**. Deux jalons sont en vue :
la **preuve applicative sur banc** (un cluster Kubernetes mono-nœud local, monté
le temps d'éprouver le pipeline) et la **mise en production** de la DataOps
OpenAlex (plans [« Mise en production de la DataOps OpenAlex »](/atlas/plans/2026-06-23-mise-en-production-openalex/)
et [« Topologie des dépôts cluster/atlas »](/atlas/plans/2026-06-11-topologie-depots-cluster-atlas/)).
Jusqu'ici, Atlas produisait surtout du code et des manifestes ; désormais, des
gestes vont **toucher un environnement vivant**.

Cette bascule fait apparaître deux risques que le code seul ne prévient pas, et
qui n'étaient pas encore tranchés côté Atlas.

**Risque 1 — réparer à chaud.** Devant un run qui échoue sur un banc déjà monté,
la tentation est de **réparer l'état directement** : éditer un objet Kubernetes à
la main (`kubectl edit`, `kubectl patch`), recréer un `Secret` oublié, enchaîner
des étapes manuellement « pour faire avancer ». Ces gestes **ne survivent pas**
(perdus au prochain démontage), **ne sont ni tracés ni revus**, et **masquent la
vraie cause** dans le code versionné (un manifeste, un asset, un script de
déploiement) qui, lui, reste cassé. Ils créent une **illusion de fonctionnement** :
« ça marche sur le banc » alors que le code, rejoué à neuf ou appliqué en
production, échouera de nouveau.

**Risque 2 — agir sur la mauvaise cible.** Atlas et son cluster cohabitent
souvent sur un **même poste de contrôle** : un banc monté et opérationnel, et
l'intention d'opérer une production réelle. Les coordonnées des deux cibles
(endpoints intra-cluster, identifiants S3, URL de poussée GitOps) sont
**injectées par l'infrastructure** : le dépôt voisin `cluster` publie un script
d'accès qui génère un fichier `.env` local (gitignoré, à régénérer après chaque
remontage du banc), conformément au **contrat d'interface**
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)). Le danger est
d'**agir sur la production en croyant viser le banc** (ou l'inverse) parce que la
cible aurait été **déduite** de l'état ambiant du shell plutôt que **confirmée
explicitement**. Un cas concret existe déjà : les pods de run de la
code-location lisent leurs accès S3 par **nom de source** —
`citation-s3-access` au banc, `citation-datalake` en production
([plan de mise en production](/atlas/plans/2026-06-23-mise-en-production-openalex/)) ;
viser la mauvaise cible, c'est brancher la mauvaise donnée sans message d'erreur
franc.

Ces deux risques ont déjà été **résolus côté infrastructure** dans le dépôt
voisin `cluster`, qui opère le cluster depuis plus longtemps :
[cluster ADR 0046 « Corriger le code d'installation, pas l'état du cluster »](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)
pour le premier, et
[cluster ADR 0053 « Isolation multi-cible : banc et prod sur le même poste »](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0053-isolation-multi-cible-banc-prod.md)
pour le second. Le présent ADR **transpose ces deux doctrines à Atlas**, dans son
propre périmètre applicatif — sans en reprendre les mécanismes d'infrastructure,
qui ne vivent pas ici ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/),
frontière de responsabilité).

## Décision

> **Une correction d'un environnement déployé passe toujours par le code ou la
> déclaration versionnés, jamais par une réparation à chaud de l'état ; et aucun
> geste applicatif n'agit sur une cible de déploiement qui n'a pas été
> explicitement confirmée. La cible n'est jamais une valeur par défaut ni une
> déduction de l'environnement ambiant.**

### (A) Corriger le code, pas l'état

La **source de vérité unique** d'un déploiement Atlas est son **code versionné** :
manifestes Kubernetes (`Application` Argo CD, Deployment, CronJob…), assets et
configuration de la DataOps, scripts de déploiement et de validation
(`deploy/install.sh`, `deploy/validate.sh`). C'est ce code qu'on éprouve et qu'on
corrige.

1. **L'édition manuelle de l'état (`kubectl edit`, `kubectl patch`, `kubectl
apply` à la main, recréation d'objet) est réservée au DIAGNOSTIC**
   — isoler une cause, confirmer une hypothèse — **jamais au correctif durable**.
   Dès que la cause est comprise, le correctif **repart dans le code versionné**,
   puis est **re-prouvé par un run reproductible** sur le banc avant la
   production. Un correctif qui ne vit que dans l'état du cluster **n'est pas un
   correctif**.

2. **Le déploiement passe par GitOps, pas par un geste impératif.** Atlas livre
   ses images taguées et ses manifestes ; un opérateur de réconciliation (Argo
   CD) applique l'état déclaré depuis le dépôt de manifestes. La voie nominale
   est **build → tag immuable → poussée du manifeste → réconciliation**, jamais
   un `kubectl apply` direct en production. Une dérive corrigée à la main hors de
   ce chemin serait **écrasée** à la prochaine réconciliation — ou pire,
   survivrait en silence et divergerait du dépôt.

3. **Tout écart révélé au run est corrigé dans le code ET consigné** au
   **registre de drifts** ([ADR 0056](/atlas/decisions/0056-registre-drifts/)) :
   un écart qui n'apparaît qu'à l'exécution (variable d'environnement ignorée des
   tests, accès S3 mal nommé, déploiement non récursif) est une leçon à capturer,
   pas à patcher et oublier. Le geste manuel de diagnostic n'est jamais la
   solution : il est **remplacé** par le correctif versionné, dans la même
   session.

4. **La preuve est un run reproductible**, pas un constat ponctuel « ça
   marchait » : la correction n'est acquise que lorsqu'un run rejoué depuis le
   code éprouvé la confirme ([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
   Ce qui marche sur le banc ne « compte » que parce que la correction vit dans
   le code qui partira en production.

### (B) Garde-fou de cible — refuser d'agir sur une cible non confirmée

Atlas **lit** les coordonnées de sa cible de déploiement dans le fichier `.env`
généré par l'infrastructure (contrat [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) ;
il ne les invente pas et ne les code pas en dur (les valeurs d'instance vivent
dans la configuration, [ADR 0022](/atlas/decisions/0022-naming-convention/),
[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).

1. **Pas de cible par défaut.** Un geste applicatif qui touche un environnement
   déployé (poussée GitOps, run réel pointant un S3/Postgres distant, bascule de
   production) exige une cible **explicitement nommée et confirmée**. À cible
   **absente, vide ou ambiguë**, le geste **refuse de s'exécuter** (échec
   bruyant, message nommant la cible attendue), il ne **retombe jamais** sur une
   cible « par défaut » ni sur celle que porterait l'environnement du shell.
   C'est l'inverse d'un échec muet : on rend l'erreur de cible **bruyante**.

2. **La confirmation est une intention, pas une déduction.** Le simple fait
   qu'un `.env` de banc soit présent dans le répertoire **ne vaut pas**
   autorisation d'agir en production, et inversement. Quand banc et production
   coexistent, l'**ambiguïté n'est pas tranchée à la place de l'opérateur** :
   l'outil **refuse** et exige la désignation explicite. L'ergonomie reste fluide
   quand une seule cible est plausible ; la friction est **ciblée précisément sur
   le cas dangereux** de coexistence.

3. **La bascule de production reste une action humaine.** Aucun agent ni
   automatisme ne déclenche un déploiement réel ; la preuve sur banc précède
   toujours la production, sur le **même code applicatif**
   ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/), frontière de
   responsabilité ; [plan de mise en production](/atlas/plans/2026-06-23-mise-en-production-openalex/),
   lot de bascule). Le garde-fou de cible **protège l'humain de l'inadvertance**,
   il ne le remplace pas.

### Frontière avec le contrat cluster — Atlas ne sonde pas un cluster vivant

Ce garde-fou opère **entièrement côté Atlas, à partir du `.env` injecté**. Atlas
**n'auto-détecte pas** l'état d'un cluster : il ne **sonde pas** un cluster vivant
pour deviner sur quelle cible il « se trouve », n'interroge pas son identité, ne
compare pas d'empreinte de cluster. Cette détection-là, lorsqu'elle existe, vit
**côté infrastructure** ([cluster ADR 0053](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0053-isolation-multi-cible-banc-prod.md)),
au-delà de la frontière de responsabilité ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
Atlas se contente de **refuser d'agir** tant que sa cible n'est pas
**explicitement confirmée dans son `.env`** — une règle simple, locale, et qui
ne franchit jamais la frontière.

## Alternatives écartées

- **« Réparer à chaud, c'est plus rapide. »** Écarté : la rapidité est illusoire.
  Un patch volatil est perdu au prochain démontage et masque une cause qui
  ré-échouera en production. La lenteur de « corriger le code puis re-prouver par
  un run » est le **coût assumé de la reproductibilité** ; pour itérer vite, on
  raccourcit le banc, pas la rigueur (esprit
  [cluster ADR 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).

- **« Une cible par défaut sensée (le banc) évite la friction. »** Écarté : un
  défaut, c'est exactement le **vecteur de l'accident** — l'opérateur qui prépare
  une commande de production se voit servir le banc (ou l'inverse) sans le voir.
  Le cas « coexistence » est l'ambiguïté à **ne pas trancher** à la place de
  l'opérateur (esprit
  [cluster ADR 0053](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0053-isolation-multi-cible-banc-prod.md)).

- **« Atlas sonde le cluster pour savoir sur quelle cible il agit. »** Écarté :
  cela ferait **franchir la frontière** [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
  à Atlas (sonder un cluster vivant relève de l'infrastructure) et **dupliquerait**
  une responsabilité déjà tenue côté `cluster`. Atlas reste sur **ce qu'il lit**
  (son `.env`) ; il refuse si la cible n'y est pas confirmée, sans aller
  interroger l'environnement.

## Statut

Proposed.

## Conséquences

**Bénéfices.** Ce qui est prouvé sur le banc vaut en production parce que la
correction vit dans le **code éprouvé**, pas dans un état volatil : plus de « ça
marchait pourtant hier ». La cible d'un geste de déploiement est **prouvablement**
celle annoncée, jamais une déduction silencieuse — un geste de production ne peut
plus « réussir » en ayant en réalité visé le banc, ni l'inverse. Les deux règles
sont **opposables en revue** : un correctif resté à l'état du cluster, ou un
chemin sans cible confirmée, est un motif de refus clair, appuyé sur une décision
tracée.

**Prix à payer.** Corriger le code puis rejouer un run est **plus lent** qu'un
patch à chaud — coût assumé. Exiger une cible explicite ajoute une **friction**,
volontairement **ciblée sur la coexistence banc/production** ; le poste
mono-cible reste fluide. Le garde-fou ferme le **chemin par défaut, silencieux et
facile** vers l'accident ; il ne protège **pas** un geste impératif tapé
sciemment dans un shell mal pointé, ni un opérateur qui force volontairement une
cible — c'est alors un **opt-in visible**, pas une distraction. On supprime
l'accident par inadvertance, pas la liberté de l'opérateur déterminé.

**Garde-fous.**

- **En revue de PR**, un correctif qui ne vit que dans l'état d'un environnement
  (et non dans le code/le manifeste versionné) est refusé et renvoyé vers le
  code ; un drift révélé au run sans entrée au registre
  ([ADR 0056](/atlas/decisions/0056-registre-drifts/)) est signalé.
- **Le déploiement réel reste GitOps + action humaine** : poussée de manifeste →
  réconciliation, jamais `kubectl apply`/`edit` en production ; aucun agent ne
  déclenche la bascule ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
- **Tout geste sur cible non confirmée échoue bruyamment** plutôt que de retomber
  sur un défaut ; la cible se lit dans le `.env` injecté
  ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)), jamais codée en
  dur ni devinée de l'environnement.
- **Aucune valeur d'instance n'entre dans le code générique** : coordonnées de
  cible, noms d'hôtes, identifiants restent en configuration locale gitignorée
  ([ADR 0022](/atlas/decisions/0022-naming-convention/),
  [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)) ; les étiquettes
  de cible (banc/production) sont **génériques**, jamais une marque ni un
  établissement.

Doctrines transposées de l'infrastructure voisine —
[cluster ADR 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)
(corriger le code, pas l'état) et
[cluster ADR 0053](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0053-isolation-multi-cible-banc-prod.md)
(isolation multi-cible) — au périmètre **applicatif** d'Atlas, dans le respect de
la frontière [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/).

```

```
