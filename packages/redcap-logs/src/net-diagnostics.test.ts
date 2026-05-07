import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

const noop = (): void => {
  /* test stub */
};

// eslint-disable-next-line unicorn/prefer-event-target -- mirrors node:net Socket's EventEmitter API
class FakeSocket extends EventEmitter {
  setTimeout = vi.fn();
  connect = vi.fn();
  destroy = vi.fn();
}

// eslint-disable-next-line unicorn/prefer-event-target -- mirrors node:tls TLSSocket's EventEmitter API
class FakeTlsSocket extends EventEmitter {
  authorized = true;
  authorizationError: string | null = null;
  setTimeout = vi.fn();
  destroy = vi.fn();
  getPeerCertificate = vi.fn();
  getCipher = vi.fn();
  getProtocol = vi.fn();
}

const refs = vi.hoisted(() => ({
  tcp: { current: null } as unknown as { current: FakeSocket },
  tls: { current: null } as unknown as { current: FakeTlsSocket },
  lookup: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: refs.lookup,
}));

vi.mock("node:net", () => ({
  default: {
    Socket: function MockSocket() {
      return refs.tcp.current;
    },
  },
}));

vi.mock("node:tls", () => ({
  default: {
    connect: () => refs.tls.current,
  },
}));

import { diagnoseEndpointNetwork } from "./net-diagnostics.js";

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  refs.tcp.current = new FakeSocket();
  refs.tls.current = new FakeTlsSocket();
  // Prevent EventEmitter from throwing on unhandled 'error' events when
  // tests emit before listeners are attached or in addition to other listeners.
  refs.tcp.current.on("error", noop);
  refs.tls.current.on("error", noop);
  refs.lookup.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("diagnoseEndpointNetwork", () => {
  it("returns parseError on invalid URL", async () => {
    const result = await diagnoseEndpointNetwork("not a url");
    expect(result.parseError).toBeDefined();
    expect(result.target).toBeUndefined();
  });

  it("performs DNS, TCP and TLS probes for an https URL", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const tls = refs.tls.current;
    tls.getPeerCertificate.mockReturnValue({
      subject: { CN: "redcap.example.org" },
      issuer: { CN: "Some CA" },
      valid_to: "2030-01-01",
      fingerprint256: "AA:BB:CC",
    });
    tls.getCipher.mockReturnValue({ name: "TLS_AES_256_GCM_SHA384" });
    tls.getProtocol.mockReturnValue("TLSv1.3");

    const promise = diagnoseEndpointNetwork("https://redcap.example.org/api/");

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("secureConnect");

    const result = await promise;

    expect(result.target).toEqual({
      host: "redcap.example.org",
      port: 443,
      protocol: "https:",
    });
    expect(result.dns).toEqual({ ok: true, address: "1.2.3.4", family: 4 });
    expect(result.tcp?.ok).toBe(true);
    expect(result.tls?.ok).toBe(true);
    expect(result.tls?.protocol).toBe("TLSv1.3");
    expect(result.tls?.cipher).toBe("TLS_AES_256_GCM_SHA384");
    expect(result.tls?.certSubjectCN).toBe("redcap.example.org");
    expect(result.tls?.certIssuerCN).toBe("Some CA");
  });

  it("uses an explicit port from the URL", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });
    const tls = refs.tls.current;
    tls.getPeerCertificate.mockReturnValue({
      subject: {},
      issuer: {},
      valid_to: "",
      fingerprint256: "",
    });
    tls.getCipher.mockReturnValue({ name: "X" });
    tls.getProtocol.mockReturnValue("TLSv1.2");

    const promise = diagnoseEndpointNetwork(
      "https://redcap.example.org:8443/api/",
    );

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("secureConnect");

    const result = await promise;
    expect(result.target?.port).toBe(8443);
    expect(result.tls?.certSubjectCN).toBeUndefined();
    expect(result.tls?.certIssuerCN).toBeUndefined();
  });

  it("normalizes array CN values from peer certificates", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });
    const tls = refs.tls.current;
    tls.getPeerCertificate.mockReturnValue({
      subject: { CN: ["a.example.org", "b.example.org"] },
      issuer: { CN: ["CA-A", "CA-B"] },
      valid_to: "",
      fingerprint256: "",
    });
    tls.getCipher.mockReturnValue({ name: "X" });
    tls.getProtocol.mockReturnValue("TLSv1.3");

    const promise = diagnoseEndpointNetwork("https://redcap.example.org/");
    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("secureConnect");

    const result = await promise;
    expect(result.tls?.certSubjectCN).toBe("a.example.org, b.example.org");
    expect(result.tls?.certIssuerCN).toBe("CA-A, CA-B");
  });

  it("skips TLS probe for non-https URLs and uses port 80 by default", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("http://redcap.example.org/api/");

    await flush();
    refs.tcp.current.emit("connect");

    const result = await promise;
    expect(result.target).toEqual({
      host: "redcap.example.org",
      port: 80,
      protocol: "http:",
    });
    expect(result.tls).toEqual({
      ok: false,
      skipped: true,
      reason: "protocol_non_https",
    });
  });

  it("reports DNS failure but still attempts TCP/TLS", async () => {
    refs.lookup.mockRejectedValue(new Error("ENOTFOUND"));

    const tls = refs.tls.current;
    tls.getPeerCertificate.mockReturnValue({
      subject: {},
      issuer: {},
      valid_to: "",
      fingerprint256: "",
    });
    tls.getCipher.mockReturnValue({ name: "X" });
    tls.getProtocol.mockReturnValue("TLSv1.3");

    const promise = diagnoseEndpointNetwork("https://nope.example.org/");

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("secureConnect");

    const result = await promise;
    expect(result.dns?.ok).toBe(false);
    expect(result.dns?.error).toBe("ENOTFOUND");
  });

  it("reports DNS failure with non-Error rejection", async () => {
    refs.lookup.mockRejectedValue("dns broke");

    const tls = refs.tls.current;
    tls.getPeerCertificate.mockReturnValue({
      subject: {},
      issuer: {},
      valid_to: "",
      fingerprint256: "",
    });
    tls.getCipher.mockReturnValue({ name: "X" });
    tls.getProtocol.mockReturnValue("TLSv1.3");

    const promise = diagnoseEndpointNetwork("https://x.example.org/");

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("secureConnect");

    const result = await promise;
    expect(result.dns?.error).toBe("dns broke");
  });

  it("reports a TCP timeout", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("http://redcap.example.org/");

    await flush();
    refs.tcp.current.emit("timeout");

    const result = await promise;
    expect(result.tcp?.ok).toBe(false);
    expect(result.tcp?.error).toMatch(/^timeout_\d+ms$/);
  });

  it("surfaces a TCP error as a parseError on the diagnostics result", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("http://redcap.example.org/");

    await flush();
    refs.tcp.current.emit("error", new Error("ECONNREFUSED"));

    const result = await promise;
    expect(result.parseError).toBe("ECONNREFUSED");
  });

  it("reports a TLS timeout", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("https://redcap.example.org/");

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("timeout");

    const result = await promise;
    expect(result.tls?.ok).toBe(false);
    expect(result.tls?.error).toMatch(/^timeout_\d+ms$/);
  });

  it("surfaces a TLS error as a parseError on the diagnostics result", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("https://redcap.example.org/");

    await flush();
    refs.tcp.current.emit("connect");
    await flush();
    refs.tls.current.emit("error", new Error("Handshake failed"));

    const result = await promise;
    expect(result.parseError).toBe("Handshake failed");
  });

  it("converts non-Error rejection values to a string in parseError", async () => {
    refs.lookup.mockResolvedValue({ address: "1.2.3.4", family: 4 });

    const promise = diagnoseEndpointNetwork("http://redcap.example.org/");

    await flush();
    refs.tcp.current.emit("error", "raw string error");

    const result = await promise;
    expect(result.parseError).toBe("raw string error");
  });
});
