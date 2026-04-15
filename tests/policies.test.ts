import { DenClient, SDKError } from '../src';

const fetchSpy = jest.spyOn(globalThis, 'fetch');

afterEach(() => {
  fetchSpy.mockReset();
});

describe('DenClient policies', () => {
  const client = new DenClient({
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
  });

  describe('getPolicies', () => {
    it('should be callable', () => {
      expect(client.getPolicies).toBeDefined();
      expect(typeof client.getPolicies).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(client.getPolicies()).rejects.toThrow(SDKError);
    });

    it('should return parsed policies on success', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'pol-1',
                name: 'Token Transfer Policy',
                description: 'Auto-approve small transfers',
                type: 'AUTO_APPROVAL',
                networkId: 1,
                accounts: [{ id: 'acc-1', name: 'Main', address: '0xabc' }],
                limitation: {
                  hours: 24,
                  initiatorScope: 'PER_ITEM',
                  sourceAccountScope: 'PER_ITEM',
                  destinationScope: 'PER_ITEM',
                },
                initiatorSetting: { type: 'user', userId: 'user-1' },
                approverSetting: {
                  type: 'group',
                  groupId: 'grp-1',
                  threshold: 2,
                },
                transactionType: 'TOKEN_TRANSFER',
                tokenTransferCondition: {
                  tokenAddress: '0xtoken',
                  tokenSymbol: 'USDC',
                  tokenName: 'USD Coin',
                  tokenLogoUrl: 'https://example.com/usdc.png',
                  tokenDecimals: 6,
                  amountThreshold: '1000',
                  destinationAddresses: ['0xdest1'],
                },
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'pol-2',
                name: 'Contract Interaction Policy',
                description: null,
                type: 'MANUAL_APPROVAL',
                networkId: 1,
                accounts: null,
                limitation: null,
                initiatorSetting: null,
                approverSetting: null,
                transactionType: 'CONTRACT_INTERACTION',
                contractInteractionCondition: [
                  {
                    contractAddress: '0xcontract',
                    allowedFunctions: [
                      { name: 'transfer', selector: '0xa9059cbb' },
                    ],
                  },
                ],
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'pol-3',
                name: 'Any Transaction Policy',
                description: null,
                type: 'AUTO_APPROVAL',
                networkId: 1,
                accounts: null,
                limitation: null,
                initiatorSetting: null,
                approverSetting: null,
                transactionType: 'ANY',
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

      const { data } = await client.getPolicies();
      expect(data).toHaveLength(3);

      const first = data[0];
      expect(first).toBeDefined();
      expect(first?.id).toBe('pol-1');
      expect(first?.createdAt).toBeInstanceOf(Date);
      expect(first?.updatedAt).toBeInstanceOf(Date);
    });

    it('should preserve discriminated union fields', async () => {
      const now = '2025-01-01T00:00:00.000Z';
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: 'pol-1',
                name: 'Token Policy',
                description: null,
                type: 'AUTO_APPROVAL',
                networkId: 1,
                accounts: null,
                limitation: null,
                initiatorSetting: null,
                approverSetting: null,
                transactionType: 'TOKEN_TRANSFER',
                tokenTransferCondition: {
                  tokenAddress: '0xtoken',
                  tokenSymbol: 'USDC',
                  tokenName: 'USD Coin',
                  tokenLogoUrl: null,
                  tokenDecimals: 6,
                  amountThreshold: null,
                  destinationAddresses: [],
                },
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'pol-2',
                name: 'Contract Policy',
                description: null,
                type: 'MANUAL_APPROVAL',
                networkId: 1,
                accounts: null,
                limitation: null,
                initiatorSetting: null,
                approverSetting: null,
                transactionType: 'CONTRACT_INTERACTION',
                contractInteractionCondition: [
                  {
                    contractAddress: '0xcontract',
                    allowedFunctions: [
                      { name: 'transfer', selector: '0xa9059cbb' },
                    ],
                  },
                ],
                createdAt: now,
                updatedAt: now,
              },
              {
                id: 'pol-3',
                name: 'Any Policy',
                description: null,
                type: 'AUTO_APPROVAL',
                networkId: 1,
                accounts: null,
                limitation: null,
                initiatorSetting: null,
                approverSetting: null,
                transactionType: 'ANY',
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

      const { data } = await client.getPolicies();

      const tokenPolicy = data.find(
        (p) => p.transactionType === 'TOKEN_TRANSFER'
      );
      if (!tokenPolicy || tokenPolicy.transactionType !== 'TOKEN_TRANSFER') {
        throw new Error('Expected TOKEN_TRANSFER policy');
      }
      expect(tokenPolicy.tokenTransferCondition?.tokenSymbol).toBe('USDC');

      const contractPolicy = data.find(
        (p) => p.transactionType === 'CONTRACT_INTERACTION'
      );
      if (
        !contractPolicy ||
        contractPolicy.transactionType !== 'CONTRACT_INTERACTION'
      ) {
        throw new Error('Expected CONTRACT_INTERACTION policy');
      }
      expect(contractPolicy.contractInteractionCondition).toHaveLength(1);

      const anyPolicy = data.find((p) => p.transactionType === 'ANY');
      expect(anyPolicy).toBeDefined();
      expect(anyPolicy?.transactionType).toBe('ANY');
    });
  });
});
