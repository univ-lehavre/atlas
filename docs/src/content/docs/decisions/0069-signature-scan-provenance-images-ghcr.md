---
title: "0069 — Scan, signature et provenance des images conteneur publiées sur GHCR"
---

## Contexte

L'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/) a doté `atlas` d'un
point de publication explicite : la CI construit les **7 images de déploiement**
du dépôt (les apps SvelteKit `atlas-dashboard`, `crf-dashboard`, `amarre`,
`ecrin`, `find-an-expert`, `sillage` et le service Hono `crf`) et les pousse sur
**GHCR** (_GitHub Container Registry_, le registre de conteneurs intégré à
GitHub), sous `ghcr.io/<org>/<image>`, taguées par **SHA** de commit (immuable) et
par version sémver — jamais `latest` en déploiement.
L'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) fixe que le cluster
**consomme** ces images en référençant un tag explicite dans ses manifestes.

Aujourd'hui, ces images sont publiées **sans contrôle de contenu ni preuve
d'origine**. L'audit de maturité du dépôt
([2026-06-15](/atlas/audit/2026-06-15-maturite-referentiels/)) le constate par
lecture directe des workflows et le classe en deux verrous _supply chain_ (chaîne
d'approvisionnement logicielle) distincts, dans cet ordre de priorité :

1. **Aucun scan de vulnérabilité de l'image** (recommandation **H2** de l'audit,
   gap G2 — _meilleur rapport impact/effort_). Une image embarque une **couche de
   base** (`node:…-alpine`) et des paquets système (OpenSSL, libc, utilitaires
   Alpine) qui portent leurs propres failles — des **CVE** (_Common
   Vulnerabilities and Exposures_, les identifiants publics de vulnérabilités) —
   invisibles pour les outils Node existants (Dependabot, `audit:security`) qui ne
   regardent que les dépendances JavaScript, et pour le **SBOM** (_Software Bill of
   Materials_, l'inventaire des dépendances) de sources produit par
   [`sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml),
   qui décrit le dépôt, pas le livrable conteneurisé.

2. **Aucune signature ni provenance liée à l'image** (recommandation **H2**, gap
   G1). Rien n'atteste que `ghcr.io/<org>/atlas-dashboard` a bien été produite par
   la CI d'`atlas`, depuis un commit de `main`, et non reposée par un tiers ayant
   obtenu un accès au registre. `atlas` produit pourtant déjà de la **provenance**
   (l'attestation tracée « cet artefact vient de ce build, ce commit, ce
   workflow ») pour ses **paquets npm** —
   [`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)
   attache une attestation _in-toto_ signée par OIDC à chaque publication — mais
   **rien d'équivalent pour les conteneurs**.

S'ajoute une incohérence documentaire à lever (recommandation **H3**, gap G13) :
[`SECURITY.md`](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md)
revendique « **SLSA Build L3** » alors que le mécanisme réel (provenance npm via
runners GitHub hébergés) plafonne à **L2** par construction, et qu'**aucun ADR**
ne documente le palier réellement atteint. **SLSA** (_Supply-chain Levels for
Software Artifacts_) est le cadre de l'OpenSSF qui gradue, de L0 à L3, les
garanties sur la **fabrication** d'un artefact (build scripté, provenance signée,
build durci non falsifiable). Publier de la provenance d'image **étaye** enfin une
revendication SLSA sur le livrable conteneur et **oblige** à réaligner
`SECURITY.md` sur le palier honnête.

Cette responsabilité est **celle d'`atlas`**, pas du cluster : c'est `atlas` qui
**fabrique** l'image et en connaît le commit d'origine. L'audit de notations cyber
du dépôt voisin `cluster` borne d'ailleurs explicitement son périmètre — « SBOM et
scan d'image côté `atlas` » y sont déclarés **hors champ**. Le dépôt `cluster` a,
lui, signé ses **archives de release** (`cosign keyless` + provenance SLSA, son
ADR 0088) ; la même exigence appliquée aux **images conteneur** revient au dépôt
qui les fabrique.

## Décision

> **Chaque image publiée sur GHCR est d'abord scannée pour ses vulnérabilités,
> puis signée et accompagnée d'une attestation de provenance et d'un SBOM par
> image. L'ordre est imposé : le scan d'abord (valeur immédiate), la
> signature/provenance ensuite. La signature et les attestations utilisent
> `cosign` en mode _keyless_ via l'OIDC de GitHub Actions — aucune clé privée à
> gérer. Tout porte sur le digest `sha256` de l'image, pas sur un tag. Sur _pull
> request_, la CI scanne l'image construite mais ne signe ni ne publie rien.**

Cela **étend** l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/) (qui
fixait _où, quand et comment_ les images sont publiées) d'un volet **chaîne
d'approvisionnement** : on ne se contente plus de publier l'image, on publie **de
quoi en juger le contenu et en prouver l'origine**.

### Pourquoi le scan d'abord : valeur immédiate sur le livrable déployé

L'ordre n'est pas cosmétique. Le **scan de vulnérabilité** (recommandation H2, gap
G2) est le geste à **plus fort retour sur effort** : il agit sur l'artefact
**réellement déployé** et révèle des **CVE concrètes** dès la première exécution —
une faille critique d'OpenSSL dans la couche Alpine, par exemple, qu'aucun outil
en place ne voyait. Il est livré **en premier**.

La **signature et la provenance** (gap G1) ont une valeur **latente** : elles ne
« font » rien tant qu'un consommateur ne **vérifie** pas, mais elles ferment la
porte à une image substituée et **lèvent l'incohérence de `SECURITY.md`** sur le
palier SLSA. Elles arrivent **ensuite**. _Pourquoi ne pas tout livrer d'un bloc ?_
Parce que séquencer expose la valeur la plus tangible le plus tôt, sans attendre la
plomberie d'attestation ; et parce que le scan, contrairement à la signature,
**tourne aussi sur les PR** et apporte donc de la valeur avant même tout push.

### Scan de vulnérabilité, y compris sur les PR

Chaque image construite est **scannée** par un analyseur de vulnérabilités
conteneur configuré pour `atlas`. Le scan tourne **sur PR comme sur `main`**, sur
le modèle de l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)
(« construire et tester avant de publier ») : une faille critique introduite par
un bump de couche de base **casse la PR** avant le merge, plutôt que d'arriver en
production. Sur `main`, le scan est rejoué et son rapport attaché aux artefacts du
run. _Neutralité des identifiants_ : l'outil concret reste un **détail
d'implémentation** du workflow ; son nom n'entre dans aucun identifiant (image,
paquet, variable), conformément à l'[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)
et à l'[ADR 0022](/atlas/decisions/0022-naming-convention/) — nommer l'outillage
réellement intégré reste légitime **en description**.

### Signature sans clé : cosign keyless (mécanisme éprouvé côté cluster)

Les images sont signées avec **`cosign`** (l'outil de signature d'artefacts du
projet OpenSSF **Sigstore**) en mode **_keyless_** : le job de publication obtient
un **jeton OIDC** (_OpenID Connect_, le protocole d'identité fédérée) de GitHub
Actions (`id-token: write`), et `cosign` lie la signature à l'**identité du
workflow** lui-même, attestée publiquement par Sigstore (journal de transparence).
_Pourquoi keyless plutôt qu'une clé ?_ Une clé privée en CI impose de la
**stocker** (secret), de la **faire tourner** et de la **révoquer** — une charge
sans gardien dédié. Le keyless **supprime ce stockage** : l'identité prouvée est
« ce workflow, sur ce dépôt, sur `main` », exactement ce que le consommateur veut
vérifier.

Ce mécanisme OIDC keyless est **déjà maîtrisé** dans `atlas` (c'est celui de la
provenance npm de
[`release.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/release.yml)) ;
il est aussi celui retenu par le dépôt `cluster` pour ses releases (son ADR 0088).
On reprend donc le **mécanisme** de `cluster` — `cosign keyless` + provenance
SLSA — mais sur une **cible différente** : `cluster` signe une **archive source**
de release ; `atlas` cible le **digest d'une image conteneur**. Un seul modèle de
confiance sur l'écosystème, pas deux.

### Provenance SLSA + SBOM rattachés à l'image

Deux attestations signées sont **attachées à l'image** dans le registre, adressées
par son **digest** :

- une **provenance SLSA** (attestation _in-toto_) qui lie l'image à son
  **commit**, son **workflow** et son **déclencheur** — elle répond à « cette
  image a-t-elle été produite par notre CI, depuis ce commit ? » et **étaye** enfin
  une revendication SLSA sur le livrable conteneur ;
- un **SBOM par image**, au format **CycloneDX** (cohérent avec
  [`sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml)),
  décrivant le **contenu réel de l'image** (couche de base, paquets système,
  dépendances) — distinct du SBOM de **sources** du monorepo, il répond à « qu'y
  a-t-il **dans** l'image livrée ? ».

### Adressage par digest, pas par tag mutable

Scan, signature et attestations portent sur le **digest** de l'image (l'empreinte
`sha256:…` de son contenu), **immuable**, et non sur un tag. _Pourquoi ?_ Un tag
peut être ré-écrit (republier `3.1.0` change ce vers quoi il pointe) ; vérifier une
signature attachée à un tag ne garantirait rien. Le digest est le seul ancrage qui
ne ment pas. Cela **renforce** la trajectoire de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)
(images « taguées explicitement ») et de l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/) :
au-delà du tag SHA déjà imposé, le **digest** devient la référence **vérifiable**,
et un manifeste qui épingle l'image par digest obtient une garantie de bout en bout.

### Comportement : scanner partout, signer/attester depuis `main`

- Sur **`main`** (post-merge) : build → push → **scan**, puis **signature** +
  **provenance** + **SBOM** attachés au digest.
- Sur **_pull request_** : build → **scan** (porte de qualité), **sans** login
  GHCR, **sans** signature ni push — comme l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)
  qui ne publie rien depuis une PR. Aucun jeton OIDC de signature n'est délivré à
  du code non encore mergé.

### Vérification documentée côté consommateur

Une signature et des attestations n'ont de valeur **que si elles sont vérifiées**.
La doc (page sécurité du site + référence pour le dépôt `cluster`) explicite la
commande de vérification (`cosign verify` avec l'**identité de certificat** =
workflow d'`atlas`, l'**émetteur OIDC** = `https://token.actions.githubusercontent.com`),
afin que le cluster — ou tout consommateur — puisse **exiger une image signée**
avant de la déployer. **Imposer** cette vérification (admission Kubernetes,
politique) relève de l'exploitant, pas de cet ADR
([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)) : `atlas` fournit la
**capacité** vérifiable, pas la **politique** d'un déployeur.

## Statut

Accepted (2026-06-24). **Étend** l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)
(volet scan/signature/provenance ajouté à la publication GHCR) et **renforce** la
trajectoire de l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (le
**digest** devient la référence vérifiable des images livrées au cluster). Couvre
les recommandations **H2** (scan + signature + provenance + SBOM d'image) et **H3**
(réalignement de la revendication SLSA) de l'audit de maturité
[2026-06-15](/atlas/audit/2026-06-15-maturite-referentiels/). Reprend le
**mécanisme** `cosign keyless` + provenance SLSA éprouvé côté `cluster` (son ADR
0088, appliqué là-bas aux **archives de release**, ici au **digest des images**) et
complète le SBOM de sources de
[`sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml)
par un SBOM **par image**. Le point de contact avec le dépôt `cluster` (les images
livrées sont désormais signées et adressables par digest) est répercuté dans
l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) dans la **même PR**
(garde-fou « même PR »), qui corrige aussi la revendication « SLSA Build L3 » de
[`SECURITY.md`](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md) en
palier réellement atteint. Mise en œuvre dans
[`images.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/images.yml).

## Conséquences

**Bénéfices.**

- Les **CVE** des couches de base (Alpine, Node) sont détectées sur l'artefact
  **réellement déployé**, là où ni Dependabot ni `audit:security` (dépendances
  JavaScript seules) ne regardaient — et **dès la PR**, avant le merge.
- Les images livrées gagnent une **chaîne de confiance vérifiable** : origine
  prouvée (signature + provenance), contenu inventorié (SBOM par image), failles
  connues détectées (scan) — **sans aucune clé privée** à gérer en CI.
- La revendication SLSA de `SECURITY.md` est enfin **étayée** par une provenance
  réelle et **réalignée** sur le palier honnête : l'incohérence documentaire G13
  est levée.
- Le modèle de confiance (`cosign keyless`, OIDC GitHub) est **identique** à celui
  de la provenance npm d'`atlas` et des releases du dépôt `cluster` : un seul
  mécanisme à comprendre et à vérifier sur l'écosystème.

**Prix à payer.**

- Chaque publication produit **plus d'artefacts** (scan, signature, provenance,
  SBOM par image) et **des étapes de plus** dans
  [`images.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/images.yml) —
  temps de CI accru, surtout sur la matrice de 7 images.
- **Dépendance à Sigstore** au moment de signer : une panne de ce service public
  ferait échouer la **signature** (à rejouer), sans bloquer le build ni le scan.
- Un scan **bloquant** sur PR peut **rejeter un merge** sur une CVE de couche de
  base que l'équipe ne peut pas corriger immédiatement (faille amont sans
  correctif) — d'où la politique d'exceptions ci-dessous.

**Garde-fous.**

- **Digest et scan couplés.** Un digest signé sans **veille de vulnérabilité**
  serait une **dette CVE** : l'image figée par son `sha256` paraît « de confiance »
  alors que ses couches vieillissent. Scan et signature/provenance sont donc
  **un même geste** sur le **même digest** — on ne signe jamais une image qu'on n'a
  pas scannée.
- **Signature et attestations sur le digest**, jamais sur un tag mutable : seule
  référence qui ne peut pas être ré-écrite.
- **Signer uniquement depuis `main`** : aucun jeton OIDC de signature n'est délivré
  à une PR ; les PR scannent mais ne signent ni ne publient (cohérent
  [ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)).
- **Toujours pas de secret dans une image** (invariant
  [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) /
  [ADR 0043](/atlas/decisions/0043-publication-images-ghcr/)) : le SBOM publié
  décrit le contenu de l'image — un secret qui y aurait fui serait d'autant plus
  exposé, ce qui rend la règle « jamais de `PRIVATE_*` au build » encore plus
  impérative.
- **Exceptions de scan tracées** : une vulnérabilité amont sans correctif se
  consigne dans un fichier d'ignore **versionné et commenté** (justification +
  référence CVE), pas en abaissant le seuil global ; chaque exception est revue.
- **Vérification consommateur documentée et opposable** : une image non signée par
  l'identité attendue **peut être refusée** au déploiement — mais la décision
  d'**imposer** cette vérification appartient à l'**exploitant** (l'ADR fournit la
  capacité, pas la politique d'un déployeur, conforme
  [ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
- **Neutralité des identifiants** : les outils de scan et de signature concrets
  restent des détails du workflow ; aucun nom de produit n'entre dans un
  identifiant (paquet, image, variable), conformément à l'[ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)
  et à l'[ADR 0022](/atlas/decisions/0022-naming-convention/).

## Alternatives écartées

- **Signer et attester d'abord, scanner ensuite.** Écarté : inverse l'ordre de
  valeur. Le scan agit sur le livrable réel et révèle des CVE concrètes dès le
  premier run (meilleur rapport impact/effort de l'audit) ; il tourne en plus sur
  les PR. La signature ne « fait » rien tant qu'on ne vérifie pas. On livre donc le
  scan en premier.
- **Signer avec une clé `cosign`/GPG.** Écarté : impose de stocker une clé privée
  en secret CI, de la faire tourner et de la révoquer — friction sans gardien
  dédié. Le _keyless_ OIDC supprime ce stockage en prouvant l'**identité du
  workflow**, ce que le consommateur veut réellement vérifier, et réutilise le
  mécanisme déjà en place pour la provenance npm.
- **Se contenter du SBOM de sources existant** ([`sbom.yml`](https://github.com/univ-lehavre/atlas/blob/main/.github/workflows/sbom.yml)).
  Écarté : il décrit les **dépendances du dépôt**, pas le **contenu de l'image**
  (la couche de base et ses paquets système échappent au scan), et ne porte aucune
  preuve d'origine rattachée à un artefact publié.
- **Ne scanner que sur `main`** (post-merge). Écarté : la faille de couche de base
  serait déjà mergée et publiée ; scanner **sur PR** la bloque avant qu'elle
  n'atteigne le registre, sur le principe « tester avant de publier » de
  l'[ADR 0043](/atlas/decisions/0043-publication-images-ghcr/).
- **Déléguer scan et signature au cluster** (au moment du déploiement). Écarté :
  c'est `atlas` qui **fabrique** l'image et en connaît le commit d'origine — la
  provenance ne peut être attestée de façon fiable qu'**au moment du build**.
  L'audit cyber du dépôt `cluster` place d'ailleurs explicitement « SBOM et scan
  d'image côté `atlas` » hors de son périmètre.
- **Adresser signature et scan par tag plutôt que par digest.** Écarté : un tag est
  ré-écrivable, donc une attestation attachée à un tag ne garantit rien. Seul le
  digest `sha256` ancre une vérification fiable — et un digest signé **sans** scan
  couplé créerait une dette CVE (image « de confiance » aux couches vieillissantes).
