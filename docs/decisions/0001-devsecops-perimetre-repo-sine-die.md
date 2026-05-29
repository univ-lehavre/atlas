# 0001 — DevSecOps : périmètre repo complet, périphérie reportée sine die

## Contexte

Le chantier DevSecOps a été planifié sous forme de phases (1.x à 8.x) couvrant
SAST, dépendances, secrets, signatures, scans dynamiques (DAST), durcissement
des en-têtes et politiques de sortie. Voir [docs/quality/security.md](../quality/security.md)
et l'historique du chantier dans [`TODO.md`](https://github.com/univ-lehavre/atlas/blob/main/TODO.md).

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

Le chantier DevSecOps **côté dépôt** est considéré **complet**. Les items
dépendant d'une coordination ou d'une décision externe (Phases 5.1, 5.2,
5.3-tightening, 6.1, 6.3, 7.1, 7.3, 8.1, 8.3 — voir TODO.md) sont
**reportés sine die** et ne figurent plus dans la liste des chantiers
actifs.

Chaque item reporté reste documenté avec :

- **Bloquant** : l'acteur ou la décision attendue (équipe ops, budget
  infra, décision projet).
- **Débloque par** : un signal concret qui justifierait d'ouvrir le
  chantier (incident, audit externe, scale-out, demande métier).

Le suivi opérationnel des items sine die vit dans [`TODO.md`](https://github.com/univ-lehavre/atlas/blob/main/TODO.md),
section dédiée — pas dans cet ADR, qui ne porte que la décision de cadrage.

## Statut

Accepted (2026-05-29).

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
  nouveau pattern à couvrir) ouvre un chantier normal dans `TODO.md`,
  pas un report sine die.
- Cette ADR est révisée si un audit externe (pentest, certification)
  impose la reprise d'un ou plusieurs items.
