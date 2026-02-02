# Phase 0: Ubuntu Hardening

This phase hardens the Ubuntu server before installing Kubernetes. All configurations are based on security best practices.

::: tip Local Development (K3D/macOS)
This phase is **optional for local development**. K3D runs inside Docker on your laptop where these server hardening measures don't apply. Skip directly to [Phase 1: System Preparation](./01-preparation.md).
:::

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Layers                              │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   SSH        │  │   Firewall   │  │   Fail2ban   │          │
│  │   Hardening  │  │   (UFW)      │  │   (IDS)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Audit Daemon                          │   │
│  │           (System calls, file access, network)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Automatic Security Updates                  │   │
│  │                  (unattended-upgrades)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before starting, ensure you have:

- [ ] Ubuntu 24.04 LTS server with root access
- [ ] SSH access to the server
- [ ] A non-root user with sudo privileges (or create one below)

## Create Admin User

::: danger Security
Never use the root account directly. Create a dedicated admin user.
:::

```bash
# Connect as root initially
ssh root@your-server-ip

# Create admin user (replace 'admin' with your username)
export ADMIN_USER="admin"
adduser ${ADMIN_USER}

# Add to sudo group
usermod -aG sudo ${ADMIN_USER}

# Copy SSH authorized keys from root
mkdir -p /home/${ADMIN_USER}/.ssh
cp /root/.ssh/authorized_keys /home/${ADMIN_USER}/.ssh/
chown -R ${ADMIN_USER}:${ADMIN_USER} /home/${ADMIN_USER}/.ssh
chmod 700 /home/${ADMIN_USER}/.ssh
chmod 600 /home/${ADMIN_USER}/.ssh/authorized_keys

# Test SSH access in a new terminal before proceeding!
# ssh admin@your-server-ip
```

## SSH Hardening

Secure the SSH daemon to prevent brute force attacks and unauthorized access.

```bash
# Backup current configuration
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Apply hardening configuration
sudo tee /etc/ssh/sshd_config.d/hardening.conf > /dev/null <<EOF
# Disable root login
PermitRootLogin no

# Disable password authentication (key only)
PasswordAuthentication no
ChallengeResponseAuthentication no

# Enable public key authentication
PubkeyAuthentication yes

# Limit authentication attempts
MaxAuthTries 3
LoginGraceTime 30s

# Restrict users (replace 'admin' with your username)
AllowUsers ${ADMIN_USER}

# Enable verbose logging
LogLevel VERBOSE

# Connection keepalive
ClientAliveInterval 300
ClientAliveCountMax 3
EOF

# Validate configuration
sudo sshd -t

# Restart SSH service
sudo systemctl restart sshd
```

::: warning
Test SSH access in a **new terminal** before closing your current session:
```bash
ssh admin@your-server-ip
```
If you can't connect, restore the backup: `sudo cp /etc/ssh/sshd_config.bak /etc/ssh/sshd_config`
:::

## Automatic Security Updates

Configure automatic installation of security patches.

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades apt-listchanges

# Enable automatic updates
sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null <<EOF
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# Configure unattended-upgrades
sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::Package-Blacklist {
};
Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF

# Verify configuration
sudo unattended-upgrade --dry-run --debug
```

## Fail2ban (Intrusion Detection)

Install and configure fail2ban to automatically ban IPs with too many failed login attempts.

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local configuration
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
# Ban duration (10 minutes)
bantime = 10m

# Time window for counting failures
findtime = 10m

# Max failures before ban
maxretry = 3

# Action: ban IP via UFW
banaction = ufw

[sshd]
enabled = true
port = ssh
backend = systemd
maxretry = 3
EOF

# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

## Audit Daemon (auditd)

Install auditd for comprehensive system auditing and logging.

```bash
# Install auditd
sudo apt install -y auditd audispd-plugins

# Create audit rules based on security best practices
# (Florian Roth's Linux Audit Rules)
sudo tee /etc/audit/rules.d/hardening.rules > /dev/null <<'EOF'
# Remove existing rules
-D

# Buffer and failure settings
-b 8192
-f 1
-i

# Self auditing
-w /var/log/audit/ -p wra -k auditlog
-w /etc/audit/ -p wa -k auditconfig
-w /sbin/auditctl -p x -k audittools
-w /sbin/auditd -p x -k audittools

# Kernel modules
-a always,exit -F perm=x -F auid!=-1 -F path=/sbin/insmod -k modules
-a always,exit -F perm=x -F auid!=-1 -F path=/sbin/modprobe -k modules
-a always,exit -F perm=x -F auid!=-1 -F path=/sbin/rmmod -k modules
-a always,exit -F arch=b64 -S finit_module -S init_module -S delete_module -F auid!=-1 -k modules
-w /etc/modprobe.conf -p wa -k modprobe
-w /etc/modprobe.d -p wa -k modprobe

# Kernel parameters
-w /etc/sysctl.conf -p wa -k sysctl
-w /etc/sysctl.d -p wa -k sysctl

# Cron
-w /etc/cron.allow -p wa -k cron
-w /etc/cron.deny -p wa -k cron
-w /etc/cron.d/ -p wa -k cron
-w /etc/cron.daily/ -p wa -k cron
-w /etc/cron.hourly/ -p wa -k cron
-w /etc/cron.monthly/ -p wa -k cron
-w /etc/cron.weekly/ -p wa -k cron
-w /etc/crontab -p wa -k cron
-w /var/spool/cron/ -p wa -k cron

# User and group management
-w /etc/group -p wa -k etcgroup
-w /etc/passwd -p wa -k etcpasswd
-w /etc/gshadow -k etcgroup
-w /etc/shadow -k etcpasswd
-w /etc/sudoers -p wa -k actions
-w /etc/sudoers.d/ -p wa -k actions
-w /usr/bin/passwd -p x -k passwd_modification
-w /usr/sbin/groupadd -p x -k group_modification
-w /usr/sbin/groupmod -p x -k group_modification
-w /usr/sbin/useradd -p x -k user_modification
-w /usr/sbin/userdel -p x -k user_modification
-w /usr/sbin/usermod -p x -k user_modification

# SSH configuration
-w /etc/ssh/sshd_config -k sshd
-w /etc/ssh/sshd_config.d -k sshd
-w /root/.ssh -p wa -k rootkey

# Network changes
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k network_modifications
-w /etc/hosts -p wa -k network_modifications
-w /etc/network/ -p wa -k network

# Systemd
-w /bin/systemctl -p x -k systemd
-w /etc/systemd/ -p wa -k systemd
-w /usr/lib/systemd -p wa -k systemd

# PAM configuration
-w /etc/pam.d/ -p wa -k pam
-w /etc/security/limits.conf -p wa -k pam

# Privilege escalation
-w /bin/su -p x -k priv_esc
-w /usr/bin/sudo -p x -k priv_esc

# Power commands
-w /sbin/shutdown -p x -k power
-w /sbin/poweroff -p x -k power
-w /sbin/reboot -p x -k power
-w /sbin/halt -p x -k power

# Suspicious activity
-w /usr/bin/wget -p x -k susp_activity
-w /usr/bin/curl -p x -k susp_activity
-w /usr/bin/base64 -p x -k susp_activity
-w /bin/nc -p x -k susp_activity
-w /bin/netcat -p x -k susp_activity
-w /usr/bin/ncat -p x -k susp_activity

# Software management
-w /usr/bin/dpkg -p x -k software_mgmt
-w /usr/bin/apt -p x -k software_mgmt
-w /usr/bin/apt-get -p x -k software_mgmt

# Docker (for K3s)
-w /usr/bin/dockerd -k docker
-w /usr/bin/docker -k docker
-w /var/lib/docker -p wa -k docker
-w /etc/docker -k docker

# Kubernetes
-w /usr/bin/kubelet -k kubelet
-w /var/run/secrets/ -p wa -k k8s_secrets
-w /var/lib/kubelet/pki/ -p wa -k kubelet_pki

# Firewall changes
-w /etc/ufw/ -p wa -k ufw
-w /sbin/iptables -p x -k sbin_susp
-w /sbin/ip6tables -p x -k sbin_susp
-w /usr/sbin/ufw -p x -k sbin_susp

# Temporary directory executions (potential malware)
-a always,exit -F dir=/tmp/ -F perm=x -k tmp_shell
-a always,exit -F dir=/var/tmp/ -F perm=x -k tmp_shell
-a always,exit -F dir=/dev/shm/ -F perm=x -k tmp_shell

# Root commands
-a always,exit -F arch=b64 -F euid=0 -F auid>=1000 -F auid!=-1 -S execve -k rootcmd

# File deletion
-a always,exit -F arch=b64 -S rmdir -S unlink -S unlinkat -S rename -S renameat -F auid>=1000 -F auid!=-1 -k delete
EOF

# Load rules
sudo augenrules --load

# Enable and start auditd
sudo systemctl enable auditd
sudo systemctl start auditd

# Verify rules are loaded
sudo auditctl -l | head -20
```

## Firewall Pre-configuration

Basic firewall setup before Kubernetes installation:

```bash
# Install UFW if not present
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (critical - do this first!)
sudo ufw allow 22/tcp comment 'SSH'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

::: info
Additional firewall rules (HTTP, HTTPS, Kubernetes API) will be configured in [Phase 1: System Preparation](./01-preparation.md).
:::

## Validation Tests

```bash
# Check SSH configuration
sudo sshd -t && echo "SSH config OK"

# Check fail2ban status
sudo fail2ban-client status sshd
# Expected: Currently failed/banned IPs listed

# Check auditd status
sudo systemctl status auditd
# Expected: active (running)

# Check audit rules loaded
sudo auditctl -l | wc -l
# Expected: ~60+ rules

# Check unattended-upgrades
sudo systemctl status unattended-upgrades
# Expected: active (running)

# Check firewall
sudo ufw status numbered
# Expected: SSH allowed

# Test SSH hardening (should fail with password)
# From another machine:
# ssh -o PreferredAuthentications=password root@your-server-ip
# Expected: Permission denied
```

## Expected Results

| Component | Status |
|-----------|--------|
| SSH hardening | Root disabled, key-only auth |
| fail2ban | Active, monitoring SSH |
| auditd | ~60+ rules loaded |
| unattended-upgrades | Auto-updates enabled |
| UFW | SSH allowed, default deny |

## Security Summary

| Layer | Protection |
|-------|------------|
| SSH | Key-only authentication, no root, max 3 attempts |
| IDS | fail2ban bans after 3 failed attempts |
| Audit | Comprehensive logging (users, files, network, sudo) |
| Updates | Automatic security patches, auto-reboot at 4:00 AM |
| Firewall | Default deny, explicit allow |

## Audit Log Queries

Useful commands to query audit logs:

```bash
# Recent sudo usage
sudo ausearch -k priv_esc -ts recent

# User modifications
sudo ausearch -k user_modification -ts today

# Failed logins
sudo ausearch -m USER_LOGIN -sv no -ts today

# Software installations
sudo ausearch -k software_mgmt -ts today

# File deletions
sudo ausearch -k delete -ts today

# Generate daily report
sudo aureport --summary
```

## Next Step

Proceed to [Phase 1: System Preparation](./01-preparation.md) to prepare the system for Kubernetes.
