/**
 * @module @univ-lehavre/atlas-net
 * @see README.md for full documentation
 */

export {
  // Branded Types
  type Host,
  Hostname,
  type Hostname as HostnameType,
  IpAddress,
  type IpAddress as IpAddressType,
  Port,
  type Port as PortType,
  SafeApiUrl,
  type SafeApiUrl as SafeApiUrlType,
  TimeoutMs,
  type TimeoutMs as TimeoutMsType,
  // Diagnostic Types
  type DiagnosticStatus,
  type DiagnosticStep,
  type DiagnosticResult,
  type TcpPingOptions,
  type TlsHandshakeOptions,
} from './types.js';

export {
  // Constants
  DEFAULT_TCP_TIMEOUT_MS,
  DEFAULT_TLS_TIMEOUT_MS,
  DEFAULT_INTERNET_CHECK_TIMEOUT_MS,
  INTERNET_CHECK_HOST,
  HTTPS_PORT,
} from './constants.js';

export {
  // Functions
  dnsResolve,
  tcpPing,
  tlsHandshake,
  checkInternet,
} from './diagnostics.js';
