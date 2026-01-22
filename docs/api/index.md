# Reference API

Documentation technique auto-generee pour les packages Atlas.

## Packages

### @univ-lehavre/atlas-redcap-api

Client TypeScript pour l'API REDCap, construit avec [Effect](https://effect.website/).

**Classes**

- [RedcapClientService](./classes/RedcapClientService) - Service Effect pour l'injection de dependances
- [RedcapApiError](./classes/RedcapApiError), [RedcapHttpError](./classes/RedcapHttpError), [RedcapNetworkError](./classes/RedcapNetworkError) - Erreurs typees

**Interfaces**

- [RedcapClient](./interfaces/RedcapClient) - Interface du client API
- [RedcapConfig](./interfaces/RedcapConfig) - Configuration
- [ExportRecordsOptions](./interfaces/ExportRecordsOptions), [ImportRecordsOptions](./interfaces/ImportRecordsOptions) - Options d'export/import

**Fonctions**

- [createRedcapClient](./functions/createRedcapClient) - Creer un client
- [makeRedcapClientLayer](./functions/makeRedcapClientLayer) - Creer un Layer Effect
- [escapeFilterLogicValue](./functions/escapeFilterLogicValue) - Echapper les valeurs filterLogic

**Types**

- [RedcapUrl](./type-aliases/RedcapUrl), [RedcapToken](./type-aliases/RedcapToken) - Configuration
- [RecordId](./type-aliases/RecordId), [InstrumentName](./type-aliases/InstrumentName) - Identifiants

### @univ-lehavre/atlas-redcap-service

Microservice HTTP REST pour REDCap, construit avec [Hono](https://hono.dev/).

Voir le [README du service](https://github.com/univ-lehavre/atlas/tree/main/apps/redcap-service) pour la documentation des endpoints.

## Generation

Cette documentation est generee automatiquement avec [TypeDoc](https://typedoc.org/) et le plugin [typedoc-plugin-markdown](https://github.com/typedoc2md/typedoc-plugin-markdown).

```bash
pnpm docs:api
```
