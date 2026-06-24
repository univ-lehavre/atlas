---
title: Preuves
---

Cette page est une **vitrine d'orientation** : elle rassemble les forces
**réellement câblées** du dépôt et, pour chacune, **renvoie à la preuve la plus
dure disponible** — l'ADR (_Architecture Decision Record_, fiche de décision
d'architecture) qui la décide, le test qui la vérifie, le runbook qui l'opère.
Conformément à [ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/),
elle **pointe** vers la trace brute et **ne recopie jamais** un chiffre, un seuil
ou un extrait : la preuve évolue, la page suit le lien, rien à re-synchroniser.

## Forces établies

### Accessibilité WCAG AA mécanisée

Le niveau d'accessibilité visé (_WCAG_ — _Web Content Accessibility Guidelines_,
référentiel d'accessibilité du web ; **AA** = le palier attendu par le RGAA) est
**épinglé dans les tests** automatisés (_axe-core_), pas laissé au défaut d'un
outil. → [ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/) +
[page Accessibilité](/atlas/quality/accessibilite/).

### SLA de remédiation chiffrés

Les failles sont classées par sévérité, chacune avec un **délai cible de
fermeture** chiffré (_SLA_ — _Service Level Agreement_, engagement de niveau de
service). → [ADR 0018](/atlas/decisions/0018-sla-remediation-findings/) +
[page Sécurité](/atlas/quality/security/).

### Runbook d'incident opérationnel

Une procédure concrète de réponse à incident de sécurité, avec grille de
sévérité et étapes à suivre. →
[runbook Incident response](/atlas/quality/incident-response/).

### RGPD applicatif câblé

Le périmètre RGPD est tracé et un **droit d'opposition** au profilage est
implémenté au grain le plus fin. → [ADR 0026](/atlas/decisions/0026-rgpd-perimetre/)

- [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).

### Surveillance de modèle et porte de sécurité

Suivi de dérive (_drift_) et **porte de sécurité** sur le modèle d'_uplift_ :
un modèle qui perd son pouvoir prédictif **arrête** le pipeline plutôt que de
produire des recommandations dégradées. →
[ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/) +
[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) +
[ADR 0068](/atlas/decisions/0068-suivi-derive-modele-uplift/).

### Déterminisme documentaire à l'octet

Ce qui est dérivable du code est **généré, commité et comparé octet par octet en
CI** (_Continuous Integration_, vérifications automatiques à chaque modification) ;
ce qui ne l'est pas est historisé en _append-only_, sans jamais mentir. →
[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) +
[ADR 0032](/atlas/decisions/0032-kpi-determinisme-vs-snapshot/).

## Ce que nous n'avons pas encore

Par honnêteté ([ADR 0012](/atlas/decisions/0012-neutralisation-framing-institutionnel/)),
voici les forces **pas encore acquises**, chacune avec son critère de clôture :

- **Couverture de tests sous badge dynamique** : mesurée en CI mais non publiée
  sous badge tant qu'un outil **dynamique** ne la recalcule pas — afficher un
  chiffre figé serait un mensonge. Devient un badge quand l'outil tourne.
- **Note automatisée de bonnes pratiques de sécurité** (_OpenSSF Scorecard_) :
  non branchée. Devient un badge quand le workflow `scorecard.yml` tournera
  ([ADR 0070](/atlas/decisions/0070-page-preuves-vitrine-doctrine-badges/)).
- **Scan, signature et provenance des images conteneur** : doctrine actée mais
  câblage en cours. → [ADR 0069](/atlas/decisions/0069-signature-scan-provenance-images-ghcr/).
