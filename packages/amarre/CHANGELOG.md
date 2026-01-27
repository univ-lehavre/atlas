# @univ-lehavre/amarre

## 1.7.0

### Minor Changes

- 47c914c: Add an AMARRE favicon

## 1.6.0

### Minor Changes

- 37b7513: Replace main title to a logo
- ad56973: Add the "follow" in the top navbar

### Patch Changes

- 1dbf533: Les liens ouvrent maintenant des nouveaux onglets

## 1.5.3

### Patch Changes

- 24cbd0b: Fix the UI validation presentation
- c5078b8: Suppression du champ confirmation dans le formulaire REDCap

## 1.5.2

### Patch Changes

- ec1a082: Fix the destination UI label in request title
- 5b395c4: Fix Follow title in UI
- ea478aa: Fix request status when form is empty

## 1.5.1

### Patch Changes

- f38e1ba: Fix an issue: users now get the same userid even if appwrite is reset. A new userid is set only if there is no records in REDCap for this user

## 1.5.0

### Minor Changes

- 90a0309: Add health API, and adjust the UI behavior

## 1.4.0

### Minor Changes

- 2942f58: Ajout d'un agent IA dédié à la sécurité

### Patch Changes

- 725bd67: Fix test on /api/v1/surveys/new

## 1.3.0

### Minor Changes

- 42f45ff: Ajout d'une méthode API liée à la santé de l'application
- 4cbfa3e: Ajout des liens d'enquête pour chaque demande et chaque instrument dans chaque demande

## 1.2.0

### Minor Changes

- 3f712af: La création d'une nouvelle requête n'est pas possible uniquement que si les dernières ont un formulaire complété
- cc93f5f: Replace Swagger UI with RapiDoc for API documentation. RapiDoc offers a modern, customizable interface with better user experience. Added anti-derive tests for survey endpoints to ensure OpenAPI schemas match actual API responses.
- c34f53b: add UI cards for each request

### Patch Changes

- 13fd770: /api/v1/surveys/download retrieves now all requests.

## 1.1.0

### Minor Changes

- 8e4676c: /api/v1/surveys/new Ajoute désormais l'identifiant de l'utilisateur
- 08608c2: Add /api/v1/surveys/new
- 43494a0: /api/v1/surveys/list is now implemented

### Patch Changes

- e70b05d: Mise à jour de la description de l'API dans /api/docs

## 1.0.0

### Major Changes

- 10d948c: Simplification du code et mise en place des bonnes pratiques

### Patch Changes

- 9d12227: Refactorisation des messages d'erreur dans l'interface graphique
- 436cfd0: Mise à jour de /api/docs en fonction des modifications de l'API
