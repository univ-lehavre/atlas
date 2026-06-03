---
title: "0035 — Dépôt généraliste ouvert : neutralité de domaine pour la contribution"
---

## Contexte

Atlas est un **dépôt de code ouvert** (public, licence MIT) dont la vocation est
d'**attirer le plus grand nombre de contributeurs**. Plusieurs ADR servent déjà
cette vocation par fragments : [0012](0012-neutralisation-framing-institutionnel)
neutralise le framing institutionnel, [0013](0013-documentation-public-non-expert-fr)
vise un public non-expert, [0022](0022-naming-convention) bannit les marques
des identifiants, [0031](0031-outil-generique-open-source) acte l'outil
générique et multi-tenant.

Il manquait la **règle-chapeau** qui les fédère et s'applique à _tout_ ce qui est
produit dans le dépôt : un principe simple, opposable à n'importe quelle
contribution, qui dise **pourquoi** ces contraintes existent et **jusqu'où** elles
portent. Sans elle, chaque ADR traite un symptôme (une marque ici, un framing là)
sans nommer la cause commune — et un contributeur ne sait pas, en une phrase, ce
qu'on attend de la **neutralité** de son apport.

Le risque concret, observé en pratique : du vocabulaire ancrant le dépôt dans un
**domaine métier particulier** (par exemple « clinique » associé à un outil de
formulaires) ou dans un **établissement** se glisse dans le code, les
descriptions, les exemples ou les ADR — réduisant la réutilisabilité perçue et
décourageant les contributeurs d'autres domaines.

## Décision

> **Atlas est un dépôt de code généraliste et ouvert. Tout ce qui y est produit
> — code, documentation, exemples, identifiants, et ADR — reste neutre vis-à-vis
> d'un domaine métier, d'une marque et d'un établissement particuliers, afin
> qu'un contributeur de n'importe quel horizon puisse le reprendre.** La visée
> généraliste prime : on n'ancre jamais le dépôt dans un cas d'usage unique.

Cette règle **chapeaute** [0012](0012-neutralisation-framing-institutionnel),
[0013](0013-documentation-public-non-expert-fr),
[0022](0022-naming-convention) et [0031](0031-outil-generique-open-source) :
elle en est le principe directeur, eux en sont les applications spécifiques.

### Règles applicables

1. **Pas de marque ni d'organisme dans un identifiant.** Aucun nom de marque
   (REDCap, OpenAlex…) ni d'établissement dans un **identifiant** (paquet,
   namespace, variable, clé) : le nom décrit la **fonction générique**
   (`citation-fetch`, `crf-client`), pas le produit qui l'incarne
   (`openalex-fetch`). Les valeurs propres à une instance (établissement, hôte,
   périmètre, branding) vivent dans la **configuration**, pas dans le code.
   _(Prolonge [0022](0022-naming-convention) et
   [0031](0031-outil-generique-open-source).)_

   **Nuance : nommer une marque qu'on intègre réellement est légitime.** Quand un
   composant **est** un client, une intégration ou un parseur d'un service
   nommé, le citer dans sa **description**, sa **documentation** ou un **chemin
   technique** est factuel et utile au contributeur — « client de l'API OpenAlex »,
   spec `redcap-14.5.10.yaml`, bin `crf-redcap`. Ce qu'on évite, c'est qu'une
   marque **qualifie le dépôt entier** ou un outil générique (la description
   racine n'est pas « monorepo REDCap » mais « monorepo généraliste »), pas qu'on
   décrive honnêtement ce qu'un module précis fait.

2. **Neutralité de domaine.** Le code et la documentation ne présupposent pas un
   domaine métier particulier. Un sigle hérité d'un domaine est **réinterprété de
   façon générique** (p. ex. CRF = _Complex Reporting Form_, formulaire complexe,
   et non _Case Report Form_ clinique) ; les exemples et fixtures évitent le
   vocabulaire qui enfermerait dans un secteur.

3. **Anglais standard et accessible pour le code.** Les identifiants, les
   commentaires et la JSDoc sont en **anglais neutre et standard** — registre
   d'ouverture internationale, sans jargon local non expliqué. _(La documentation
   rédigée reste en français pour son public, cf.
   [0013](0013-documentation-public-non-expert-fr) ; l'anglais concerne le
   **code** et sa référence dérivée, cf.
   [0028](0028-documentation-verifiable).)_

4. **Les ADR ne décident que pour le dépôt de code.** Un ADR acte des choix
   **techniques internes au dépôt** (architecture, conventions, outillage). Il ne
   tranche **jamais** une décision propre à un organisme déployeur — base légale,
   arbitrage DPO, choix de déploiement, politique d'établissement. Ces décisions
   relèvent de chaque exploitant ; l'ADR peut **décrire le mécanisme générique**
   qui les rend possibles, jamais les **valeurs** d'une instance. _(Cohérent avec
   [0030](0030-rgpd-profilage-collaborations) et
   [0031](0031-outil-generique-open-source).)_

## Statut

Accepted (2026-06-03). Fédère [0012](0012-neutralisation-framing-institutionnel),
[0013](0013-documentation-public-non-expert-fr),
[0022](0022-naming-convention) et [0031](0031-outil-generique-open-source)
sans les remplacer ; elle en est le principe directeur commun.

## Conséquences

**Bénéfices.** Le dépôt présente une **surface neutre et réutilisable** : un
contributeur de n'importe quel domaine y reconnaît un outil générique, pas le
projet interne d'une organisation. La règle est **opposable en revue** — « ce nom
ancre le dépôt dans un domaine » devient un motif de demande de changement clair,
appuyé sur une décision tracée. Les ADR restent **portables** d'une instance à
l'autre, puisqu'ils ne figent aucune valeur d'organisme.

**Prix à payer.** La neutralité a un **coût rédactionnel** : il faut parfois
réinterpréter un sigle hérité, choisir un exemple générique plutôt que parlant
pour un domaine, ou renvoyer une décision à la configuration plutôt que de la
coder. Certains termes neutres sont moins immédiatement évocateurs qu'un
vocabulaire spécialisé.

**Garde-fous.**

- **En revue de PR**, tout identifiant, exemple ou phrase qui ancre le dépôt dans
  une marque, un domaine ou un établissement est signalé et corrigé avant merge.
- Le **nommage** suit [0022](0022-naming-convention) ; le **framing**,
  [0012](0012-neutralisation-framing-institutionnel). Cet ADR en est la
  justification commune à citer.
- Un **ADR qui tranche une décision d'organisme** (base légale, DPO,
  déploiement) sort de son périmètre : on le recadre sur le **mécanisme
  générique**, en laissant la **valeur** à l'exploitant.
- Le pointeur dans [`CONTRIBUTING.md`](https://github.com/univ-lehavre/atlas/blob/main/CONTRIBUTING.md) rend la règle
  visible dès l'entrée d'un nouveau contributeur.
