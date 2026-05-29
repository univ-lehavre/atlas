# 0013 — Documentation pour public non-expert, en français

## Contexte

La documentation du monorepo s'adresse à un éventail de profils :
développeurs expérimentés, contributeurs occasionnels, étudiants en
stage, agents administratifs qui doivent comprendre les surfaces
exposées. Deux questions transverses se posent :

- **Langue** — anglais (standard de l'industrie logiciel) ou français
  (langue de travail effective du projet et de ses contributeurs
  principaux) ?
- **Niveau d'expertise présumé** — peut-on utiliser librement des
  termes comme « monorepo », « hydratation », « BaaS », « OIDC »,
  « CSP » sans définition, ou doit-on les contextualiser ?

Le coût de défaut « anglais + jargon non défini » se paie chaque fois
qu'un contributeur nouveau doit décoder avant de pouvoir contribuer,
et chaque fois qu'un agent administratif renonce à lire une page qui
le concerne.

## Décision

- **Langue** : la documentation du monorepo est en **français** (`lang:
fr-FR` dans la config VitePress, README et docs en français).
- **Public cible** : la documentation est rédigée pour un **public
  non-expert**. Tout terme technique non trivial est :
  - soit défini sur place lors de sa première occurrence dans la page ;
  - soit pointé vers [`docs/glossary.md`](../glossary.md) qui regroupe
    les définitions transverses.

Les API et le code restent en anglais (conventions Web, identifiants,
commentaires de code) : la décision porte sur la documentation
narrative, pas sur le code.

## Statut

Accepted (2026-05, PRs #208, #211).

## Conséquences

**Bénéfices.** La documentation reste accessible au plus grand
nombre. Les contributeurs externes francophones (LLM ou humains) lisent
sans friction. Le glossaire centralise un effort de définition qui,
sinon, serait dispersé.

**Prix à payer.** Une partie de l'audience internationale potentielle
est exclue. Les outils de génération automatique (TypeDoc, OpenAPI)
restent en anglais, créant une dissonance partielle sur les pages
mixtes. Maintenir le glossaire demande un effort continu (toute nouvelle
abréviation doit y être ajoutée).

**Garde-fous.**

- Les revues de documentation incluent un check « est-ce qu'un
  nouveau contributeur sans contexte comprendrait cette page ? ».
- Toute introduction d'un nouveau terme technique demande soit une
  définition inline, soit une entrée glossaire.
- Voir aussi [ADR 0012](0012-neutralisation-framing-institutionnel.md)
  sur la neutralisation du framing.
