---
layout: page
sidebar: false
---

<RedcapApiExplorer />

::: details A propos de cette specification

Les specifications OpenAPI sont extraites du code source REDCap avec l'autorisation officielle de REDCap.

| Version | Endpoints | Description |
|---------|-----------|-------------|
| 16.0.8  | 64        | Version actuelle |
| 15.5.32 | 64        | Version stable |
| 14.5.10 | 62        | Version legacy |

**Authentification** : Token API REDCap (32 ou 64 caracteres hex) transmis dans le body de la requete.

**Pattern API** : `POST /api/?content=<type>&action=<action>`

:::
