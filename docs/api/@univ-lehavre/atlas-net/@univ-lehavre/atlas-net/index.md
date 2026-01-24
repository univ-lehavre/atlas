# @univ-lehavre/atlas-net

## See

README.md for full documentation

## Interfaces

| Interface | Description |
| ------ | ------ |
| [DiagnosticResult](interfaces/DiagnosticResult.md) | Aggregated result of multiple diagnostic steps. |
| [DiagnosticStep](interfaces/DiagnosticStep.md) | Result of a single diagnostic step. |
| [TcpPingOptions](interfaces/TcpPingOptions.md) | Options for TCP ping operation. |
| [TlsHandshakeOptions](interfaces/TlsHandshakeOptions.md) | Options for TLS handshake operation. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [DiagnosticStatus](type-aliases/DiagnosticStatus.md) | Status of a diagnostic step. |
| [Host](type-aliases/Host.md) | Union type for host parameter. Accepts either a `Hostname` or `IpAddress` branded type. Used in function signatures that accept both hostnames and IP addresses. |
| [Hostname](type-aliases/Hostname.md) | Branded type for hostnames. Validates according to RFC 1123. Also accepts valid IP addresses. |
| [IpAddress](type-aliases/IpAddress.md) | Branded type for IP addresses. Accepts valid IPv4 (e.g., '192.168.1.1') or IPv6 (e.g., '::1') addresses. |
| [Port](type-aliases/Port.md) | Branded type for port numbers. Valid range: 1 to 65535. |
| [SafeApiUrl](type-aliases/SafeApiUrl.md) | Branded type for safe API URLs. |
| [TimeoutMs](type-aliases/TimeoutMs.md) | Branded type for timeout values in milliseconds. Valid range: 0 to 600000 (10 minutes). |

## Variables

| Variable | Description |
| ------ | ------ |
| [DEFAULT\_INTERNET\_CHECK\_TIMEOUT\_MS](variables/DEFAULT_INTERNET_CHECK_TIMEOUT_MS.md) | Default timeout for internet connectivity checks in milliseconds. |
| [DEFAULT\_TCP\_TIMEOUT\_MS](variables/DEFAULT_TCP_TIMEOUT_MS.md) | Default timeout for TCP connections in milliseconds. |
| [DEFAULT\_TLS\_TIMEOUT\_MS](variables/DEFAULT_TLS_TIMEOUT_MS.md) | Default timeout for TLS handshakes in milliseconds. |
| [Hostname](variables/Hostname.md) | Constructor for Hostname branded type with validation. |
| [HTTPS\_PORT](variables/HTTPS_PORT.md) | Standard HTTPS port. |
| [INTERNET\_CHECK\_HOST](variables/INTERNET_CHECK_HOST.md) | Host used for internet connectivity checks (Cloudflare DNS). |
| [IpAddress](variables/IpAddress.md) | Constructor for IpAddress branded type with validation. |
| [Port](variables/Port.md) | Constructor for Port branded type with validation. |
| [SafeApiUrl](variables/SafeApiUrl.md) | Constructor for SafeApiUrl branded type with validation. |
| [TimeoutMs](variables/TimeoutMs.md) | Constructor for TimeoutMs branded type with validation. |

## Functions

| Function | Description |
| ------ | ------ |
| [checkInternet](functions/checkInternet.md) | Checks basic internet connectivity by pinging Cloudflare's DNS server. |
| [dnsResolve](functions/dnsResolve.md) | Resolves a hostname to an IP address using DNS lookup. |
| [tcpPing](functions/tcpPing.md) | Tests TCP connectivity to a host and port. |
| [tlsHandshake](functions/tlsHandshake.md) | Tests TLS/SSL connectivity and validates the server certificate. |

## References

### HostnameType

Renames and re-exports [Hostname](variables/Hostname.md)

***

### IpAddressType

Renames and re-exports [IpAddress](variables/IpAddress.md)

***

### PortType

Renames and re-exports [Port](variables/Port.md)

***

### SafeApiUrlType

Renames and re-exports [SafeApiUrl](variables/SafeApiUrl.md)

***

### TimeoutMsType

Renames and re-exports [TimeoutMs](variables/TimeoutMs.md)
