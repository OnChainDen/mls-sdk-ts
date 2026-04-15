import { DenClient, SDKError } from '../src';

describe('DenClient', () => {
  it('should create an instance with valid config', () => {
    const client = new DenClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.com',
    });

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(DenClient);
  });

  it('should accept optional timeout and headers', () => {
    const client = new DenClient({
      apiKey: 'test-api-key',
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      headers: { 'X-Custom': 'value' },
    });

    expect(client).toBeDefined();
  });
});

describe('SDKError', () => {
  it('should include status and code', () => {
    const error = new SDKError('test error', 404, 'NOT_FOUND');

    expect(error.message).toBe('test error');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('SDKError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should include request metadata when provided', () => {
    const error = new SDKError('not found', 404, 'NOT_FOUND', {
      requestId: 'req-abc-123',
      method: 'GET',
      path: '/api/v1/accounts/123',
    });

    expect(error.requestId).toBe('req-abc-123');
    expect(error.method).toBe('GET');
    expect(error.path).toBe('/api/v1/accounts/123');
  });

  it('should have undefined metadata when not provided', () => {
    const error = new SDKError('fail', 500);

    expect(error.requestId).toBeUndefined();
    expect(error.method).toBeUndefined();
    expect(error.path).toBeUndefined();
  });
});
