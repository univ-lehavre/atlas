---
title: "0088 — Portabilité : architectures (arm64/x86_64), OS et libc"
---

## Contexte

Le dépôt est développé sur **macOS/arm64** (Apple Silicon) et déployé sur
**Linux/x86_64** ; le banc de validation cluster (Lima) tourne en **arm64**. Trois
plans de portabilité coexistent donc sans qu'aucun document ne pose la posture
d'ensemble — chaque `Dockerfile`, chaque dépendance native et chaque hook git
décidait dans son coin. Un audit transverse (arm64 ↔ x86_64, OS, libc) a relevé
des écarts concrets, dont certains **silencieux** (verts en CI parce que la CI ne
teste qu'une seule cible).

Trois notions reviennent et méritent d'être fixées à leur première occurrence
(charte 0052, R2) :

- **libc** : la bibliothèque C standard liée par les binaires natifs. Deux
  implémentations courantes sous Linux : **glibc** (Debian, Ubuntu — `python:slim`)
  et **musl** (Alpine — `node:alpine`). Un binaire précompilé pour glibc **ne se
  charge pas** tel quel sur musl, et inversement.
- **manifest-list** (ou _image index_ OCI) : un manifeste Docker qui, sous un même
  tag/digest, **agrège plusieurs images** une par couple architecture/OS. Au `pull`,
  le démon résout l'entrée correspondant à la plateforme hôte. Les images de base
  officielles (`node`, `python`) en sont — c'est ce qui rend leur `FROM` portable
  arm64/x86_64 sans effort.
- **manifest-list au build** : à l'inverse, produire une image multi-architecture
  exige `docker buildx` avec `--platform linux/amd64,linux/arm64` ; un build par
  défaut ne produit **que** l'architecture du runner.

## Décision

La portabilité visée est **arm64 + x86_64 sous Linux** pour les **artefacts
déployés**, et **macOS arm64/x86_64 + Linux** pour l'**outillage de développement**.
Windows et les architectures exotiques (s390x, ppc64le…) ne sont **pas** des
cibles ; le code ne doit simplement pas leur être hostile sans raison.

Quatre invariants en découlent :

1. **Images de base par manifest-list, jamais par image arch-spécifique.** On épingle
   par digest (ADR 0084) le digest **de la manifest-list**, pas celui d'une variante
   `amd64`. Acquis pour `node` et `python`.

2. **`dataops/` (Python) est verrouillé sur Python 3.10**, en **parité 1:1** avec
   l'image Dagster du cluster (verrou chart Helm, ADR cluster 0006) et avec
   `requires-python >=3.10,<3.11`. Le `.python-version`, `uv.lock` et le `FROM …
python:3.10-slim` doivent rester alignés. **Un bump Dependabot qui change la
   _minor_** (`3.10` → `3.x`) **est un faux positif à refuser** : seul le digest d'un
   `python:3.10-slim` se met à jour. (C'est précisément la dérive corrigée par cet
   ADR : un bump avait fait passer les images à `3.14-slim` alors que tout le reste
   de la chaîne — dev, tests, cluster — reste sur 3.10.)

3. **Les dépendances natives non couvertes en musl restent confinées aux CLI
   hôtes**, hors des images Alpine déployées. `@duckdb/node-api` (DuckDB) n'a **aucun
   binding musl** : il vit dans `packages/citation`, consommé uniquement par
   `cli/citation` (exécuté sur l'hôte de dev, glibc/macOS — jamais dockerisé en
   Alpine). De même `@napi-rs/canvas` et `tesseract.js` (rendu/OCR) restent dans
   `cli/researcher-profiles`. **Corollaire opposable** : dockeriser l'un de ces
   paquets en `node:alpine` est interdit sans d'abord traiter le support musl (ou
   basculer la base sur glibc).

4. **Le code applicatif n'assume ni OS ni binaire système.** Pas d'appel à un binaire
   externe non garanti (`unzip`, `sed -i` à syntaxe BSD…) ; manipulation de chemins
   via `path`/`pathlib` et `os.tmpdir()` ; séparation de lignes tolérante au `CRLF`
   (`/\r?\n/`).

## Alternatives écartées

- **Builds Docker multi-arch en CI** (`buildx --platform linux/amd64,linux/arm64`).
  Souhaitable à terme, mais **écarté pour l'instant** : le job `images` charge l'image
  localement (`load: true`) pour son smoke healthcheck, et `load` est
  **mono-plateforme** par construction ; le multi-arch imposerait soit de scinder
  build-multi-arch (push) et build-smoke (load mono-arch), soit d'émuler arm64 via
  QEMU — ce qui **multiplie le temps CI** d'un check requis pour un déploiement
  aujourd'hui exclusivement x86_64. Conséquence assumée : **les images publiées sur
  GHCR sont amd64**. À rouvrir le jour d'un déploiement arm64 (voir Conséquences).

- **Aligner `dataops/` sur Python 3.14** (au lieu de revenir à 3.10). Écarté : casse
  le verrou de parité 1:1 avec le cluster (ADR cluster 0006) et viole
  `requires-python <3.11` ; le gain (surface CVE de l'image de base plus fraîche) ne
  justifie pas une divergence dev↔prod sur la version du langage.

- **Matrice CI multi-OS (macOS/Windows runners).** Écarté : coût (minutes runner
  payantes) disproportionné pour un déploiement Linux-only ; macOS est déjà couvert
  _de facto_ comme environnement de développement quotidien.

## Statut

Accepted.

## Conséquences

- **Garde-fou Python à deux niveaux.** _Mécanique_ : `dependabot.yml` ignore les
  bumps **major et minor** de version pour les images `python` et `php` (écosystème
  `docker`) — seul le digest (patch sécurité du même tag) est proposé ; un
  `3.10` → `3.14` ne peut plus être ouvert automatiquement. _Documentaire_ : le
  commentaire au-dessus du `FROM` rappelle la consigne au relecteur. (`node` n'a pas
  besoin de règle : son tag est interpolé par `ARG`, non bumpé par Dependabot.)
- **Surface CVE 3.10 assumée.** `python:3.10-slim` traîne des vulnérabilités sans
  correctif amont ; elles relèvent du `.trivyignore` tracé (ADR 0069), **pas** d'un
  changement de _minor_. Les images `dataops/` ne passent pas le gate Trivy de
  `images.yml` (hors matrice) — la revue se fait au build cluster.
- **Déploiement arm64 = travail explicite.** Tant que la décision « images amd64 »
  tient, un nœud arm64 tirerait une image émulée (lente) ou échouerait. Le passage
  au multi-arch (buildx + `platforms`) et le déblocage des binaires CI épinglés
  `…-amd64`/`linux_x64` (kubeconform, gitleaks) sont les deux chantiers à mener
  **ensemble** ce jour-là.
- **Nouvelle dépendance native = question de libc d'abord.** Avant d'ajouter une
  dépendance à binaire précompilé, vérifier sa couverture **musl** si elle doit
  entrer dans une image Alpine ; sinon la cantonner à un CLI hôte (invariant 3).

Voir aussi [ADR 0084](/atlas/decisions/0084-pinning-images-base-par-digest/)
(épinglage par digest), [ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)
(scan d'image, `.trivyignore`) et [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)
(frontière Python de `dataops/`).
