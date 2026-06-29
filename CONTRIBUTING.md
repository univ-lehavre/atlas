# Contribuer à Atlas

Atlas accueille les contributions — code, documentation, signalements de bug, suggestions UX. Tu n'as pas besoin d'être développeur pour contribuer utilement : ouvre simplement une [issue](https://github.com/univ-lehavre/atlas/issues) si tu repères quelque chose à améliorer.

> 🇬🇧 **In English.** This guide is written in French (the maintaining team's language), but **issues and pull requests written in English are welcome**. The conventions below (Conventional Commits, lowercase subject, closed scope list, merge commit) apply whatever language you write in.

## Un dépôt généraliste et ouvert

Atlas est un dépôt **généraliste** : tout ce qui y est produit — code, documentation, exemples, identifiants, et décisions d'architecture — reste **neutre vis-à-vis d'un domaine métier, d'une marque ou d'un établissement particuliers**, pour qu'un contributeur de n'importe quel horizon puisse le reprendre. Concrètement : pas de marque ni d'organisme dans un identifiant (la fonction générique, pas le produit), pas d'ancrage dans un secteur d'activité, anglais standard pour le code. Le _pourquoi_ et les règles détaillées sont dans l'[ADR 0035](https://univ-lehavre.github.io/atlas/decisions/0035-depot-generaliste-ouvert/).

## Pour les contributions code

Avant d'ouvrir une Pull Request, lis les pages dédiées du site de documentation :

- [Environnement de développement local](https://univ-lehavre.github.io/atlas/collaboration/environnement-local/) — Node, pnpm, dépendances et secrets
- [Workflow de contribution](https://univ-lehavre.github.io/atlas/collaboration/workflow/) — branche, commits, revue, merge
- [Style de code](https://univ-lehavre.github.io/atlas/quality/code-style/) — conventional commits, formatage, conventions de nommage
- [Hooks Git](https://univ-lehavre.github.io/atlas/quality/hooks/) — pre-commit / pre-push automatiques
- [Pipeline CI](https://univ-lehavre.github.io/atlas/quality/ci-pipeline/) — ce qui se passe quand tu pousses

## Sécurité

Pour signaler une **vulnérabilité**, n'ouvre pas d'issue publique. Suis la procédure de [SECURITY.md](SECURITY.md).

## Code de conduite

Atlas adopte le [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), dont le texte est repris dans [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). En contribuant, tu acceptes ses termes : respect mutuel, accueil des critiques constructives, pas de harcèlement ni de discrimination.

Signalement d'un comportement inacceptable : ouvrir un [GitHub Private Vulnerability Report](https://github.com/univ-lehavre/atlas/security/advisories/new) — le canal n'est pas exclusivement « sécurité technique », tout signalement confidentiel y est accepté. Tous les rapports sont traités confidentiellement.

## Accord de licence des contributions (CLA)

En contribuant à Atlas, tu confirmes que :

1. **Originalité** : la contribution est ton travail original, ou tu as la permission de la soumettre sous les mêmes termes.
2. **Licence** : tes contributions sont sous licence [MIT](LICENSE), comme le reste du projet — tu accordes donc à quiconque le droit de les utiliser, copier, modifier et redistribuer selon ces termes.
3. **Sans garantie** : les contributions sont fournies « telles quelles » (clause de la licence MIT).

> **Note sur les brevets.** La licence MIT ne comporte **pas** de clause de
> licence de brevet explicite (contrairement à l'Apache-2.0). En soumettant du
> code sous MIT, tu en autorises l'usage selon les termes de la licence, mais le
> projet n'exige aucune cession de brevet formelle. Si la couverture brevet
> devenait un enjeu (contributeurs détenant des brevets, adoption industrielle),
> le passage à l'Apache-2.0 serait à reconsidérer — ce choix relèverait d'un ADR.

Tu conserves le copyright sur tes contributions — Atlas ne le revendique pas. Aucun formulaire à remplir : ouvrir une PR vaut acceptation de ces termes (DCO-style via l'identité de l'auteur du commit).
