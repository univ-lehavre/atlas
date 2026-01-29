# CLI Tools

Atlas fournit des outils en ligne de commande pour tester la connectivite et diagnostiquer les problemes.

## CRF REDCap CLI

Outil pour tester la connectivite directe avec l'API REDCap.

### Installation

```bash
pnpm add @univ-lehavre/crf
```

### Usage

```bash
# Tester la connectivite REDCap
crf-redcap test

# Avec URL et token personnalises
REDCAP_API_URL=https://redcap.example.com/api/ \
REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA \
crf-redcap test

# Sortie JSON
crf-redcap test --json
```

### Tests executes

1. **Version** - Recupere la version REDCap
2. **Project Info** - Informations du projet
3. **Instruments** - Liste des formulaires
4. **Fields** - Liste des champs
5. **Records** - Export d'un echantillon de records

### Options

| Option       | Description     |
| ------------ | --------------- |
| `--json`     | Sortie JSON     |
| `-h, --help` | Afficher l'aide |

### Variables d'environnement

| Variable           | Description                     |
| ------------------ | ------------------------------- |
| `REDCAP_API_URL`   | URL de l'API REDCap             |
| `REDCAP_API_TOKEN` | Token API REDCap (32 hex chars) |

## Network CLI

Outil pour diagnostiquer les problemes de connectivite reseau.

### Installation

```bash
pnpm add @univ-lehavre/atlas-net-cli
```

### Mode interactif

```bash
atlas-net
```

Demande une URL et execute les diagnostics :

```
◆  Atlas Network Diagnostics

◆  Enter target URL to diagnose
│  https://example.com

✓ DNS Resolution (12ms) → 93.184.216.34
✓ TCP Connect (45ms)
✓ TLS Handshake (89ms) → example.com

◆  Done
```

### URL directe

```bash
atlas-net https://example.com
```

### Mode CI

```bash
atlas-net --ci https://example.com
```

Sortie :

```
[OK   ] DNS Resolution 12ms - 93.184.216.34
[OK   ] TCP Connect 45ms
[OK   ] TLS Handshake 89ms - example.com
```

### Options

| Option       | Description                           |
| ------------ | ------------------------------------- |
| `-c, --ci`   | Mode CI (sans prompts, sortie simple) |
| `-h, --help` | Afficher l'aide                       |

### Etapes de diagnostic

1. **DNS Resolution** - Resout le nom d'hote en adresse IP
2. **TCP Connect** - Verifie que le port est ouvert et accessible
3. **TLS Handshake** - (HTTPS uniquement) Valide le certificat SSL/TLS

Si une etape echoue, un **Internet Check** est automatiquement execute pour determiner si le probleme est local.

### Codes de sortie

- `0` : Tous les diagnostics ont reussi
- `1` : Un ou plusieurs diagnostics ont echoue

## Integration avec le package CRF

Les CLI sont inclus dans le package `@univ-lehavre/crf` :

```bash
# Tester REDCap directement
pnpm -F @univ-lehavre/crf crf-redcap test

# Lancer le mock REDCap (Prism)
pnpm -F @univ-lehavre/crf mock:redcap

# Lancer le serveur CRF
pnpm -F @univ-lehavre/crf start
```
