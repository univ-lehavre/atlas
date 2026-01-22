# ECRIN Authorization Policy
# RBAC/ABAC policy engine for Zero Trust access control

package ecrin.authz

import future.keywords.if
import future.keywords.in

# Default deny - Zero Trust principle
default allow := false

# Input structure expected:
# {
#   "user": {
#     "email": "user@example.com",
#     "groups": ["admin", "researcher"]
#   },
#   "action": "read" | "write" | "delete",
#   "resource": {
#     "type": "record" | "user" | "project",
#     "id": "123",
#     "owner": "owner@example.com"
#   },
#   "context": {
#     "ip": "192.168.1.1",
#     "timestamp": "2024-01-22T10:30:00Z"
#   }
# }

# Admin role - full access
allow if {
    "admin" in input.user.groups
}

# Researcher role - can read all, write own resources
allow if {
    "researcher" in input.user.groups
    input.action == "read"
}

allow if {
    "researcher" in input.user.groups
    input.action == "write"
    input.resource.owner == input.user.email
}

allow if {
    "researcher" in input.user.groups
    input.action == "write"
    input.resource.type == "record"
    not input.resource.owner  # New record without owner
}

# Viewer role - read only
allow if {
    "viewer" in input.user.groups
    input.action == "read"
}

# Domain-based access for allowed-domain group
allow if {
    "allowed-domain" in input.user.groups
    input.action == "read"
}

# Deny rules take precedence

# Deny access outside working hours (except admin)
deny if {
    not "admin" in input.user.groups
    not working_hours
}

# Deny delete for non-admin
deny if {
    input.action == "delete"
    not "admin" in input.user.groups
}

# Helper: check if within working hours (8h-20h)
working_hours if {
    hour := time.clock([time.now_ns(), "Europe/Paris"])[0]
    hour >= 8
    hour < 20
}

# For dev environment, always allow working hours
working_hours if {
    # Dev bypass - in production, remove this rule
    true
}

# Final decision considering deny rules
final_allow := allow if {
    not deny
}

# Audit information
reasons[reason] if {
    "admin" in input.user.groups
    reason := "user is admin"
}

reasons[reason] if {
    "researcher" in input.user.groups
    input.action == "read"
    reason := "researcher can read"
}

reasons[reason] if {
    "researcher" in input.user.groups
    input.action == "write"
    input.resource.owner == input.user.email
    reason := "researcher owns resource"
}

reasons[reason] if {
    "viewer" in input.user.groups
    input.action == "read"
    reason := "viewer can read"
}

deny_reasons[reason] if {
    input.action == "delete"
    not "admin" in input.user.groups
    reason := "only admin can delete"
}

deny_reasons[reason] if {
    not working_hours
    not "admin" in input.user.groups
    reason := "access outside working hours"
}
