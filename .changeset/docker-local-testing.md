---
'@univ-lehavre/atlas-redcap-service': patch
---

Add Docker infrastructure for local testing

- Add Dockerfile for containerized deployment
- Add docker-compose.yml with mock REDCap server
- Add httpyac-based API tests (22 endpoints)
- Add npm scripts: `docker`, `docker:build`, `docker:test`
