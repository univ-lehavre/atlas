# Security Policy

> **Nature de ce document.** Cette politique décrit, sur la base du meilleur
> effort, la manière dont les vulnérabilités sont traitées dans le projet
> Atlas. Elle **ne constitue ni un contrat, ni une garantie, ni un engagement
> juridique opposable**. Le logiciel est diffusé sous licence MIT, sans
> garantie d'aucune sorte (cf. [LICENSE](LICENSE)). Les délais et procédures
> indiqués ci-dessous sont des objectifs indicatifs, pas des obligations
> contractuelles. Les obligations légales applicables par ailleurs (RGPD,
> conventions inter-établissements, marchés publics…) restent régies par
> leurs propres textes et prévalent en cas de conflit.

## Supported Versions

Atlas suit un modèle de release continue (changesets). Seules les versions
publiées les plus récentes de chaque package npm `@univ-lehavre/atlas-*` sont
supportées pour les correctifs de sécurité.

Les anciens packages renommés lors de la migration anti-marque (cf. README)
sont **dépréciés** sur npm avec un pointer vers les nouveaux noms et ne
recevront plus de mises à jour, y compris pour les vulnérabilités.

## Reporting a Vulnerability

**Ne pas ouvrir d'issue publique** pour une faille de sécurité. Cela
exposerait la vulnérabilité avant qu'un correctif soit disponible.

### Canal de divulgation responsable

- **Email** : `redcap-support@univ-lehavre.fr` (chiffrement PGP disponible sur
  demande)
- **GitHub Private Vulnerability Reporting** : https://github.com/univ-lehavre/atlas/security/advisories/new

### Informations à inclure

- Description de la vulnérabilité
- Version affectée (package + numéro de version npm)
- Étapes de reproduction (PoC minimal si possible)
- Impact potentiel (lecture/écriture de données, escalade de privilèges, etc.)
- Votre nom et affiliation si vous souhaitez être crédité dans la correction

### Délais cibles (best effort)

| Étape                        | Délai cible                        |
| ---------------------------- | ---------------------------------- |
| Accusé de réception          | 72 heures                          |
| Évaluation initiale          | 7 jours                            |
| Correctif (sévérité haute)   | 30 jours                           |
| Correctif (sévérité moyenne) | 90 jours                           |
| Divulgation publique         | Après correctif déployé + 30 jours |

## Scope

### Périmètre concerné

- Tous les packages npm publiés sous `@univ-lehavre/atlas-*`
- Les apps déployées sur Appwrite Sites : amarre, ecrin, find-an-expert
- Les services backend : `services/crf`
- L'infrastructure CI/CD : GitHub Actions workflows
- Le sandbox `sandbox/crf-sandbox` pour les tests d'intégration REDCap

### Hors périmètre

- L'instance REDCap elle-même (`redcap.univ-lehavre.fr`) — relève de la DSI
  de l'Université Le Havre Normandie. Signaler les failles REDCap directement
  à Vanderbilt University ou à la DSI ULHN.
- Les dépendances tierces : signaler à leurs mainteneurs upstream. Atlas
  applique les correctifs via `pnpm.overrides` et `Dependabot`.

## Mesures de sécurité en place

- **Secret scanning** : `gitleaks` en pre-commit + scan GitHub natif
- **SCA** : `pnpm audit` en CI (high+), Dependabot configuré
- **SAST** : `CodeQL` (`.github/workflows/codeql.yml`) sur PR + push main + hebdomadaire
- **DAST** : `OWASP ZAP baseline` (`.github/workflows/zap-baseline.yml`)
  en `workflow_dispatch` (cf. [docs/security/dast.md](docs/security/dast.md))
- **Supply chain** : actions GitHub épinglées par SHA + `npm provenance`
  via OIDC sur tous les publish (npm + GitHub Packages) + **SBOM CycloneDX**
  généré à chaque push sur main (cf. [docs/security/sbom/](docs/security/sbom/README.md))
- **Branch protection** sur `main` : activée le 2026-05-19

## Vérifier l'origine d'un package atlas

Tous les packages `@univ-lehavre/atlas-*` publiés depuis le 2026-05-22
embarquent une **provenance statement** signée par OIDC GitHub Actions
(in-toto attestation conforme à [SLSA Build L3](https://slsa.dev/spec/v1.0/levels)).
Cette attestation lie un tarball publié à un commit Git, un workflow et
un runner GitHub vérifiables.

Pour vérifier qu'un package installé provient bien du workflow Atlas :

```bash
# Vérifie l'intégralité du lockfile (recommandé en CI)
npm audit signatures

# Inspecte la provenance d'un package précis
npm view @univ-lehavre/atlas-citation --json | jq .dist.attestations
```

Une absence de provenance ou une signature invalide indique un publish
hors workflow (hotfix manuel, account compromise, supply-chain attack) —
**refuser l'install et ouvrir un advisory** via les canaux ci-dessus.

## Crédits

Les chercheurs et chercheuses ayant rapporté des vulnérabilités confirmées
seront crédités dans le CHANGELOG du package concerné (sauf demande
contraire de leur part).
