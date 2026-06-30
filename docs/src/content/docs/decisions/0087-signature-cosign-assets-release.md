---
title: "0087 — Signature cosign des artefacts de Release GitHub"
---

## Contexte

Atlas signe déjà **deux** maillons de sa chaîne de publication :

- **Images conteneur** (GHCR) : signature **cosign keyless** + provenance SLSA +
  SBOM, attachées au digest ([ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)).
- **Paquets npm** (registre) : **provenance OIDC** (attestation in-toto Sigstore),
  liée à l'identité du workflow ([ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)).

Reste un **troisième** maillon non signé : les **GitHub Releases**. Changesets
crée une Release **par paquet** (`createGithubReleases: true`), mais ce sont des
Releases **« notes-only »** — le changelog, **sans aucun asset attaché**
(`assets: []`). Un consommateur qui récupère un artefact **depuis la GitHub
Release** (et non depuis npm) n'a donc **rien à vérifier** : ni tarball, ni
signature, ni somme.

Le critère **`signed_releases`** d'OpenSSF Best Practices vise précisément ce
point : fournir, pour chaque release, un **artefact signé cryptographiquement et
vérifiable**. La provenance npm couvre le **registre** ; elle ne couvre **pas**
l'asset d'une GitHub Release. Combler ce maillon **sans redondance** : on ne
re-signe pas le paquet npm avec cosign (non idiomatique — npm se vérifie par
provenance, pas par cosign), on signe l'**asset attaché à la Release**.

## Décision

> **À chaque publication, le workflow `release.yml` attache à la GitHub Release de
> chaque paquet publié : son tarball, sa signature cosign keyless (`.sig` +
> certificat `.pem`) et sa somme `sha256`.** La signature est **keyless** (OIDC,
> aucune clé privée stockée), cohérente avec l'approche des images
> ([ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)).

### Mécanique

Après l'étape Changesets, une étape conditionnée à `outputs.published == 'true'`
itère sur `outputs.publishedPackages` (`[{name, version}]`). Pour chaque paquet :
`pnpm pack` produit le tarball, `cosign sign-blob` produit `.sig` + `.pem`,
`sha256sum` la somme, puis `gh release upload <name@version>` attache les quatre
fichiers à la Release que Changesets a déjà créée. Sur une exécution **sans
publication**, l'étape est un **no-op** (aucun jeton OIDC de signature consommé).

### Vérification

Un tiers vérifie un artefact **hors npm**, sans clé :

```sh
cosign verify-blob \
  --certificate <pkg>.pem --signature <pkg>.sig \
  --certificate-identity-regexp '^https://github.com/univ-lehavre/atlas/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  <pkg>.tgz
```

### Périmètre

Couvre les **paquets publiables** (npm) via leurs GitHub Releases. **Hors
périmètre** : les images conteneur (déjà signées, [ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)),
le registre npm (déjà couvert par la provenance, [ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/)),
et la **signature des tags git** (les tags Changesets sont légers ; les signer
relève d'un autre arbitrage, non retenu ici car la provenance + l'asset signé
couvrent déjà la vérifiabilité utile).

## Alternatives écartées

- **Signer les tarballs npm avec cosign en plus de la provenance.** Redondant et
  **non idiomatique** : l'écosystème npm vérifie un paquet par sa **provenance**
  (`npm audit signatures`), pas par cosign. Double signal, zéro gain. Rejeté.
- **Signer les tags git (gitsign).** Les tags Changesets sont **légers** (non
  annotés) ; les rendre signés demande de déporter la création de tag hors de
  Changesets — lourd, pour un bénéfice marginal vs l'asset signé. Rejeté ici (peut
  revenir si un besoin de vérification au niveau du tag émerge).
- **Clé cosign gérée (key-based).** Une clé privée à stocker en secret et à
  rotater — surface inutile quand l'**OIDC keyless** lie la signature à l'identité
  du workflow sans secret. Rejeté (cohérent avec [ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/)).

## Statut

Accepted (2026-06-30). L'étape de signature est ajoutée à `release.yml` ; elle
s'activera à la prochaine publication consommant un changeset.

## Conséquences

**Bénéfices.** Le **troisième** maillon de publication devient vérifiable : un
artefact récupéré depuis une GitHub Release porte sa signature keyless et sa
somme, vérifiables **sans clé ni compte npm**. Le critère `signed_releases`
(Best Practices) est satisfait par une preuve réelle, pas une case déclarative
([ADR 0086](/atlas/decisions/0086-posture-paliers-best-practices/)). Cohérence de
bout en bout : images **et** releases signées en keyless, registre couvert par la
provenance.

**Prix à payer.** Une étape de plus dans `release.yml` et une action externe à
garder épinglée (`cosign-installer`, suivie par Dependabot actions). Le temps de
release augmente légèrement (pack + sign + upload par paquet). En cas de release
multi-paquets, autant de jeux d'assets — volume maîtrisé (4 petits fichiers par
paquet).

**Garde-fous.**

- **Keyless only** : aucune clé privée stockée ; la signature lie l'identité du
  workflow via OIDC.
- **No-op sans publication** : l'étape ne consomme un jeton de signature que si
  Changesets a réellement publié — on ne signe jamais à vide.
- **Vérification documentée** : la commande `cosign verify-blob` est inscrite en
  commentaire du workflow et dans cet ADR (reproductible par un tiers).
- **Action épinglée par SHA** (principe d'épinglage du dépôt,
  [ADR 0084](/atlas/decisions/0084-pinning-images-base-par-digest/) pour la
  doctrine ; Dependabot maintient le SHA).
