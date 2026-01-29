# @univ-lehavre/atlas-net

Utilitaires de diagnostic réseau pour Atlas, construits avec [Effect](https://effect.website/).

## À propos

Ce package fournit des outils de diagnostic réseau typés et fonctionnels pour les applications Atlas. Il est utilisé par les outils CLI pour vérifier la connectivité aux serveurs REDCap et autres services.

## Fonctionnalités

- **Résolution DNS** : Vérifier la résolution des noms d'hôtes
- **Ping TCP** : Tester si un port est ouvert et accessible
- **Handshake TLS** : Vérifier les certificats SSL/TLS
- **Vérification Internet** : Test rapide de connectivité
- **Types Branded** : Valeurs réseau typées avec validation runtime
- **Constantes** : Timeouts et configuration réseau par défaut

## Installation

```bash
pnpm add @univ-lehavre/atlas-net effect
```

## Usage

```typescript
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  Hostname,
  Port,
} from '@univ-lehavre/atlas-net';

// Vérifier la connectivité Internet
const internet = await Effect.runPromise(checkInternet());
console.log(`Internet: ${internet.status}`);

// Résoudre un nom d'hôte
const hostname = Hostname('example.com');
const dns = await Effect.runPromise(dnsResolve(hostname));
console.log(`DNS: ${dns.status} -> ${dns.message}`);

// Tester la connexion TCP
const port = Port(443);
const tcp = await Effect.runPromise(tcpPing(hostname, port));
console.log(`TCP: ${tcp.status} (${tcp.latencyMs}ms)`);

// Vérifier le certificat TLS
const tls = await Effect.runPromise(tlsHandshake(hostname, port));
console.log(`TLS: ${tls.status} - ${tls.message}`);
```

### Pipeline de diagnostic complet

```typescript
import { Effect } from 'effect';
import {
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
  Hostname,
  Port,
} from '@univ-lehavre/atlas-net';

const diagnose = (host: Hostname, port: Port) =>
  Effect.all([checkInternet(), dnsResolve(host), tcpPing(host, port), tlsHandshake(host, port)]);

const steps = await Effect.runPromise(diagnose(Hostname('example.com'), Port(443)));
steps.forEach((step) => {
  console.log(`${step.name}: ${step.status} (${step.latencyMs}ms)`);
});
```

## Types Branded

Le package fournit des types branded avec validation runtime via le module Brand d'Effect.

```typescript
import { Hostname, IpAddress, Port, TimeoutMs, SafeApiUrl } from '@univ-lehavre/atlas-net';

// Créer des valeurs validées
const hostname = Hostname('example.com'); // Hostname validé (RFC 1123)
const ip = IpAddress('192.168.1.1'); // Adresse IPv4 validée
const port = Port(8080); // Port validé (1-65535)
const timeout = TimeoutMs(5000); // Timeout validé (0-600000ms)
const url = SafeApiUrl('https://api.example.com/v1/'); // URL sécurisée
```

## API

### Fonctions

| Fonction | Description |
|----------|-------------|
| `dnsResolve(hostname)` | Résout un hostname en adresse IP |
| `tcpPing(host, port, options?)` | Teste la connectivité TCP |
| `tlsHandshake(host, port, options?)` | Vérifie le certificat TLS |
| `checkInternet(options?)` | Vérifie la connectivité Internet |

### Types

| Type | Description |
|------|-------------|
| `Hostname` | Hostname validé RFC 1123 ou adresse IP |
| `IpAddress` | Adresse IPv4 ou IPv6 validée |
| `Port` | Numéro de port (1-65535) |
| `TimeoutMs` | Timeout en millisecondes (0-600000) |
| `SafeApiUrl` | URL sécurisée pour communication API |
| `DiagnosticStep` | Résultat d'une étape de diagnostic |

### Constantes

```typescript
import {
  DEFAULT_TCP_TIMEOUT_MS, // 3000ms
  DEFAULT_TLS_TIMEOUT_MS, // 5000ms
  INTERNET_CHECK_HOST, // '1.1.1.1' (Cloudflare DNS)
  HTTPS_PORT, // 443
} from '@univ-lehavre/atlas-net';
```

## Documentation

- [Documentation API](../../docs/api/@univ-lehavre/atlas-net/)

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
