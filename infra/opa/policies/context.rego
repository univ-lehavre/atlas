# ECRIN Context Policy
# Risk scoring and contextual access control

package ecrin.context

import future.keywords.if
import future.keywords.in

# Risk score calculation (0.0 = low risk, 1.0 = high risk)
default risk_score := 0.5

# Known IP ranges (internal/trusted)
trusted_networks := [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "127.0.0.0/8"
]

# Low risk for internal IPs
risk_score := 0.1 if {
    some network in trusted_networks
    net.cidr_contains(network, input.context.ip)
}

# High risk for unknown IPs
risk_score := 0.8 if {
    not any_trusted_network
}

any_trusted_network if {
    some network in trusted_networks
    net.cidr_contains(network, input.context.ip)
}

# Increase risk outside working hours
risk_modifier := 0.2 if {
    not working_hours
}

risk_modifier := 0.0 if {
    working_hours
}

working_hours if {
    hour := time.clock([time.now_ns(), "Europe/Paris"])[0]
    hour >= 8
    hour < 20
}

# Final risk score
final_risk_score := min([1.0, risk_score + risk_modifier])

# Risk-based access decision
high_risk if {
    final_risk_score > 0.7
}

# Require additional verification for high-risk access
require_mfa if {
    high_risk
    input.action in ["write", "delete"]
}

# Device trust (placeholder - would integrate with MDM in production)
device_trusted if {
    input.context.device_id != ""
    # In production: check device against MDM/EDR
    true
}

device_trusted if {
    # Dev bypass
    not input.context.device_id
}
