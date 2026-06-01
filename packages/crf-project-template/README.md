# @univ-lehavre/atlas-crf-project-template

Trame déclarative et typée d'un projet CRF, construite avec Effect Schema.

## About

Ce paquet décrit la **structure-type** d'un projet CRF — ses instruments
(formulaires), les champs portés par chaque instrument, et les métadonnées
projet — sous la forme d'une seule valeur `Schema` Effect. Parce que la
description est un `Schema`, elle est à la fois un type TypeScript statique et
un validateur / (dé)sérialiseur à l'exécution. La trame est donc réutilisable
pour scaffolder de nouveaux projets CRF.

Les règles d'identifiants (noms d'instruments et de champs) sont alignées sur
`@univ-lehavre/atlas-crf-core` : minuscules, chiffres et tirets bas, commençant
par une lettre.

## Installation

```bash
pnpm add @univ-lehavre/atlas-crf-project-template effect
```

## Modèle

- **`ProjectTemplate`** — la trame complète : `metadata` + liste non vide
  d'`instruments`.
- **`TemplateMetadata`** — `name`, `version`, `description` optionnelle.
- **`TemplateInstrument`** — un formulaire : `name`, `label`, liste non vide de
  `fields`.
- **`TemplateField`** — un champ : `name`, `label`, `type`, `required` (défaut
  `false`), `options` (pour les champs `choice`).
- **`FieldType`** — `text | number | date | datetime | choice | boolean`.

## API

| Export                | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `ProjectTemplate`, …  | Les `Schema` Effect décrivant la trame                        |
| `validateTemplate`    | Valide une valeur inconnue → `Either<ProjectTemplate, …>`     |
| `isValidTemplate`     | Type guard structurel                                         |
| `encodeTemplate`      | Encode une trame vers sa représentation JSON-ready            |
| `serializeTemplate`   | Sérialise vers une chaîne JSON (option `pretty`)              |
| `deserializeTemplate` | Parse + valide une chaîne JSON → `Either<ProjectTemplate, …>` |
| `defaultTemplate`     | Une trame minimale et valide pour démarrer                    |

## Usage

```typescript
import {
  defaultTemplate,
  serializeTemplate,
  deserializeTemplate,
  validateTemplate,
  type ProjectTemplate,
} from '@univ-lehavre/atlas-crf-project-template';
import { Either } from 'effect';

// 1. Partir d'une trame par défaut, ou en écrire une à la main.
const template = defaultTemplate();

// 2. Sérialiser (par ex. pour la persister).
const json = serializeTemplate(template, { pretty: true });

// 3. Relire et valider une trame quelconque.
if (Either.isRight(json)) {
  const parsed = deserializeTemplate(json.right);
  if (Either.isRight(parsed)) {
    const project: ProjectTemplate = parsed.right;
    // …scaffolder à partir de `project`.
  }
}

// 4. Valider une valeur arbitraire (chargée d'ailleurs).
const result = validateTemplate(JSON.parse(someInput));
```

Toutes les fonctions faillibles retournent `Either` (jamais d'exception levée),
ce qui garde le paquet sans effet de bord et composable.

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-crf-project-template build      # Build (tsup)
pnpm -F @univ-lehavre/atlas-crf-project-template test       # Tests
pnpm -F @univ-lehavre/atlas-crf-project-template typecheck  # Type checking
pnpm -F @univ-lehavre/atlas-crf-project-template lint       # ESLint
```

## Organization

This package is part of **Atlas**, a set of tools developed by **Le Havre
Normandie University** to facilitate research and collaboration between
researchers.

## License

MIT
