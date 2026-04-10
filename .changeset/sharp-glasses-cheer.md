---
"@univ-lehavre/atlas-redcap-logs": minor
---

Add endpoint network diagnostics helpers to REDCap logs.

- add `diagnoseEndpointNetwork` export to probe DNS/TCP/TLS connectivity for REDCap API endpoints
- expose structured diagnostics (target, DNS result, TCP probe, TLS metadata/errors) for dashboard and CLI troubleshooting
