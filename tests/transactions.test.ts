import { DenClient, SDKError } from '../src';
import { parseTransaction } from '../src/transactions/types';

const fetchSpy = jest.spyOn(globalThis, 'fetch');

afterEach(() => {
  fetchSpy.mockReset();
});

function makeRawTransaction() {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'tx-1',
    accountId: 'acc-1',
    type: 'TOKEN_TRANSFER' as const,
    policy: {
      id: 'pol-1',
      threshold: 2,
    },
    signatureData: {
      status: 'approvalReady' as const,
      approvePayload: '0x02',
      rejectPayload: '0x03',
    },
    executionStatus: null,
    approvals: [],
    rejections: [],
    createdAt: now,
    expiresAt: now,
    data: {
      destination: '0xabc',
      asset: {
        id: 'asset-1',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        logoUrl: null,
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
      rawAmount: '1',
      displayAmount: '1',
      networkId: 1,
    },
  };
}

function makeRawPendingInitiatorTransaction() {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'tx-3',
    accountId: 'acc-1',
    type: 'TOKEN_TRANSFER' as const,
    policy: {
      id: 'pol-1',
      threshold: 2,
    },
    signatureData: {
      status: 'pendingInitiatorSignature' as const,
      initiatorPayload: '0x01',
    },
    executionStatus: null,
    approvals: [],
    rejections: [],
    createdAt: now,
    expiresAt: now,
    data: {
      destination: '0xabc',
      asset: {
        id: 'asset-1',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        logoUrl: null,
        tokenAddress: '0x0000000000000000000000000000000000000000',
      },
      rawAmount: '1',
      displayAmount: '1',
      networkId: 1,
    },
  };
}

function makeRawContractInteractionTransaction() {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'tx-2',
    accountId: 'acc-1',
    type: 'CONTRACT_INTERACTION' as const,
    policy: {
      id: 'pol-1',
      threshold: 2,
    },
    signatureData: {
      status: 'pendingInitiatorSignature' as const,
      initiatorPayload: '0x01',
    },
    executionStatus: 'processing' as const,
    approvals: [],
    rejections: [],
    createdAt: now,
    expiresAt: now,
    data: {
      toAddress: '0xdef',
      calldata: '0xa9059cbb',
      functionName: 'transfer',
      functionParameters: [
        {
          name: 'to',
          type: 'address',
          value: '0xabc',
        },
      ],
      networkId: 1,
      value: '0',
    },
  };
}

function mockJsonResponse(body: unknown) {
  fetchSpy.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('DenClient transactions', () => {
  const client = new DenClient({
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
  });

  describe('getTransactions', () => {
    it('should be callable', () => {
      expect(client.getTransactions).toBeDefined();
      expect(typeof client.getTransactions).toBe('function');
    });

    it('should throw SDKError on network failure', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(client.getTransactions()).rejects.toThrow(SDKError);
    });

    it("should request queued transactions when status is 'queued'", async () => {
      mockJsonResponse({ data: [makeRawTransaction()] });

      const response = await client.getTransactions({ status: 'queued' });

      expect(response.data).toHaveLength(1);
      expect(response.data[0]?.createdAt).toBeInstanceOf(Date);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions?status=queued',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it("should request executed transactions when status is 'executed'", async () => {
      mockJsonResponse({ data: [makeRawTransaction()] });

      const response = await client.getTransactions({ status: 'executed' });

      expect(response.data).toHaveLength(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions?status=executed',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should include accountId when provided', async () => {
      mockJsonResponse({ data: [makeRawTransaction()] });

      const response = await client.getTransactions({ accountId: 'acc-1' });

      expect(response.data).toHaveLength(1);
      expect(response.data[0]?.createdAt).toBeInstanceOf(Date);
      expect(response.data[0]?.policy.threshold).toBe(2);
      expect(response.data[0]?.signatureData.status).toBe('approvalReady');
      if (response.data[0]?.signatureData.status !== 'approvalReady') {
        throw new Error('Expected approvalReady signature data');
      }
      expect(response.data[0].signatureData.approvePayload).toBe('0x02');
      expect(response.data[0].signatureData.rejectPayload).toBe('0x03');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions?accountId=acc-1',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should request all transactions when status is omitted', async () => {
      mockJsonResponse({ data: [makeRawTransaction()] });

      const response = await client.getTransactions();

      expect(response.data).toHaveLength(1);
      expect(response.data[0]?.policy.threshold).toBe(2);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('getTransaction', () => {
    it('should request by-id path and parse dates', async () => {
      mockJsonResponse({ data: makeRawTransaction() });

      const response = await client.getTransaction('tx/1');

      expect(response.data.id).toBe('tx-1');
      expect(response.data.createdAt).toBeInstanceOf(Date);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions/tx%2F1',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('createTransaction', () => {
    it('should post to top-level transactions path', async () => {
      mockJsonResponse({ data: makeRawPendingInitiatorTransaction() });

      const input = {
        accountId: 'acc-1',
        initiatorWalletAddress: '0xabc',
        networkId: 1,
        policyId: 'pol-1',
        description: 'test',
        to: '0xdef',
        value: '0',
        data: '0x',
      };

      const response = await client.createTransaction(input);

      expect(response.data.signatureData.initiatorPayload).toBe('0x01');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe('signTransaction', () => {
    it('should pass execute boolean through unchanged', async () => {
      mockJsonResponse({ data: makeRawTransaction() });

      const input = {
        type: 'approve' as const,
        signature: '0xdeadbeef',
        execute: true,
      };

      await client.signTransaction('tx-1', input);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions/tx-1/signatures',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe('executeTransaction', () => {
    it('should post execute type to execute endpoint', async () => {
      mockJsonResponse({ data: makeRawTransaction() });

      const input = {
        type: 'reject' as const,
      };
      await client.executeTransaction('tx-1', input);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/transactions/tx-1/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(input),
        })
      );
    });
  });

  describe('parseTransaction', () => {
    it('should preserve contract interaction function metadata', () => {
      const parsed = parseTransaction(makeRawContractInteractionTransaction());

      expect(parsed.type).toBe('CONTRACT_INTERACTION');
      if (parsed.type !== 'CONTRACT_INTERACTION') {
        throw new Error('Expected contract interaction transaction');
      }

      expect(parsed.data.functionName).toBe('transfer');
      expect(parsed.data.functionParameters).toEqual([
        {
          name: 'to',
          type: 'address',
          value: '0xabc',
        },
      ]);
    });
  });
});
