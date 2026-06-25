---
title: "0075 — Déploiement prod par digest : atlas fournit les points d'injection, cluster les remplit"
---

## Contexte

La bascule en production de la code-location `citation` se fait en **GitOps** :
le dépôt voisin `cluster` réconcilie les manifestes que `atlas` publie
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/), frontière de
responsabilité). Jusqu'ici, l'overlay prod
(`dataops/citation-dagster/deploy/overlays/prod/`) référençait l'image **par un
tag mutable d'exemple** (`0.0.0`), et le script `deploy/install.sh`, en profil
`prod`, **buildait l'image, figeait ce tag** dans deux endroits de l'overlay,
**commitait** et **poussait** sur Gitea — `atlas` résolvait donc lui-même la
référence d'image livrée.

Deux problèmes apparaissent à mesure que la chaîne cluster se met en place.

**Double-couplage du tag.** L'image était référencée **deux fois** dans
l'overlay prod, à tenir synchronisées **à la main** : `images[].newTag` de la
kustomization (champ `image:` du conteneur gRPC) et `DAGSTER_CURRENT_IMAGE` du
patch (image que le `K8sRunLauncher` donne aux **pods de run**). Un oubli de
synchronisation déployait le serveur gRPC sur le bon tag mais les runs sur un
code divergent, **sans erreur franche** (audit cluster #499).

**Le tag mutable n'est pas le bon contrat.** Le déploiement « zéro-touch » de la
code-location (côté cluster : App-of-Apps et build événementiel) déploie l'image
**par digest immuable** `registry:80/citation-dagster@sha256:…`, jamais par tag.
Le **seed** cluster injecte ce digest dans l'overlay **au moment du
déploiement**, sans toucher au dépôt `atlas` source. C'est `cluster` — qui
**build et pousse** l'image dans son registry interne — qui connaît le `sha256`
réel ; `atlas`, qui ne build pas l'image en production, ne peut pas le résoudre.

Le profil `prod` de `install.sh` matérialisait donc une **frontière périmée** :
`atlas` ne fabrique ni ne résout l'image de production. Garder ce profil, c'est
garder un chemin qui prétend « figer le tag » alors que la référence est désormais
remplie par `cluster` — code mort et trompeur.

## Décision

> **En production, `atlas` ne résout jamais la référence de l'image : il
> n'expose que des points d'injection nommés (placeholders), et `cluster` les
> remplit au déploiement par le digest immuable de l'image qu'il a buildée et
> poussée. `atlas` ne build, ne tague, ni ne pousse l'image de production —
> cette chaîne appartient entièrement à `cluster`.**

### (A) Deux placeholders nommés, jamais une référence en dur

L'overlay prod expose **deux** placeholders distincts, l'un pour chaque endroit
où l'image est référencée — fin du double-couplage :

| Placeholder                 | Emplacement (`atlas` FOURNIT)                     | Forme attendue (`cluster` REMPLIT)                                      |
| --------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| `__CITATION_IMAGE_DIGEST__` | `kustomization.yaml` → `images[].digest`          | le `sha256:…` **seul** (Kustomize réécrit le conteneur en `…@sha256:…`) |
| `__CITATION_IMAGE__`        | `patch-s3-envfrom.yaml` → `DAGSTER_CURRENT_IMAGE` | la **référence complète** `registry:80/citation-dagster@sha256:…`       |

Les deux sont remplis **d'un seul coup** par le seed cluster, à partir du même
`sha256` : plus aucun tag à tenir synchronisé à la main. Kustomize traite les
placeholders comme du texte, donc `kubectl kustomize` et `validate.sh` passent
sur l'overlay tel qu'il vit dans `atlas` (placeholders intacts) — la
substitution est un geste **cluster**, hors du dépôt `atlas`.

### (B) `atlas` ne fabrique pas l'image de production — retrait du profil `prod` d'`install.sh`

`deploy/install.sh` ne pilote plus que le profil **`bench`** : build de l'image
du banc, `validate.sh`, lint/tests Python, puis poussée GitOps vers la cible
confirmée (garde-fou de cible, [ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/) §B).
C'est la **preuve applicative de référence** (même code qu'en prod, seul le
backing S3 diffère, [ADR cluster 0085](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0085-preuves-applicatives-local-path.md)).

Le profil `prod` — qui buildait l'image, figeait le tag dans l'overlay,
commitait et poussait — est **retiré** : sa raison d'être (résoudre la référence
d'image livrée) appartient désormais à `cluster`. En production, `atlas` se
limite à **maintenir l'overlay avec ses placeholders** ; la fabrique de l'image,
l'injection du digest et la réconciliation sont des gestes `cluster`.

### Frontière avec le contrat cluster

Cette décision **renforce** la frontière [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
sans la déplacer : `atlas` livre des **manifestes** (ici, un overlay paramétré
par placeholders) ; `cluster` opère le **registry**, **build/pousse** l'image, et
**réconcilie**. Le « comment » de la fabrique et de l'injection du digest vit
**côté cluster** (ses propres ADR App-of-Apps et build événementiel) et n'est pas
dupliqué ici (neutralité de domaine, [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
Le seul **engagement opposable** côté `atlas` est : exposer ces deux noms de
placeholders, à ces deux emplacements, dans ces deux formes. Un changement de
ces noms est un point de contact d'interface → mise à jour de
[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) dans la même PR.

## Alternatives écartées

- **Garder le profil `prod` mais pousser l'overlay avec placeholders intacts
  (sans figer).** Écarté : `atlas` continuerait de **builder et pousser une
  image** de production sur le registry interne — exactement la responsabilité
  que le modèle cluster (build node-side puis événementiel) reprend. Garder une
  moitié du chemin (build) en retirant l'autre (résolution) laisse une frontière
  ambiguë et un build prod redondant.

- **Un seul placeholder réutilisé aux deux endroits.** Écarté : les deux
  emplacements attendent des **formes différentes** — `images[].digest` veut le
  `sha256:` seul, `DAGSTER_CURRENT_IMAGE` veut la référence complète. Un
  placeholder unique forcerait l'injecteur à reconstruire l'une à partir de
  l'autre, fragile et implicite ; deux noms explicites rendent le contrat lisible
  des deux côtés.

- **Déployer par tag immuable (SHA) plutôt que par digest.** Écarté : un tag,
  même « immuable » par convention, reste un **pointeur mutable** côté registry
  (rien n'empêche un re-push). Le digest `@sha256:` est l'identité **réelle** du
  contenu de l'image ; c'est la seule référence qui garantit que le pod tire
  exactement l'image buildée (esprit [ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/),
  provenance des images).

## Statut

Accepted (2026-06-25). L'overlay prod de `citation` expose les deux placeholders
(`__CITATION_IMAGE_DIGEST__`, `__CITATION_IMAGE__`) ; `deploy/install.sh` ne
pilote plus que le profil `bench`. La contrepartie cluster (injection des deux
placeholders par le seed, dans l'ordre `_DIGEST_` d'abord) est livrée côté
infrastructure (audit #499 résolu de bout en bout).

## Conséquences

**Bénéfices.** La référence d'image de production est **immuable par digest** et
**factorisée en un seul point d'injection logique** (deux placeholders remplis
ensemble) : le double-couplage du tag disparaît, un déploiement ne peut plus
faire diverger serveur gRPC et pods de run. La frontière `atlas`/`cluster` est
**plus nette** : `atlas` ne fabrique ni ne résout l'image de prod, donc ne peut
plus la fabriquer « à côté » du chemin cluster. `install.sh` ne porte plus de
chemin prod trompeur (sed devenu no-op).

**Prix à payer.** `atlas` **perd la capacité de déployer la prod en une
commande** depuis son propre script : la bascule prod réelle passe désormais
entièrement par la chaîne `cluster` (build de l'image puis injection du digest).
C'est assumé : ce n'était pas le rôle d'`atlas` (frontière [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
La preuve applicative reste pilotable depuis `atlas` (profil `bench`).

**Garde-fous.**

- **`validate.sh`** continue de garantir que l'overlay prod **build** et reste
  **valide** avec les placeholders, et que l'invariant « aucun tag `:dev` en
  prod » ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) tient.
- **Les noms et formes des deux placeholders sont un point de contact
  d'interface** : un changement met à jour [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
  dans la même PR (garde-fou « même PR »).
- **Aucune valeur d'instance (digest, registry) n'entre dans le dépôt `atlas`** :
  seul le placeholder y vit ; le `sha256` réel est rempli par `cluster` au
  déploiement ([ADR 0022](/atlas/decisions/0022-naming-convention/),
  [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
