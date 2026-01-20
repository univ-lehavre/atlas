# Getting Started

## Installation

```bash
pnpm install
```

## Configuration

Créez un fichier `.env` dans `apps/redcap-service/` :

```bash
cp apps/redcap-service/.env.example apps/redcap-service/.env
```

Configurez les variables :

```env
PORT=3000
REDCAP_API_URL=https://redcap.example.com/api/
REDCAP_API_TOKEN=your_token_here
```

## Développement

```bash
pnpm dev
```

## Build

```bash
pnpm build
```
