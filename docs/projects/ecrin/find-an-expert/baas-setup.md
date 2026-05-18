---
title: Appwrite Configuration
description: Guide for configuring the Appwrite database for Talent Finder
scope: infrastructure
tags: [appwrite, database, setup, configuration]
---

# Appwrite Configuration

This guide explains how to configure Appwrite for Talent Finder.

## Prerequisites

- An accessible Appwrite instance (self-hosted or Cloud)
- An administrator account on this instance

## Environment Variables

Copy `.env.example` to `.env` and configure the values:

```bash
# Redirect URL after authentication
PUBLIC_LOGIN_URL="http://localhost:5173"

# Appwrite
APPWRITE_ENDPOINT="https://your-instance.appwrite.io/v1"
APPWRITE_PROJECT="your-project-id"
APPWRITE_KEY="your-api-key"
APPWRITE_DATABASE_ID="your-database-id"
APPWRITE_CONSENT_EVENTS_COLLECTION_ID="consent-events"
APPWRITE_CURRENT_CONSENTS_COLLECTION_ID="current-consents"

# Allowed email domains (regex)
ALLOWED_DOMAINS_REGEXP="@your-domain\.com"
```

## Step-by-Step Configuration

### 1. Create a Project

1. Log in to the Appwrite console
2. Click on **Create project**
3. Note the **Project ID** → `APPWRITE_PROJECT`

### 2. Create an API Key

1. In the project, go to **Settings** > **API Keys**
2. Click on **Create API Key**
3. Name: `talent-finder-server`
4. Required scopes:
   - `users.read`
   - `users.write`
   - `databases.read`
   - `databases.write`
   - `collections.read`
   - `collections.write`
   - `documents.read`
   - `documents.write`
   - `attributes.read`
5. Copy the key → `APPWRITE_KEY`

### 3. Create the Database

1. Go to **Databases**
2. Click on **Create database**
3. Name: `talent-finder` (or another name)
4. Note the **Database ID** → `APPWRITE_DATABASE_ID`

### 4. Create the Collections

#### Collection `consent-events`

This collection stores the immutable history of consents (audit log).

1. In the database, click on **Create collection**
2. **Collection ID**: `consent-events`
3. **Name**: `Consent Events`
4. **Permissions**: None (API access only)

**Attributes to create**:

| Attribute     | Type   | Size | Required | Description               |
| ------------- | ------ | ---- | -------- | ------------------------- |
| `userId`      | String | 36   | Yes      | Appwrite user ID          |
| `consentType` | Enum   | -    | Yes      | Type of consent           |
| `action`      | Enum   | -    | Yes      | Action performed          |

**Enum values**:

- `consentType`: `openalex_email`
- `action`: `grant`, `revoke`

**Indexes to create**:

| Name              | Type | Attributes              |
| ----------------- | ---- | ----------------------- |
| `userId_idx`      | Key  | `userId`                |
| `userId_type_idx` | Key  | `userId`, `consentType` |

#### Collection `current-consents`

This collection stores the current state of consents (one entry per user/type).

1. Click on **Create collection**
2. **Collection ID**: `current-consents`
3. **Name**: `Current Consents`
4. **Permissions**: None (API access only)

**Attributes to create**:

| Attribute     | Type    | Size | Required | Description               |
| ------------- | ------- | ---- | -------- | ------------------------- |
| `userId`      | String  | 36   | Yes      | Appwrite user ID          |
| `consentType` | Enum    | -    | Yes      | Type of consent           |
| `granted`     | Boolean | -    | Yes      | Whether consent is granted |

**Enum values**:

- `consentType`: `openalex_email`

**Indexes to create**:

| Name              | Type   | Attributes              |
| ----------------- | ------ | ----------------------- |
| `userId_type_idx` | Unique | `userId`, `consentType` |

## Verification

Once configured, the dashboard displays the system health status in the **System Health** card (visible for admins).

The `/api/v1/health` API returns:

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
				"id": "your-database-id",
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

## Troubleshooting

### Status "unhealthy"

| Error                | Cause                          | Solution                        |
| -------------------- | ------------------------------ | ------------------------------- |
| `Invalid API key`    | API key incorrect or expired   | Regenerate the key in Appwrite  |
| `Project not found`  | Incorrect Project ID           | Check `APPWRITE_PROJECT`        |
| `Database not found` | Incorrect Database ID          | Check `APPWRITE_DATABASE_ID`    |
| `Connection timeout` | Appwrite unreachable           | Check the URL and network       |

### Status "degraded"

| Error                     | Cause                  | Solution                        |
| ------------------------- | ---------------------- | ------------------------------- |
| `Missing collections: X`  | Collection not created | Create the missing collection   |
| `Missing attributes: X.Y` | Attribute not created  | Add the missing attribute       |

## Architecture

```
Appwrite
└── Database: talent-finder
    ├── consent-events (audit log)
    │   ├── userId (string)
    │   ├── consentType (enum)
    │   ├── action (enum)
    │   └── $createdAt (system)
    │
    └── current-consents (current state)
        ├── userId (string)
        ├── consentType (enum)
        ├── granted (boolean)
        └── $updatedAt (system)
```

Fields prefixed with `$` are automatically managed by Appwrite.
