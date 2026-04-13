import { DenClient, SDKError } from '../src';

const fetchSpy = jest.spyOn(globalThis, 'fetch');

afterEach(() => {
  fetchSpy.mockReset();
});

describe('DenClient accounts', () => {
  const client = new DenClient({
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
  });

  describe('getAccounts', () => {
    it('should be callable', () => {
      expect(client.getAccounts).toBeDefined();
      expect(typeof client.getAccounts).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(client.getAccounts()).rejects.toThrow(SDKError);
    });

    it('should return parsed accounts on success', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'acc-1',
                name: 'Test Account',
                address: '0xabc',
                networks: [{ id: 1, name: 'ethereum' }],
                createdAt: now,
                updatedAt: now,
              },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const { data } = await client.getAccounts();
      expect(data).toHaveLength(1);
      const first = data[0];
      expect(first).toBeDefined();
      expect(first?.id).toBe('acc-1');
      expect(first?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getAccount', () => {
    it('should be callable', () => {
      expect(client.getAccount).toBeDefined();
      expect(typeof client.getAccount).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(client.getAccount('some-id')).rejects.toThrow(SDKError);
    });

    it('should return a parsed account on success', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: 'acc-1',
              name: 'Test Account',
              address: '0xabc',
              networks: [],
              createdAt: now,
              updatedAt: now,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

      const { data: account } = await client.getAccount('acc-1');
      expect(account.id).toBe('acc-1');
      expect(account.createdAt).toBeInstanceOf(Date);
    });
  });
});
