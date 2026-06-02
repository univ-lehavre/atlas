# 0034 — CI adaptative par chemin : court-circuit des jobs lourds, sans casser la branch protection

## Contexte

La CI ([ADR 0001](0001-devsecops-perimetre-repo-sine-die.md)) lance le **même
pipeline complet** sur **toute** _pull request_, quel que soit son contenu :
`Lint`, `Typecheck`, `Test`, `Build`, `Documentation`, `Audit`, plus les
contextes de sécurité (`Analyze`/CodeQL, `Scan for secrets`,
`Review dependencies`). Pour une PR qui ne touche **que de la documentation**
(un fichier Markdown, un ADR, un plan), c'est **disproportionné** : on paie un
build complet de tous les paquets, la suite de tests de toutes les apps et la
vérification de types — alors qu'aucune ligne de code exécutable n'a changé.

Le coût est double : le **temps** (plusieurs jobs de 3 à 10 min pour changer une
phrase) et la **fragilité** (un test occasionnellement instable peut faire
échouer une PR purement rédactionnelle, forçant un _re-run_ de toute la chaîne).
Ce frottement **ralentit le flux** : il décourage les petites PR de
documentation, qui sont pourtant celles qu'on veut encourager.

### Le piège : un check requis « skipped » bloque le merge

La solution naïve — mettre une condition `if:` au **niveau du job** pour qu'un
job lourd ne tourne pas sur une PR de documentation — **casse la branch
protection** ([ADR 0016](0016-branch-protection-main.md)). GitHub traite un job
requis dont la condition est fausse comme **`skipped`**, et un check requis
`skipped` **reste indéfiniment `Pending`** : la PR ne peut **jamais** être
mergée. Le filtrage natif par `paths:`/`paths-ignore:` au niveau du workflow a
le même effet (le workflow ne démarre pas, le contexte requis n'est jamais
rapporté). C'est un comportement documenté par GitHub, pas un bug.

Il faut donc un mécanisme qui **court-circuite le travail coûteux** tout en
**rapportant toujours** un check **vert** (`success`), jamais `skipped`.

## Décision

> **La CI s'adapte au contenu de la PR par un court-circuit au niveau des
> _steps_, pas des _jobs_.** Les jobs requis par la branch protection
> **s'exécutent toujours** — ils rapportent donc toujours leur contexte — mais
> leurs étapes coûteuses sont **gardées** par un drapeau calculé en tête de
> pipeline. Une PR sans code exécutable les saute et le job sort **`success`**.

### Détection des changements (job `changes`)

Un job léger en tête de pipeline calcule un drapeau booléen `code` :

- il liste les fichiers modifiés par la PR (`git diff` contre la base de fusion,
  sans dépendance à une action tierce — cohérent avec le pinning strict du
  dépôt) ;
- si **tous** les fichiers modifiés appartiennent à une **liste blanche
  documentaire** (`docs/**`, tout `*.md`, fichiers non exécutables comme
  `LICENSE`, `.editorconfig`, fixtures texte…), alors `code = false` ;
- **dès qu'un seul** fichier sort de cette liste (`.ts`, `.svelte`,
  `package.json`, `pnpm-lock.yaml`, `.github/**`, un script…), `code = true` et
  le pipeline complet s'exécute.

La règle est **conservatrice par défaut** : l'inconnu compte comme du code. On
ne risque donc jamais de sauter un test pour une vraie modification de code ; on
ne saute le travail lourd que lorsqu'on est **certain** que la PR est
documentaire.

### Court-circuit au niveau des steps

`Test`, `Typecheck` et `Build` **tournent toujours** (le check requis est
toujours rapporté), mais leurs étapes coûteuses (`install`, `test:coverage`,
`build`…) portent `if: needs.changes.outputs.code == 'true'`. Sur une PR
documentaire, ces étapes sont sautées et le job se termine **vert**.

Restent **toujours actifs intégralement**, car pertinents pour la
documentation :

- `Lint` (le formatage et le lint Markdown s'appliquent aux `.md`) ;
- `Documentation` (build VitePress — c'est précisément ce qu'une PR doc doit
  valider) ;
- `Audit` (il vérifie la fraîcheur de la carte des paquets, les liens, les
  pages orphelines — [ADR 0028](0028-documentation-verifiable.md)) ;
- `Scan for secrets` (un secret peut fuiter dans un exemple de documentation) ;
- `Analyze` (CodeQL) — **laissé intact**. En `build-mode: none` il est rapide,
  reste un filet de sécurité, et l'alléger demanderait de dupliquer la
  détection dans un second workflow (`codeql.yml`), ajoutant une surface où le
  piège du `skipped` pourrait frapper. Le gain principal est déjà capté par les
  trois jobs lourds de `ci.yml` ; on s'y tient.

## Statut

Accepted (2026-06-02). Étend [ADR 0001](0001-devsecops-perimetre-repo-sine-die.md)
(périmètre DevSecOps complet) en le rendant **proportionné au contenu**, et
compose avec [ADR 0016](0016-branch-protection-main.md) (branch protection) en
respectant sa contrainte : tous les contextes requis restent rapportés.

## Conséquences

**Bénéfices.** Une PR documentaire ne paie plus le build, les tests et la
vérification de types de tout le monorepo : elle valide ce qui la concerne
(lint, build de la doc, audit, secrets) en une fraction du temps. Le flux de
petites PR de documentation est **désengorgé**, et un test instable côté
applicatif ne peut plus faire échouer une PR purement rédactionnelle. La
couverture de sécurité et de qualité **reste entière** dès qu'une ligne de code
est touchée.

**Prix à payer.** Le pipeline gagne une indirection : un job `changes` en tête
et une condition sur les étapes lourdes. La **liste blanche documentaire** doit
être tenue : un nouveau type de fichier non exécutable (ex. une nouvelle
extension d'asset texte) qu'on voudrait traiter comme « doc » doit y être
ajouté explicitement — à défaut, il déclenche le pipeline complet (faux négatif
**sûr**, jamais l'inverse). Le drapeau est binaire (`code` / pas `code`) : on ne
distingue pas encore « seulement les tests » de « seulement le build ».

**Garde-fous.**

- **Court-circuit au niveau _step_, jamais au niveau _job_** : tout job requis
  par la branch protection doit **toujours s'exécuter et rapporter son
  contexte**. Introduire un `if:` de job (ou un `paths:`/`paths-ignore:` de
  workflow) sur un check requis le ferait passer `skipped` et **bloquerait tout
  merge** — c'est l'erreur que cet ADR existe pour empêcher.
- **Conservateur par défaut** : la liste blanche énumère le documentaire ; tout
  ce qui n'y figure pas est traité comme du code. On élargit la liste avec
  prudence, jamais au point d'y inclure un fichier exécutable.
- **La sécurité ne se court-circuite pas à la légère** : `Scan for secrets`
  reste plein ; `Audit` reste plein (il porte des contrôles documentaires) ;
  seuls `Test`/`Build`/`Typecheck`/`Analyze`, sans objet sans code, sont
  allégés.
- Si la branch protection évolue (nouveau contexte requis), il faut vérifier
  qu'il **rapporte toujours** sur une PR documentaire — sinon il bloque le
  merge.
