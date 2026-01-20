---
'@univ-lehavre/atlas-redcap-service': patch
---

Améliore la gestion des erreurs dans les routes:

- Utilise runEffect de manière cohérente dans la route users
- Encapsule le parsing des branded types dans Effect.try pour éviter les exceptions non capturées
