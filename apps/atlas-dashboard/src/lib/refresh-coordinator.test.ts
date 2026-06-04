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

  it('starts with no in-flight refresh and a zero last-refresh timestamp', () => {
    const coordinator = createInMemoryRefreshCoordinator();
    expect(coordinator.getInFlight()).toBeNull();
    expect(coordinator.getLastRefreshAt()).toBe(0);
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

  it('remembers the last successful refresh timestamp', () => {
    const coordinator = createInMemoryRefreshCoordinator();
    coordinator.setLastRefreshAt(1_700_000_000_000);
    expect(coordinator.getLastRefreshAt()).toBe(1_700_000_000_000);
  });

  it('keeps two coordinators independent (no shared module state)', () => {
    const a = createInMemoryRefreshCoordinator();
    const b = createInMemoryRefreshCoordinator();
    a.setLastRefreshAt(42);
    expect(b.getLastRefreshAt()).toBe(0);
  });
});

describe('defaultRefreshCoordinator', () => {
  it('is a ready-to-use in-memory coordinator with the default window', () => {
    expect(defaultRefreshCoordinator.minIntervalMs).toBe(60_000);
  });
});
