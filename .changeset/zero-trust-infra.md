---
'@univ-lehavre/atlas-redcap-service': minor
---

feat(infra): add Zero Trust Kubernetes infrastructure with k3d

- Add k3d cluster configuration with local registry (localhost:5111)
- Add Cilium CNI with Ingress, Network Policies, and mTLS
- Add SPIRE for workload identity and automatic certificate rotation
- Add OPA with Rego policies for RBAC/ABAC authorization
- Add Authelia for magic link authentication
- Add MailHog for development email capture
- Add Loki/Grafana for observability and audit logs
- Add ecrin SvelteKit dashboard with Zero Trust integration
- Add setup.sh and teardown.sh scripts for easy deployment

### New features

- **ecrin dashboard**: SvelteKit 2 app with Svelte 5 runes, integrated with OPA for authorization
- **Infrastructure scripts**: One-command setup (`./infra/scripts/setup.sh`) and teardown
- **Zero Trust architecture**: 4 levels of authorization (Network, Authentication, Authorization, mTLS)

### Documentation

- Added CLAUDE.md with project conventions and patterns
- Added docs/guide/infrastructure.md for k3d setup documentation
- Updated README with architecture diagram and Zero Trust components
