import { describe, it, expect } from 'vitest';
import { mapErrorToResponse } from '$lib/errors/mapper';
import { ApplicationError } from '$lib/errors';

class TestAppError extends ApplicationError {
  constructor() {
    super('test_error', 418, 'I am a teapot', { cause: 'just_testing' });
  }
}

describe('mapErrorToResponse', () => {
  it('maps ApplicationError to structured json with status', async () => {
    const response = mapErrorToResponse(new TestAppError());
    expect(response.status).toBe(418);
    const body = await response.json();
    expect(body.error).toEqual({
      code: 'test_error',
      message: 'I am a teapot',
      cause: 'just_testing',
    });
    expect(body.data).toBeNull();
  });

  it('maps generic Error to 500', async () => {
    const response = mapErrorToResponse(
      new ApplicationError('internal_error', 500, 'Internal error')
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('internal_error');
  });

  it('maps unknown to 500', async () => {
    const response = mapErrorToResponse(undefined);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('internal_error');
  });
});
