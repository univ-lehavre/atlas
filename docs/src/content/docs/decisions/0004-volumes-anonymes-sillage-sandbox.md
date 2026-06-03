---
title: "0004 — Volumes anonymes pour `sandbox/sillage-sandbox/`"
---

## Contexte

Le banc d'essai [`sandbox/sillage-sandbox/`](https://github.com/univ-lehavre/atlas/tree/main/sandbox/sillage-sandbox)
lance une pile Appwrite + MongoDB locale via `docker compose` pour
expérimenter sans contaminer la stack de développement courante.

Avec des **volumes nommés**, deux ennuis sont apparus :

1. **Bug Appwrite après `down`/`up`** : la base MongoDB du conteneur
   conservait un état partiel incompatible avec la version d'Appwrite
   recalée par `up`, donnant des erreurs opaques de migration.
2. **Pas d'isolation entre runs** : un test laissait des données
   persistantes qui faussaient le suivant.

L'alternative — scripter un `volume rm` avant chaque `up` — est
fragile (on oublie, ou on l'exécute trop tard) et trompeuse (le
développeur croit avoir nettoyé).

## Décision

`sandbox/sillage-sandbox/docker-compose.yml` utilise des **volumes
anonymes** pour MongoDB. Chaque `pnpm start` (qui enchaîne `down` puis
`up`) repart d'un état vide. Le coût est un cold-bootstrap d'environ
30 à 60 secondes (création des schémas Appwrite + seed initial) à
chaque démarrage.

## Statut

Accepted (2026-05-28, PR #215).

## Conséquences

**Bénéfices.** Aucun état rémanent ne pollue les expériences. Le bug
Appwrite après `down`/`up` ne peut plus se reproduire. Le banc d'essai
est genuinement reproductible : deux développeurs sur deux machines
voient exactement le même point de départ.

**Prix à payer.** 30 à 60 secondes de bootstrap à chaque `pnpm start`.
Sur un banc d'essai exploratoire, c'est acceptable ; ça ne le serait
pas pour une stack de développement quotidienne (qui utilise des
volumes nommés ailleurs, et c'est volontaire).

**Garde-fous.**

- La règle « volumes anonymes » est documentée dans le README de
  `sandbox/sillage-sandbox/` pour éviter qu'un contributeur ne la
  change sans en mesurer l'effet.
- Si l'expérimentation a besoin de conserver un jeu de données entre
  runs, il doit être généré via un script seed reproductible, pas via
  un volume persistant.
