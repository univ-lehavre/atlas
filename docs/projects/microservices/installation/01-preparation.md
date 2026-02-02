# Phase 1: System Preparation

## Prerequisites Check

Before starting, ensure you have:

- [ ] Ubuntu 24.04 LTS server with root access
- [ ] Public IP address
- [ ] DNS records configured (see [index](./index.md#prerequisites))
- [ ] Admin IP address for kubectl access
- [ ] SSH access to the server

## System Update

```bash
# Connect via SSH
ssh root@your-server-ip

# Update system packages
apt update && apt upgrade -y

# Install prerequisites
apt install -y \
  curl \
  wget \
  git \
  vim \
  ufw \
  open-iscsi \
  jq \
  unzip

# Enable iSCSI (required by Longhorn)
systemctl enable --now iscsid
```

## Firewall Configuration

::: danger Security Warning
The Kubernetes API port (6443) must NEVER be exposed publicly. Access is restricted to your admin IP only.
:::

```bash
# Set your admin IP (replace with your actual IP)
export ADMIN_IP="203.0.113.50"

# Configure firewall
ufw default deny incoming
ufw default allow outgoing

# SSH access
ufw allow 22/tcp

# HTTP/HTTPS for Let's Encrypt and services
ufw allow 80/tcp
ufw allow 443/tcp

# Kubernetes API - ADMIN ONLY
ufw allow from ${ADMIN_IP} to any port 6443 proto tcp

# Enable firewall
ufw enable
```

## Kernel Parameters

Optimize kernel for Kubernetes and Cilium:

```bash
cat >> /etc/sysctl.d/99-kubernetes.conf <<EOF
# Network
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1

# Memory
vm.swappiness = 0
vm.overcommit_memory = 1

# File descriptors
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512

# Cilium eBPF
net.core.bpf_jit_enable = 1
EOF

# Apply without reboot
sysctl --system
```

## Disable Swap

Kubernetes requires swap to be disabled:

```bash
# Disable swap immediately
swapoff -a

# Disable swap permanently
sed -i '/swap/d' /etc/fstab
```

## Create Required Directories

```bash
# K3s configuration
mkdir -p /etc/rancher/k3s

# Kubernetes audit logs
mkdir -p /var/log/kubernetes

# Longhorn storage
mkdir -p /var/lib/longhorn
```

## Validation Tests

```bash
# Check Ubuntu version
lsb_release -a
# Expected: Ubuntu 24.04 LTS

# Check firewall
ufw status numbered
# Expected: ports 22, 80, 443, 6443 (from ADMIN_IP) ALLOW

# Check resources
free -h          # RAM > 16GB recommended
df -h            # Disk > 200GB for /var/lib/longhorn
nproc            # CPU cores >= 4

# Check iSCSI
systemctl status iscsid
# Expected: active (running)

# Check swap is disabled
free -h | grep Swap
# Expected: Swap: 0B 0B 0B

# Check kernel parameters
sysctl net.ipv4.ip_forward
# Expected: net.ipv4.ip_forward = 1
```

## Expected Results

| Check | Expected |
|-------|----------|
| Ubuntu version | 24.04 LTS |
| Firewall | Active with 4 rules |
| RAM | > 16GB available |
| Disk | > 200GB free |
| CPU | >= 4 cores |
| iSCSI | Running |
| Swap | Disabled |

## Next Step

Proceed to [Phase 2: K3s Core](./02-k3s-core.md) to install Kubernetes with encrypted storage.
