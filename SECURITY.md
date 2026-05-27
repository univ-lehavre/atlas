# Security Policy

> **Nature de ce document.** Cette politique décrit, sur la base du meilleur effort, la manière dont les vulnérabilités sont traitées dans le projet Atlas. Elle **ne constitue ni un contrat, ni une garantie, ni un engagement juridique opposable**. Le logiciel est diffusé sous licence MIT, sans garantie d'aucune sorte (cf. [LICENSE](LICENSE)). Les délais et procédures indiqués ci-dessous sont des objectifs indicatifs, pas des obligations contractuelles. Les obligations légales applicables par ailleurs (RGPD, conventions inter-établissements, marchés publics…) restent régies par leurs propres textes et prévalent en cas de conflit.

## Signaler une vulnérabilité

**Ne pas ouvrir d'issue publique** pour une faille de sécurité — cela exposerait la vulnérabilité avant qu'un correctif soit disponible.

### Canal de divulgation responsable

- **Email** : `redcap-support@univ-lehavre.fr` (chiffrement PGP disponible sur demande)
- **GitHub Private Vulnerability Reporting** : <https://github.com/univ-lehavre/atlas/security/advisories/new>

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

## Versions supportées

Atlas suit un modèle de release continue (changesets). Seules les versions publiées les plus récentes de chaque package npm `@univ-lehavre/atlas-*` sont supportées pour les correctifs de sécurité.

Les anciens packages renommés lors de la migration anti-marque sont **dépréciés** sur npm avec un pointer vers les nouveaux noms et ne recevront plus de mises à jour, y compris pour les vulnérabilités.

## Périmètre

**Concerné** : packages npm `@univ-lehavre/atlas-*`, apps déployées (amarre, ecrin, find-an-expert), services backend (`services/crf`), workflows GitHub Actions.

**Hors périmètre** : l'instance REDCap elle-même (`redcap.univ-lehavre.fr`, relève de la DSI ULHN) ; les dépendances tierces (signaler à leurs mainteneurs upstream).

## Pour aller plus loin

Atlas documente l'ensemble de ses garde-fous applicatifs et opérationnels sur le site de documentation :

- [Sécurité applicative](https://univ-lehavre.github.io/atlas/quality/security) — inventaire des secrets, classification des surfaces exposées, DAST, SBOM
- [Incident response](https://univ-lehavre.github.io/atlas/quality/incident-response) — runbook opérationnel (P0–P3, 5 phases, RGPD)

Pour vérifier qu'un package installé provient bien du workflow Atlas (provenance OIDC, SLSA Build L3) :

```bash
npm audit signatures
npm view @univ-lehavre/atlas-<name> --json | jq .dist.attestations
```

## Crédits

Les personnes ayant rapporté des vulnérabilités confirmées seront créditées dans le CHANGELOG du package concerné, sauf demande contraire.
