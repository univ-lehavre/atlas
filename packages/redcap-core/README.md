# @univ-lehavre/atlas-redcap-core

Logique métier REDCap pure et fonctionnelle avec Effect.

## À propos

Ce package fournit les types, utilitaires et fonctions pures partagés pour l'intégration REDCap. Il est conçu pour être importé par d'autres packages nécessitant des fonctionnalités REDCap.

## Fonctionnalités

- **Branded types** : Identifiants typés (RecordId, ProjectId, etc.)
- **Gestion d'erreurs** : Types d'erreurs REDCap avec Effect
- **Détection de version** : Parsing et comparaison de versions REDCap
- **Types de contenu** : Définitions des types de contenu API REDCap
- **Validation** : Utilitaires de validation des entrées
- **Adaptateurs** : Adaptateurs API spécifiques aux versions

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-core effect
```

## Usage

```typescript
import { RecordId, ProjectId } from '@univ-lehavre/atlas-redcap-core/brands';
import { RedcapError } from '@univ-lehavre/atlas-redcap-core/errors';
import { parseVersion } from '@univ-lehavre/atlas-redcap-core/version';
```

## Exports

| Export | Description |
|--------|-------------|
| `/brands` | Branded types pour identifiants typés |
| `/errors` | Types d'erreurs REDCap |
| `/version` | Parsing et comparaison de versions |
| `/content-types` | Définitions des types de contenu API |
| `/params` | Types de paramètres de requête |
| `/adapters` | Adaptateurs spécifiques aux versions |
| `/validation` | Utilitaires de validation |
| `/utils` | Utilitaires généraux |
| `/types` | Définitions de types partagés |

## Scripts

```bash
pnpm -F @univ-lehavre/atlas-redcap-core dev        # Développement
pnpm -F @univ-lehavre/atlas-redcap-core build      # Build
pnpm -F @univ-lehavre/atlas-redcap-core test       # Tests
pnpm -F @univ-lehavre/atlas-redcap-core typecheck  # Vérification types
pnpm -F @univ-lehavre/atlas-redcap-core lint       # ESLint
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-redcap-core/)

## Organisation

Ce package fait partie d'**Atlas**, un ensemble d'outils développés par l'**Université Le Havre Normandie** pour faciliter la recherche et la collaboration entre chercheurs.

Atlas est développé dans le cadre de deux projets portés par l'Université Le Havre Normandie :

- **[Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)** : programme de recherche et de formation centré sur les enjeux maritimes et portuaires
- **[EUNICoast](https://eunicoast.eu/)** : alliance universitaire européenne regroupant des établissements situés sur les zones côtières européennes

---

<p align="center">
  <a href="https://www.univ-lehavre.fr/">
    <img src="../logos/ulhn.svg" alt="Université Le Havre Normandie" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://www.cptmp.fr/">
    <img src="../logos/cptmp.png" alt="Campus Polytechnique des Territoires Maritimes et Portuaires" height="20">
  </a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://eunicoast.eu/">
    <img src="../logos/eunicoast.png" alt="EUNICoast" height="20">
  </a>
</p>

## Licence

MIT
