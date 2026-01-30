# Microservices

Infrastructure documentation for deploying the ATLAS platform on Kubernetes.

## Documentation

- [K3s Installation Procedure](./installation.md) - Complete installation guide for a single-server K3s cluster

## Architecture Overview

The ATLAS microservices platform runs on K3s (lightweight Kubernetes) with the following components:

| Component | Role | Technologies |
|-----------|------|--------------|
| **Orchestration** | Container management | K3s, containerd |
| **Networking** | CNI + Ingress | Cilium (eBPF), Envoy |
| **Storage** | Persistent volumes | Longhorn (CNCF) |
| **Certificates** | TLS automation | cert-manager, Let's Encrypt |
| **Authentication** | SSO/OIDC | Authelia |
| **Messaging** | Team collaboration | Mattermost |
| **Documents** | Collaborative editing | OnlyOffice |
| **Research forms** | Data capture | REDCap v16 |
| **Platform** | Researcher collaboration | ECRIN (SvelteKit) |
| **Object storage** | S3-compatible | SeaweedFS |
| **Git forge** | Source code hosting | Gitea |
| **GitOps CD** | Continuous deployment | ArgoCD |

## Resource Requirements

| Resource | Minimum |
|----------|---------|
| RAM | 14 GB |
| CPU | 4 cores |
| Disk | 100 GB |
| OS | Ubuntu 22.04+ |

## Related Documentation

- [ECRIN Platform](/projects/ecrin/) - Researcher collaboration platform
- [CRF / REDCap](/projects/crf/) - Case Report Forms documentation
- [Infrastructure Guide](/guide/developers/infrastructure) - General infrastructure documentation
