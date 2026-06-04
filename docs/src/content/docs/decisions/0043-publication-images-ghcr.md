---
title: "0043 — Publication des images de déploiement sur GHCR"
---

## Contexte

La [Phase 4 du plan cloud-native (#308)](https://github.com/univ-lehavre/atlas/issues/308)
a doté chaque unité déployable d'une **image de déploiement** (5 apps SvelteKit +
le service Hono, sur le patron de `apps/sillage/Dockerfile`). Le
[contrat d'interface avec le cluster (ADR 0033)](/atlas/decisions/0033-contrat-interface-cluster/)
fixe déjà que `atlas` **livre des images taguées** au cluster, poussées sur un
**registry** que les manifestes référencent par tag exact (« pas de `latest` en
production »). Il fixe la **forme** des images et leur **tag**, mais ne disait
rien de **où et quand elles sont publiées** ni de **comment la CI les fabrique**.

Aujourd'hui, **rien ne publie ces images** : la CI les ignore. Le workflow
`release.yml` publie des **paquets npm**, pas des conteneurs ; aucun job ne
construit les `Dockerfile`. Conséquence déjà constatée : le patron `sillage`
portait deux bugs de fabrication latents (le `prepare` racine échouant sans
`git`, une dépendance runtime classée en `devDependency`) qu'aucune CI n'a
jamais attrapés, faute de construire l'image. Une image qui n'est jamais
construite en CI **dérive en silence**.

Le contrat 0033 mentionne « un registry interne » côté cluster, « déjà en
prod ». Mais ce registry est **interne au cluster** : il n'est pas une cible
naturelle pour la CI d'`atlas` (réseau, credentials, couplage inverse au
déploiement). Il faut une cible de publication **propre au dépôt applicatif**,
que le cluster peut ensuite consommer ou mirrorer.

## Décision

> **La CI d'`atlas` construit et publie les images de déploiement sur
> [GitHub Container Registry (GHCR)](https://ghcr.io), sous
> `ghcr.io/univ-lehavre/<nom-d'image>`. Chaque image est poussée depuis `main`,
> taguée par le **SHA de commit court** (immuable) et par la **version sémver**
> du `package.json` de l'unité — jamais `latest` comme référence de
> déploiement. Sur les *pull requests*, la CI **construit et teste** les images
> (smoke healthcheck) sans publier.**

### GHCR comme registry de publication de l'application

GHCR est le registry **du dépôt** : intégré à GitHub, authentifié par le
`GITHUB_TOKEN` du workflow (permission `packages: write`), sans secret à gérer ni
infrastructure à provisionner. Il devient la **source de vérité des images
publiées** par `atlas`. Cela **étend** le contrat 0033 sans le contredire :
0033 fixe que les manifestes du cluster référencent des images taguées sur un
registry ; cet ADR précise que **le registry d'origine est GHCR**. Le registry
interne du cluster reste libre de **mirrorer** depuis GHCR (décision du dépôt
`cluster`, hors de cet ADR) ; ce qui change, c'est qu'`atlas` a désormais un
point de publication explicite et automatisé, au lieu d'aucun.

### Tags : SHA immuable + version lisible, jamais `latest` en déploiement

Chaque image reçoit deux tags :

- **`sha-<court>`** — le SHA de commit court. **Immuable** : un tag SHA pointe à
  jamais vers le même contenu. C'est **ce qu'un manifeste de déploiement
  référence** (traçabilité exacte commit → image, conforme au « tag exact » de
  0033).
- **`<version>`** — la version sémver du `package.json` de l'unité (p. ex.
  `3.1.0`). **Lisible**, pour les humains et les montées de version ; peut être
  ré-publiée si la version est bumpée, donc **moins forte garantie** que le SHA.

On **n'utilise pas `latest`** comme référence de déploiement (règle 0033). Un
`latest` _indicatif_ pointant sur le dernier build de `main` peut exister pour la
DX (essai local rapide), mais **aucun manifeste ne doit le référencer**.

### PR : construire et tester, ne pas publier

Sur _pull request_, la CI **construit** chaque image touchée et lance un **smoke
test** (démarrage du conteneur + `HEALTHCHECK` vert), mais **ne pousse rien**.
La publication n'a lieu que depuis `main` (intégration faite, revue passée). Cela
ferme la dérive silencieuse — toute régression de fabrication casse la PR — sans
publier d'images non revues.

### CI adaptative : ne construire que ce qui change

Le job suit la logique de l'[ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/) :
une image n'est (re)construite que si **son `Dockerfile`, son code, ou une de ses
dépendances workspace** a changé — ou si un fichier transverse (lockfile,
`.nvmrc`, le workflow lui-même) bouge. On évite de reconstruire six images à
chaque PR documentaire.

## Statut

Accepted (2026-06-04).

## Conséquences

**Bénéfices.**

- Les images **existent vraiment** et sont **vérifiées en continu** : plus de
  `Dockerfile` qui pourrit sans que personne ne le sache (le cas `sillage` ne se
  reproduit pas).
- `atlas` a enfin un **point de publication explicite** des images, automatisé,
  sans infrastructure à provisionner ni secret à gérer (le `GITHUB_TOKEN`
  suffit).
- La traçabilité **commit → image** est exacte (tag SHA immuable), ce que le
  contrat 0033 demande aux manifestes.
- Le cluster peut **consommer ou mirrorer** depuis une source stable et publique
  au dépôt, au lieu de dépendre d'un build manuel.

**Prix à payer.**

- GHCR devient une **dépendance de publication** : un dépôt indisponible bloque
  la livraison d'images (mais pas le build/test, qui restent en CI).
- Les images publiques sur GHCR exposent la **surface applicative** (couches,
  dépendances) à qui peut lire le registry ; aucun secret n'y transite (les
  `PRIVATE_*` sont injectées au runtime, cf. 0033), mais la visibilité du paquet
  doit être gérée côté GitHub (org).
- Deux registres possibles (GHCR + éventuel mirror cluster) : une **cohérence à
  maintenir**, traitée côté `cluster`.

**Garde-fous.**

- **Jamais de secret dans une image** : les `PRIVATE_*` n'entrent pas dans le
  `builder` (elles resteraient dans l'historique des couches poussées) — règle
  déjà posée par l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/).
- **Pas de `latest` référencé en déploiement** : les manifestes citent un tag
  SHA ; `latest` reste au plus un confort de DX local.
- **Publication depuis `main` uniquement** : les PR construisent et testent mais
  ne poussent pas.
- **Le registry interne du cluster et son éventuel mirror** relèvent du dépôt
  `cluster` et de son [contrat d'interface](/atlas/decisions/0033-contrat-interface-cluster/) ;
  cet ADR ne décide que de la publication **côté application**.
