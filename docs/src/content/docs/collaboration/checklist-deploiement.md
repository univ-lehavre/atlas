---
title: Avant de mettre une instance en service
---

Cette page s'adresse à qui **exploite** une instance Atlas (la déploie pour de vraies
personnes), pas à qui contribue au code. Elle ne décrit **pas** comment déployer —
l'infrastructure et le runbook de mise en service vivent dans le dépôt cluster, hors
de ce dépôt. Son seul rôle est de rendre visible le **gate RGPD** et de pointer vers
les décisions et prérequis déjà actés.

Le **gate RGPD** est le verrou qui bloque toute mise en production avec des données
personnelles réelles tant que le référent données (DPO) de l'établissement exploitant
n'a pas rendu son arbitrage. Tous les termes techniques renvoient au
[glossaire](/atlas/glossary/).

## Gate RGPD : à lire avant toute mise en service

Atlas profile des personnes nommées (il dérive un lien scoré entre chercheurs qui
n'existe nulle part à la source). C'est un **traitement de données à caractère
personnel**, acté par l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).

> **Le dépôt ne tranche pas le juridique : il fournit les leviers.** Cette page
> n'affirme aucune conformité RGPD. La base légale, l'information des personnes et le
> reste de l'arbitrage relèvent du responsable de traitement de **votre** instance.

### Points à faire trancher par le DPO

L'instance est **générique et multi-tenant** : chaque déploiement a **son propre
responsable de traitement** ([ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)).
Avant la première mise en service nominative, faites trancher par le référent données
de l'établissement exploitant les cinq points tracés dans le §« Demande d'arbitrage
tracée » de l'[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) (la
liste normative y vit ; ne pas la recopier ailleurs) :

1. **Base légale** — intérêt public (art. 6.1.e) et/ou intérêt légitime (art. 6.1.f,
   avec test de mise en balance).
2. **Responsable de traitement** — à nommer explicitement pour **cette** instance.
3. **Information des personnes** profilées et modalités du **droit d'opposition**
   (art. 21) et du **droit à l'effacement**.
4. **Valeur du SLA** de propagation d'une opposition (cf.
   [Ré-dérivabilité du mart et de l'index](/atlas/architecture/re-derivabilite-mart-index/), §5).
5. Nécessité éventuelle d'une **analyse d'impact (AIPD/DPIA)**.

Le partage « ce que le code fournit » vs « ce qui reste institutionnel » est cadré par
l'[ADR 0026](/atlas/decisions/0026-rgpd-perimetre/) et l'item de suivi sine die de
l'[ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/).

## Prérequis techniques déjà actés à vérifier

Ces leviers existent dans le dépôt. Avant d'exposer un mart ou un index nominatif,
vérifiez qu'ils sont **branchés et opérants** pour votre instance. Le détail vit dans
les pages liées — il n'est pas re-spécifié ici.

- [ ] **Registre d'opposition opérant** — l'opposition exprimée retire bien la
      personne du mart **et** de l'index, sans divergence avec le périmètre servi par
      `atlas-api` (une divergence est un défaut **bloquant**) :
      [Ré-dérivabilité du mart et de l'index](/atlas/architecture/re-derivabilite-mart-index/).
- [ ] **Ré-dérivabilité opérationnelle** — régénération de la partition, masquage à la
      lecture et purge de l'index pgvector sont en place :
      [Ré-dérivabilité du mart et de l'index](/atlas/architecture/re-derivabilite-mart-index/).
- [ ] **Authentification obligatoire** sur **toute** route nominative (aucun endpoint
      anonyme ne liste de chercheurs) :
      [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/).

> L'exposition réseau (ingress, TLS de bordure, HTTPS) est fournie par le **dépôt
> cluster** ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)) et ne
> relève donc pas de cette checklist : elle est cadrée côté infrastructure.

## Ouvert / fermé : ce que le gate autorise

| Situation                                             | État du gate                                         |
| ----------------------------------------------------- | ---------------------------------------------------- |
| Développement sur **données synthétiques / fixtures** | **Ouvert** — autorisé sans arbitrage.                |
| Production avec **données nominatives réelles**       | **Fermé** tant que l'arbitrage DPO n'est pas revenu. |

Aucune ingestion, collecte ou profilage de personnes réelles n'est permis avant la
levée du gate. Le développement se fait sur fixtures. Le déploiement effectif reste
une **action humaine** côté opérateurs d'infrastructure, subordonnée à cette levée.
