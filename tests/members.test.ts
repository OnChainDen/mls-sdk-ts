import { DenClient, SDKError } from '../src';

const fetchSpy = jest.spyOn(globalThis, 'fetch');

afterEach(() => {
  fetchSpy.mockReset();
});

describe('DenClient members', () => {
  const client = new DenClient({
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
  });

  describe('getMemberRegistrationPayload', () => {
    it('should be callable', () => {
      expect(client.getMemberRegistrationPayload).toBeDefined();
      expect(typeof client.getMemberRegistrationPayload).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(
        client.getMemberRegistrationPayload(
          '0x1234567890123456789012345678901234567890'
        )
      ).rejects.toThrow(SDKError);
    });

    it('should return the registration payload on success', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { messageToSign: 'Sign this message' } }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const { data: payload } = await client.getMemberRegistrationPayload(
        '0x1234567890123456789012345678901234567890'
      );
      expect(payload.messageToSign).toBe('Sign this message');
    });

    it('should fail when payload response is not wrapped in data', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ messageToSign: 'Sign this message' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      await expect(
        client.getMemberRegistrationPayload(
          '0x1234567890123456789012345678901234567890'
        )
      ).rejects.toThrow(SDKError);
    });
  });

  describe('submitRegistration', () => {
    it('should be callable', () => {
      expect(client.submitRegistration).toBeDefined();
      expect(typeof client.submitRegistration).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(
        client.submitRegistration(
          '0x1234567890123456789012345678901234567890',
          '0xabcdef'
        )
      ).rejects.toThrow(SDKError);
    });

    it('should return the registration result on success', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              walletAddress: '0x1234567890123456789012345678901234567890',
              registered: true,
              registeredAt: now,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const { data: result } = await client.submitRegistration(
        '0x1234567890123456789012345678901234567890',
        '0xabcdef'
      );
      expect(result.registered).toBe(true);
      expect(result.registeredAt).toBeInstanceOf(Date);
    });

    it('should fail when registration response is not wrapped in data', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            walletAddress: '0x1234567890123456789012345678901234567890',
            registered: true,
            registeredAt: now,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      await expect(
        client.submitRegistration(
          '0x1234567890123456789012345678901234567890',
          '0xabcdef'
        )
      ).rejects.toThrow(SDKError);
    });
  });
});
