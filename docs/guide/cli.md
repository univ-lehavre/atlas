# CLI Tools

Atlas fournit des outils en ligne de commande pour tester la connectivite et diagnostiquer les problemes.

## REDCap CLI

Outil pour tester la connectivite avec un service REDCap.

### Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-cli
```

### Mode interactif

```bash
redcap
```

Affiche un menu interactif :

```
🔬 REDCap CLI

Service URL: http://localhost:3000

  1. Check service connectivity
  2. Health check (REDCap + token)
  3. Show project info
  4. List instruments
  5. List fields
  6. Fetch sample records
  7. Run all tests
  0. Exit
```

### Mode CI

```bash
# Executer tous les tests
redcap --ci

# Sortie JSON pour pipelines CI
redcap --ci --json

# URL personnalisee
redcap --url http://localhost:3000 --ci
```

### Options

| Option       | Description                                      |
| ------------ | ------------------------------------------------ |
| `-u, --url`  | URL de base du service (default: localhost:3000) |
| `--ci`       | Mode CI (non-interactif)                         |
| `-j, --json` | Sortie JSON (mode CI uniquement)                 |
| `-h, --help` | Afficher l'aide                                  |

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

## Integration avec redcap-service

Les CLI sont disponibles comme dependances de dev dans `services/redcap` :

```bash
cd services/redcap

# Mode interactif
pnpm redcap

# Mode CI
pnpm redcap --ci
```
