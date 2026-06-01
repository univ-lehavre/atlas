# 0001 — DevSecOps : périmètre repo complet, périphérie reportée sine die

## Contexte

Le chantier DevSecOps a été planifié sous forme de phases (1.x à 8.x) couvrant
SAST, dépendances, secrets, signatures, scans dynamiques (DAST), durcissement
des en-têtes et politiques de sortie. Voir [docs/quality/security.md](../quality/security.md).

Les phases **côté dépôt** (linting strict Svelte, Semgrep, CodeQL, audit
dépendances, audit licences, structure workspace, signatures OIDC sur les
releases, hooks Git, discipline `PUBLIC_*` / privé, tests sécurité 401 et
anti-XSS sur les endpoints) sont terminées et vérifiées en CI à chaque PR.

Les phases restantes — typiquement le tightening CSP au-delà du `unsafe-inline`,
la migration du rate-limit `in-memory` vers un store partagé (Redis/Upstash),
le DAST contre un environnement de preview, l'audit SBOM signé, le déploiement
d'en-têtes COOP/COEP, le canari sur la branche release, et les politiques de
sortie réseau — supposent toutes un **acteur ou une infrastructure externe**
au dépôt : équipe ops Appwrite, environnement de preview hébergé, registre
SBOM, ou décision projet sur un budget infra.

Aucun de ces acteurs n'est mobilisable à court terme. Tenir ces items dans
la file « En cours / à faire » donne une fausse impression que le chantier
est inachevé alors que la partie sous contrôle du dépôt l'est.

## Décision

Le chantier DevSecOps **côté dépôt** est considéré **complet**. Les neuf
items dépendant d'une coordination ou d'une décision externe sont
**reportés sine die** et ne figurent plus dans la liste des chantiers
actifs. Chacun est documenté ci-dessous avec son **bloquant** (l'acteur
ou la décision attendue) et son **débloque par** (le signal concret qui
justifierait d'ouvrir le chantier).

| Phase | Item                                                                         | Bloquant                                                     | Débloque par                                                            |
| ----- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 5.1   | Enrichir la mention RGPD / données REDCap dans `SECURITY.md`                 | Décision projet sur le périmètre RGPD à documenter           | Demande conformité, audit RGPD (cf. [ADR 0026](0026-rgpd-perimetre.md)) |
| 5.2   | CODEOWNERS — nominer un second mainteneur (bus-factor = 1)                   | Décision projet sur l'équipe étendue                         | Arrivée d'un second contributeur durable                                |
| 5.3   | Branch protection tightening (signatures commits, codeowners review, admins) | Configuration GPG/SSH côté contributeurs + second mainteneur | Levée de 5.2 + configuration GPG distribuée                             |
| 6.1   | Environnements Appwrite Sites (preview par PR ou `staging`)                  | Opérateurs infra Appwrite                                    | Revue de la chaîne de déploiement Appwrite Sites                        |
| 6.3   | Validation externe des headers (securityheaders.com, Mozilla Observatory)    | Déploiement stable avec URLs publiques figées (6.1)          | Levée de 6.1                                                            |
| 7.1   | Nightly ZAP (cible prod vs sandbox vs PR previews à arbitrer)                | Décision sur la cible (6.1) + budget CI                      | Levée de 6.1                                                            |
| 7.3   | Revue trimestrielle (CodeQL, déps, headers, logs, secrets)                   | Rappel calendrier + second mainteneur (5.2) pour la charge   | Levée de 5.2 ou décision de tenir la revue en solo                      |
| 8.1   | Alerting Appwrite (5xx / latence / auth-fail)                                | Opérateurs infra Appwrite                                    | Prise de contact ops Appwrite                                           |
| 8.3   | Sauvegarde Appwrite (politique fréquence / rétention / géo, RPO/RTO)         | Opérateurs infra Appwrite                                    | Prise de contact ops Appwrite                                           |

Deux items « à arbitrer » liés ont leur propre ADR : le périmètre RGPD
([ADR 0026](0026-rgpd-perimetre.md)) et le rôle de security champion pour
le triage CodeQL ([ADR 0027](0027-security-champion.md)).

## Statut

Accepted (2026-05-29). Révisé 2026-06-01 : le tableau de suivi des items
sine die est désormais porté par cet ADR (et non plus par `TODO.md`,
supprimé en fin de plan de résorption — cf. [ADR 0025](0025-documentation-multi-niveaux.md)).

## Conséquences

**Bénéfices.** La file de chantiers active reflète ce qui est réellement
actionnable sans coordination externe. Les contributeurs ne se perdent
plus à essayer d'attaquer des items bloqués par des dépendances qu'ils
ne peuvent pas lever seuls. La posture du dépôt vis-à-vis des audits
externes est claire : « le périmètre repo est verrouillé, la périphérie
attend un signal ».

**Prix à payer.** Le terme « sine die » est explicite : aucun engagement
calendaire n'est pris. Les items peuvent rester en l'état longtemps. Le
risque est qu'un item devienne pertinent (par exemple, le rate-limit
partagé devient bloquant au premier déploiement multi-instance) sans que
le signal ne soit identifié à temps.

**Garde-fous.**

- Chaque item reporté doit avoir un « débloque par » suffisamment
  concret pour qu'un événement de la vie du projet déclenche la
  réouverture (incident sécurité, scale-out, audit externe).
- Toute découverte d'un nouvel item DevSecOps côté repo (régression,
  nouveau pattern à couvrir) ouvre une **issue GitHub** (label
  `tech-debt` ou `enhancement`), pas un report sine die.
- Cette ADR est révisée si un audit externe (pentest, certification)
  impose la reprise d'un ou plusieurs items.
