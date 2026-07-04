---
"@univ-lehavre/atlas-crf": minor
---

- fix: corriger le binding lazy, l'attribution et instrumenter /metrics (revue adr 0089)
- feat: exposer /metrics prometheus via effect (adr 0089, #400)
- feat: middleware d'authentification Bearer sur le service Hono (#307) (#321)
- fix: graceful shutdown on sigterm/sigint (#318)
