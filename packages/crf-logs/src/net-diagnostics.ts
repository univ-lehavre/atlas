import { lookup } from "node:dns/promises";
import { once } from "node:events";
import net from "node:net";
import tls from "node:tls";

export interface TcpProbeResult {
  readonly ok: boolean;
  readonly durationMs?: number;
  readonly error?: string;
}

export interface TlsProbeResult {
  readonly ok: boolean;
  readonly durationMs?: number;
  readonly authorized?: boolean;
  readonly authorizationError?: string | null;
  readonly protocol?: string | null;
  readonly cipher?: string;
  readonly certSubjectCN?: string;
  readonly certIssuerCN?: string;
  readonly certValidTo?: string;
  readonly certFingerprint256?: string;
  readonly servername?: string;
  readonly error?: string;
  readonly skipped?: boolean;
  readonly reason?: string;
}

export interface EndpointNetworkDiagnostics {
  readonly target?: { host: string; port: number; protocol: string };
  readonly dns?: {
    ok: boolean;
    address?: string;
    family?: number;
    error?: string;
  };
  readonly tcp?: TcpProbeResult;
  readonly tls?: TlsProbeResult;
  readonly parseError?: string;
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const normalizeCertCn = (
  value: string | string[] | undefined,
): string | undefined =>
  value === undefined
    ? undefined
    : Array.isArray(value)
      ? value.join(", ")
      : value;

const destroySocket = (socket: net.Socket | tls.TLSSocket): undefined => (
  socket.destroy(),
  undefined
);

const createTcpSocket = (
  host: string,
  port: number,
  timeoutMs: number,
): net.Socket => {
  const socket = new net.Socket();
  return (socket.setTimeout(timeoutMs), socket.connect(port, host), socket);
};

const createTlsSocket = (
  host: string,
  port: number,
  timeoutMs: number,
): tls.TLSSocket => {
  const socket = tls.connect({
    host,
    port,
    servername: host,
    rejectUnauthorized: true,
  });
  return (socket.setTimeout(timeoutMs), socket);
};

const probeTcp = (
  host: string,
  port: number,
  timeoutMs = 3000,
): Promise<TcpProbeResult> => {
  const startedAt = Date.now();
  const socket = createTcpSocket(host, port, timeoutMs);

  return Promise.race<TcpProbeResult>([
    once(socket, "connect").then(
      (): TcpProbeResult => ({ ok: true, durationMs: Date.now() - startedAt }),
    ),
    once(socket, "timeout").then(
      (): TcpProbeResult => ({
        ok: false,
        error: `timeout_${String(timeoutMs)}ms`,
      }),
    ),
    once(socket, "error").then(
      (values: unknown[]): TcpProbeResult => ({
        ok: false,
        error: toErrorMessage(values[0]),
      }),
    ),
  ]).finally((): undefined => destroySocket(socket));
};

const toTlsSuccessResult = (
  socket: tls.TLSSocket,
  host: string,
  startedAt: number,
): TlsProbeResult => {
  const cert = socket.getPeerCertificate();
  const cipher = socket.getCipher();
  const subjectCN = normalizeCertCn(cert.subject.CN);
  const issuerCN = normalizeCertCn(cert.issuer.CN);
  const certValidTo = cert.valid_to;
  const certFingerprint256 = cert.fingerprint256;

  return {
    ok: true,
    durationMs: Date.now() - startedAt,
    authorized: socket.authorized,
    authorizationError: String(socket.authorizationError),
    protocol: socket.getProtocol(),
    servername: host,
    cipher: cipher.name,
    certSubjectCN: subjectCN,
    certIssuerCN: issuerCN,
    certValidTo,
    certFingerprint256,
  };
};

const probeTls = (
  host: string,
  port: number,
  timeoutMs = 4000,
): Promise<TlsProbeResult> => {
  const startedAt = Date.now();
  const socket = createTlsSocket(host, port, timeoutMs);

  return Promise.race<TlsProbeResult>([
    once(socket, "secureConnect").then(
      (): TlsProbeResult => toTlsSuccessResult(socket, host, startedAt),
    ),
    once(socket, "timeout").then(
      (): TlsProbeResult => ({
        ok: false,
        error: `timeout_${String(timeoutMs)}ms`,
      }),
    ),
    once(socket, "error").then(
      (values: unknown[]): TlsProbeResult => ({
        ok: false,
        error: toErrorMessage(values[0]),
        servername: host,
      }),
    ),
  ]).finally((): undefined => destroySocket(socket));
};

const parseEndpointUrl = (endpointUrl: string): Promise<URL> =>
  Promise.resolve(endpointUrl).then((url: string): URL => new URL(url));

export const diagnoseEndpointNetwork = async (
  endpointUrl: string,
): Promise<EndpointNetworkDiagnostics> =>
  parseEndpointUrl(endpointUrl)
    .then((parsed: URL): Promise<EndpointNetworkDiagnostics> => {
      const host = parsed.hostname;
      const protocol = parsed.protocol;
      const parsedPort =
        parsed.port.length > 0 ? Number.parseInt(parsed.port, 10) : Number.NaN;
      const defaultPort = protocol === "https:" ? 443 : 80;
      const port = Number.isNaN(parsedPort) ? defaultPort : parsedPort;

      return lookup(host)
        .then((result): { ok: true; address: string; family: number } => ({
          ok: true,
          address: result.address,
          family: result.family,
        }))
        .catch((error: unknown): { ok: false; error: string } => ({
          ok: false,
          error: toErrorMessage(error),
        }))
        .then((dns) =>
          probeTcp(host, port).then((tcp) =>
            (protocol === "https:"
              ? probeTls(host, port)
              : Promise.resolve({
                  ok: false,
                  skipped: true,
                  reason: "protocol_non_https" as const,
                })
            ).then((tlsProbe) => ({
              target: { host, port, protocol },
              dns,
              tcp,
              tls: tlsProbe,
            })),
          ),
        );
    })
    .catch(
      (error: unknown): EndpointNetworkDiagnostics => ({
        parseError: toErrorMessage(error),
      }),
    );
