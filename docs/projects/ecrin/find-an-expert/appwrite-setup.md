---
title: Configuration Appwrite
description: Guide de configuration de la base de données Appwrite pour Talent Finder
scope: infrastructure
tags: [appwrite, database, setup, configuration]
---

# Configuration Appwrite

Ce guide explique comment configurer Appwrite pour Talent Finder.

## Prérequis

- Une instance Appwrite accessible (auto-hébergée ou Cloud)
- Un compte administrateur sur cette instance

## Variables d'environnement

Copier `.env.example` vers `.env` et configurer les valeurs :

```bash
# URL de redirection après authentification
PUBLIC_LOGIN_URL="http://localhost:5173"

# Appwrite
APPWRITE_ENDPOINT="https://votre-instance.appwrite.io/v1"
APPWRITE_PROJECT="votre-project-id"
APPWRITE_KEY="votre-api-key"
APPWRITE_DATABASE_ID="votre-database-id"
APPWRITE_CONSENT_EVENTS_COLLECTION_ID="consent-events"
APPWRITE_CURRENT_CONSENTS_COLLECTION_ID="current-consents"

# Domaines email autorisés (regex)
ALLOWED_DOMAINS_REGEXP="@votre-domaine\.fr"
```

## Configuration pas à pas

### 1. Créer un projet

1. Connectez-vous à la console Appwrite
2. Cliquez sur **Create project**
3. Notez le **Project ID** → `APPWRITE_PROJECT`

### 2. Créer une clé API

1. Dans le projet, allez dans **Settings** > **API Keys**
2. Cliquez sur **Create API Key**
3. Nom : `talent-finder-server`
4. Scopes requis :
   - `users.read`
   - `users.write`
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `documents.read`
   - `documents.write`
   - `attributes.read`
5. Copiez la clé → `APPWRITE_KEY`

### 3. Créer la base de données

1. Allez dans **Databases**
2. Cliquez sur **Create database**
3. Nom : `talent-finder` (ou autre)
4. Notez le **Database ID** → `APPWRITE_DATABASE_ID`

### 4. Créer les collections

#### Collection `consent-events`

Cette collection stocke l'historique immutable des consentements (audit log).

1. Dans la base de données, cliquez sur **Create collection**
2. **Collection ID** : `consent-events`
3. **Name** : `Consent Events`
4. **Permissions** : Aucune (accès API uniquement)

**Attributs à créer** :

| Attribut      | Type   | Taille | Requis | Description                  |
| ------------- | ------ | ------ | ------ | ---------------------------- |
| `userId`      | String | 36     | ✅     | ID de l'utilisateur Appwrite |
| `consentType` | Enum   | -      | ✅     | Type de consentement         |
| `action`      | Enum   | -      | ✅     | Action effectuée             |

**Valeurs Enum** :

- `consentType` : `openalex_email`
- `action` : `grant`, `revoke`

**Index à créer** :

| Nom               | Type | Attributs               |
| ----------------- | ---- | ----------------------- |
| `userId_idx`      | Key  | `userId`                |
| `userId_type_idx` | Key  | `userId`, `consentType` |

#### Collection `current-consents`

Cette collection stocke l'état actuel des consentements (une entrée par utilisateur/type).

1. Cliquez sur **Create collection**
2. **Collection ID** : `current-consents`
3. **Name** : `Current Consents`
4. **Permissions** : Aucune (accès API uniquement)

**Attributs à créer** :

| Attribut      | Type    | Taille | Requis | Description                  |
| ------------- | ------- | ------ | ------ | ---------------------------- |
| `userId`      | String  | 36     | ✅     | ID de l'utilisateur Appwrite |
| `consentType` | Enum    | -      | ✅     | Type de consentement         |
| `granted`     | Boolean | -      | ✅     | Consentement accordé ou non  |

**Valeurs Enum** :

- `consentType` : `openalex_email`

**Index à créer** :

| Nom               | Type   | Attributs               |
| ----------------- | ------ | ----------------------- |
| `userId_type_idx` | Unique | `userId`, `consentType` |

## Vérification

Une fois configuré, le dashboard affiche l'état de santé du système dans la carte **System Health** (visible pour les admins).

L'API `/api/v1/health` retourne :

```json
{
	"status": "healthy",
	"timestamp": "2024-01-15T12:00:00.000Z",
	"services": [
		{
			"name": "appwrite",
			"status": "healthy",
			"responseTimeMs": 150,
			"database": {
				"id": "votre-database-id",
				"name": "talent-finder",
				"exists": true,
				"apiKeyValid": true,
				"collections": [
					{
						"id": "consent-events",
						"name": "Consent Events",
						"exists": true,
						"attributes": [
							{ "name": "userId", "exists": true, "type": "string" },
							{ "name": "consentType", "exists": true, "type": "enum" },
							{ "name": "action", "exists": true, "type": "enum" }
						]
					},
					{
						"id": "current-consents",
						"name": "Current Consents",
						"exists": true,
						"attributes": [
							{ "name": "userId", "exists": true, "type": "string" },
							{ "name": "consentType", "exists": true, "type": "enum" },
							{ "name": "granted", "exists": true, "type": "boolean" }
						]
					}
				]
			}
		}
	]
}
```

## Dépannage

### Status "unhealthy"

| Erreur               | Cause                         | Solution                        |
| -------------------- | ----------------------------- | ------------------------------- |
| `Invalid API key`    | Clé API incorrecte ou expirée | Régénérer la clé dans Appwrite  |
| `Project not found`  | Project ID incorrect          | Vérifier `APPWRITE_PROJECT`     |
| `Database not found` | Database ID incorrect         | Vérifier `APPWRITE_DATABASE_ID` |
| `Connection timeout` | Appwrite inaccessible         | Vérifier l'URL et le réseau     |

### Status "degraded"

| Erreur                    | Cause                | Solution                      |
| ------------------------- | -------------------- | ----------------------------- |
| `Missing collections: X`  | Collection non créée | Créer la collection manquante |
| `Missing attributes: X.Y` | Attribut non créé    | Ajouter l'attribut manquant   |

## Architecture

```
Appwrite
└── Database: talent-finder
    ├── consent-events (audit log)
    │   ├── userId (string)
    │   ├── consentType (enum)
    │   ├── action (enum)
    │   └── $createdAt (système)
    │
    └── current-consents (état actuel)
        ├── userId (string)
        ├── consentType (enum)
        ├── granted (boolean)
        └── $updatedAt (système)
```

Les champs préfixés par `$` sont gérés automatiquement par Appwrite.
