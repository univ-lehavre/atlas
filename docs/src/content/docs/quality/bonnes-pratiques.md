---
title: Bonnes pratiques
---

Cette page est un **portail d'orientation** : elle rassemble, par thème, les
**conventions d'ingénierie** du dépôt et **renvoie** vers la page qui les décrit et
l'ADR (_Architecture Decision Record_, fiche de décision d'architecture) qui les
fonde. Conformément à
[ADR 0076](/atlas/decisions/0076-portails-orientation-accueil-par-intention/), elle
**pointe** vers la source et **ne recopie jamais** une règle ou un chiffre : la
convention évolue, la page suit le lien.

À distinguer de [Normes et pratiques appliquées](/atlas/quality/normes/) : cette
page-ci **oriente** (« par où entrer, quelle page pour quelle convention ») ; la page
_Normes_ dresse le **bilan vérifiable** de ce qui est réellement appliqué, discipline
par discipline. Le portail **renvoie** au bilan, il ne le duplique pas.

## Style de code et typage

Le code est en TypeScript **strict** et passe un lint sévère ; chaque règle de style
est justifiée (pourquoi, à quel coût). →
[Style de code](/atlas/quality/code-style/) +
[ADR 0020](/atlas/decisions/0020-svelte-eslint-strict/).

## Programmation fonctionnelle (Effect)

Les briques partagées reposent sur **Effect** : erreurs et effets explicites et
typés, un runtime central pour les composer. →
[Style de code](/atlas/quality/code-style/) +
[ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/) +
[ADR 0045](/atlas/decisions/0045-runtime-central-effect/).

## Hooks Git

Les contrôles locaux (format, lint, types, secrets) s'exécutent aux hooks Git et **ne
sont jamais contournés**. →
[Hooks Git](/atlas/quality/hooks/) +
[ADR 0015](/atlas/decisions/0015-hooks-git-lefthook-jamais-bypass/).

## Commits et branches

Commits conventionnels à scopes restreints ; `main` protégée ; stratégie de merge
commit. →
[ADR 0014](/atlas/decisions/0014-conventional-commits-scopes-restreints/) +
[ADR 0016](/atlas/decisions/0016-branch-protection-main/) +
[ADR 0053](/atlas/decisions/0053-strategie-merge-commit-main/).

## Tests

Une pyramide de tests à plusieurs niveaux, une matrice de couverture qui **nomme les
trous connus**, et une convention de test pour le code Effect. →
[Tests](/atlas/quality/tests/) +
[Matrice de couverture E2E](/atlas/quality/matrice-e2e/) +
[ADR 0049](/atlas/decisions/0049-convention-test-effect/).

## Documentation

Une charte rédactionnelle (définir un terme, justifier un choix, une page un sujet),
une exigence de **vérifiabilité** (la doc ne ment pas), et une typologie d'intention
(Diátaxis). →
[Politique de documentation](/atlas/quality/documentation/) +
[ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/) +
[ADR 0028](/atlas/decisions/0028-documentation-verifiable/) +
[ADR 0074](/atlas/decisions/0074-diataxis-typologie-documentation/).

## Sécurité (DevSecOps)

La sécurité couvre le dépôt entier ; analyses statiques, détection de secrets, revue
de dépendances, SLA de remédiation chiffrés. →
[Sécurité](/atlas/quality/security/) +
[Pipeline CI](/atlas/quality/ci-pipeline/) +
[ADR 0001](/atlas/decisions/0001-devsecops-perimetre-repo-sine-die/) +
[ADR 0018](/atlas/decisions/0018-sla-remediation-findings/) +
[ADR 0027](/atlas/decisions/0027-security-champion/).

## Accessibilité

Le niveau d'accessibilité visé est **épinglé dans les tests** (axe-core), pas laissé
au défaut d'un outil. →
[Accessibilité](/atlas/quality/accessibilite/) +
[ADR 0038](/atlas/decisions/0038-epingler-niveau-wcag-tests-a11y/).

## Releases et dépendances

Publication par OIDC, nommage neutre des paquets, plages de versions maîtrisées sur
les paquets publiables. →
[Releases](/atlas/collaboration/releases/) +
[ADR 0017](/atlas/decisions/0017-releases-npm-oidc-deux-registres/) +
[ADR 0022](/atlas/decisions/0022-naming-convention/) +
[ADR 0024](/atlas/decisions/0024-ranges-deps-publiables-tilde/).

## Le bilan d'ensemble

Pour ce qui est **réellement appliqué** aujourd'hui, discipline par discipline et
écarts compris, voir [Normes et pratiques appliquées](/atlas/quality/normes/).
