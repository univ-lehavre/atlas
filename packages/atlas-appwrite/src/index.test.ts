import { describe, it, expect } from 'vitest';
import {
  SESSION_COOKIE,
  ADMIN_LABEL,
  createAdminClient,
  createSessionClient,
  AppwriteUserRepository,
  createUserRepository,
} from './index.js';
import { SessionError } from '@univ-lehavre/atlas-errors';

const mockConfig = {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: 'test-project',
  apiKey: 'test-api-key',
};

describe('constants', () => {
  it('should export SESSION_COOKIE', () => {
    expect(SESSION_COOKIE).toBe('session');
  });

  it('should export ADMIN_LABEL', () => {
    expect(ADMIN_LABEL).toBe('admin');
  });
});

describe('createAdminClient', () => {
  it('should throw if endpoint is missing', () => {
    expect(() => createAdminClient({ endpoint: '', projectId: 'proj', apiKey: 'key' })).toThrow(
      'missing endpoint, projectId, or apiKey'
    );
  });

  it('should throw if projectId is missing', () => {
    expect(() =>
      createAdminClient({ endpoint: 'http://test', projectId: '', apiKey: 'key' })
    ).toThrow('missing endpoint, projectId, or apiKey');
  });

  it('should throw if apiKey is missing', () => {
    expect(() =>
      createAdminClient({ endpoint: 'http://test', projectId: 'proj', apiKey: '' })
    ).toThrow('missing endpoint, projectId, or apiKey');
  });

  it('should create admin client with valid config', () => {
    const client = createAdminClient(mockConfig);
    expect(client).toHaveProperty('account');
    expect(client).toHaveProperty('users');
    expect(client).toHaveProperty('databases');
  });
});

describe('createSessionClient', () => {
  const mockCookies = {
    get: (name: string) => (name === SESSION_COOKIE ? 'session-token' : ''),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    set: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    delete: () => {},
    serialize: () => '',
    getAll: () => [],
  };

  const emptyCookies = {
    get: () => '',
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    set: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    delete: () => {},
    serialize: () => '',
    getAll: () => [],
  };

  it('should throw if endpoint is missing', () => {
    expect(() =>
      createSessionClient({ endpoint: '', projectId: 'proj' }, mockCookies as never)
    ).toThrow('missing endpoint or projectId');
  });

  it('should throw SessionError if no session cookie', () => {
    expect(() =>
      createSessionClient(
        { endpoint: mockConfig.endpoint, projectId: mockConfig.projectId },
        emptyCookies as never
      )
    ).toThrow(SessionError);
  });

  it('should create session client with valid config and cookie', () => {
    const client = createSessionClient(
      { endpoint: mockConfig.endpoint, projectId: mockConfig.projectId },
      mockCookies as never
    );
    expect(client).toHaveProperty('account');
  });
});

describe('AppwriteUserRepository', () => {
  it('should be instantiable with config', () => {
    const repo = new AppwriteUserRepository(mockConfig);
    expect(repo).toBeInstanceOf(AppwriteUserRepository);
  });
});

describe('createUserRepository', () => {
  it('should return a UserRepository instance', () => {
    const repo = createUserRepository(mockConfig);
    expect(repo).toBeInstanceOf(AppwriteUserRepository);
    expect(repo).toHaveProperty('getById');
  });
});
