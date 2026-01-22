/**
 * @fileoverview Tests for branded types.
 */

import { describe, expect, it } from 'vitest';

import { IpAddress, Port, TimeoutMs } from './brands.js';

describe('brands', () => {
  describe('TimeoutMs', () => {
    it('should create valid TimeoutMs', () => {
      const timeout = TimeoutMs(5000);
      expect(timeout).toBe(5000);
    });

    it('should reject invalid TimeoutMs (negative)', () => {
      expect(() => TimeoutMs(-1)).toThrow();
    });

    it('should reject invalid TimeoutMs (too large)', () => {
      expect(() => TimeoutMs(700_000)).toThrow();
    });

    it('should accept boundary value 0', () => {
      const timeout = TimeoutMs(0);
      expect(timeout).toBe(0);
    });

    it('should accept boundary value 600000', () => {
      const timeout = TimeoutMs(600_000);
      expect(timeout).toBe(600_000);
    });
  });

  describe('Port', () => {
    it('should create valid Port', () => {
      const port = Port(443);
      expect(port).toBe(443);
    });

    it('should reject invalid Port (0)', () => {
      expect(() => Port(0)).toThrow();
    });

    it('should reject invalid Port (negative)', () => {
      expect(() => Port(-1)).toThrow();
    });

    it('should reject invalid Port (too large)', () => {
      expect(() => Port(70_000)).toThrow();
    });

    it('should accept boundary value 1', () => {
      const port = Port(1);
      expect(port).toBe(1);
    });

    it('should accept boundary value 65535', () => {
      const port = Port(65_535);
      expect(port).toBe(65_535);
    });
  });

  describe('IpAddress', () => {
    it('should create valid IPv4 IpAddress', () => {
      const ip = IpAddress('192.168.1.1');
      expect(ip).toBe('192.168.1.1');
    });

    it('should create valid IPv4 with zeros', () => {
      const ip = IpAddress('0.0.0.0');
      expect(ip).toBe('0.0.0.0');
    });

    it('should create valid IPv4 with max values', () => {
      const ip = IpAddress('255.255.255.255');
      expect(ip).toBe('255.255.255.255');
    });

    it('should create valid IPv6 IpAddress (::1)', () => {
      const ip = IpAddress('::1');
      expect(ip).toBe('::1');
    });

    it('should create valid IPv6 IpAddress (::)', () => {
      const ip = IpAddress('::');
      expect(ip).toBe('::');
    });

    it('should reject invalid IpAddress (text)', () => {
      expect(() => IpAddress('not-an-ip')).toThrow();
    });

    it('should reject invalid IPv4 (out of range)', () => {
      expect(() => IpAddress('256.1.1.1')).toThrow();
    });

    it('should reject invalid IPv4 (too few octets)', () => {
      expect(() => IpAddress('192.168.1')).toThrow();
    });

    it('should reject invalid IPv4 (too many octets)', () => {
      expect(() => IpAddress('192.168.1.1.1')).toThrow();
    });
  });
});
