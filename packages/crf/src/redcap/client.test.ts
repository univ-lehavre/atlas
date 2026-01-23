import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Effect } from 'effect';
import { createRedcapClient, RedcapUrl, RedcapToken } from './index.js';

/**
 * Integration tests for REDCap client against Prism mock server.
 *
 * To run these tests:
 * 1. Start Prism: pnpm mock:redcap
 * 2. Run tests: pnpm test
 */
describe('REDCap Client', () => {
  const PRISM_URL = 'http://localhost:8080/api';
  const VALID_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  describe('Branded Types', () => {
    it('should accept valid RedcapToken', () => {
      expect(() => RedcapToken(VALID_TOKEN)).not.toThrow();
    });

    it('should reject invalid RedcapToken (lowercase)', () => {
      expect(() => RedcapToken('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow();
    });

    it('should reject invalid RedcapToken (wrong length)', () => {
      expect(() => RedcapToken('AABBCCDD')).toThrow();
    });

    it('should accept valid RedcapUrl', () => {
      expect(() => RedcapUrl('https://redcap.example.com/api/')).not.toThrow();
    });
  });

  describe('Client Creation', () => {
    it('should create client with valid config', () => {
      const client = createRedcapClient({
        url: RedcapUrl(PRISM_URL),
        token: RedcapToken(VALID_TOKEN),
      });

      expect(client).toBeDefined();
      expect(client.getVersion).toBeDefined();
      expect(client.getProjectInfo).toBeDefined();
      expect(client.exportRecords).toBeDefined();
    });
  });

  describe('API Methods (requires Prism running)', () => {
    const client = createRedcapClient({
      url: RedcapUrl(PRISM_URL),
      token: RedcapToken(VALID_TOKEN),
    });

    it.skip('should get version', async () => {
      const version = await Effect.runPromise(client.getVersion());
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });

    it.skip('should get project info', async () => {
      const info = await Effect.runPromise(client.getProjectInfo());
      expect(info).toBeDefined();
      expect(info.project_id).toBeDefined();
    });

    it.skip('should get instruments', async () => {
      const instruments = await Effect.runPromise(client.getInstruments());
      expect(instruments).toBeDefined();
      expect(Array.isArray(instruments)).toBe(true);
    });
  });
});
