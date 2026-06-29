import { describe, it, expect } from 'vitest';
import {
  createInMemoryRefreshCoordinator,
  defaultRefreshCoordinator,
} from './refresh-coordinator.js';

describe('createInMemoryRefreshCoordinator', () => {
  it('defaults to a one-minute throttle window', () => {
    expect(createInMemoryRefreshCoordinator().minIntervalMs).toBe(60_000);
  });

  it('honours a custom throttle window', () => {
    expect(createInMemoryRefreshCoordinator(5000).minIntervalMs).toBe(5000);
  });

  it('starts with no in-flight refresh and a zero last-refresh timestamp', async () => {
    const coordinator = createInMemoryRefreshCoordinator();
    expect(coordinator.getInFlight()).toBeNull();
    await expect(coordinator.getLastRefreshAt()).resolves.toBe(0);
  });

  it('stores and clears the in-flight refresh promise', async () => {
    const coordinator = createInMemoryRefreshCoordinator();
    const promise = Promise.resolve(123);
    coordinator.setInFlight(promise);
    expect(coordinator.getInFlight()).toBe(promise);
    await expect(coordinator.getInFlight()).resolves.toBe(123);
    coordinator.setInFlight(null);
    expect(coordinator.getInFlight()).toBeNull();
  });

  it('remembers the last successful refresh timestamp', async () => {
    const coordinator = createInMemoryRefreshCoordinator();
    await coordinator.setLastRefreshAt(1_700_000_000_000);
    await expect(coordinator.getLastRefreshAt()).resolves.toBe(1_700_000_000_000);
  });

  it('keeps two coordinators independent (no shared module state)', async () => {
    const a = createInMemoryRefreshCoordinator();
    const b = createInMemoryRefreshCoordinator();
    await a.setLastRefreshAt(42);
    await expect(b.getLastRefreshAt()).resolves.toBe(0);
  });
});

describe('defaultRefreshCoordinator', () => {
  it('is a ready-to-use in-memory coordinator with the default window', () => {
    expect(defaultRefreshCoordinator.minIntervalMs).toBe(60_000);
  });
});
