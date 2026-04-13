// ─── Domain types ──────────────────────────────────────────────

export interface PolicyAccount {
  id: string;
  name: string;
  address: string;
}

export interface PolicyLimitation {
  hours: number;
  initiatorScope: 'PER_ITEM' | 'ALL_ITEMS';
  sourceAccountScope: 'PER_ITEM' | 'ALL_ITEMS';
  destinationScope: 'PER_ITEM' | 'ALL_ITEMS';
}

export type PolicyInitiatorSetting =
  | { type: 'user'; userId: string }
  | { type: 'group'; groupId: string }
  | null;

export type PolicyApproverSetting =
  | { type: 'user'; userId: string }
  | { type: 'group'; groupId: string; threshold: number }
  | null;

export interface TokenTransferCondition {
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string | null;
  tokenLogoUrl: string | null;
  tokenDecimals: number;
  amountThreshold: string | null;
  destinationAddresses: string[];
}

export interface ContractCondition {
  contractAddress: string;
  allowedFunctions: { name: string; selector: string }[];
}

interface PolicyBase {
  id: string;
  name: string;
  description: string | null;
  type: 'AUTO_APPROVAL' | 'MANUAL_APPROVAL';
  networkId: number;
  accounts: PolicyAccount[] | null;
  limitation: PolicyLimitation | null;
  initiatorSetting: PolicyInitiatorSetting;
  approverSetting: PolicyApproverSetting;
  createdAt: Date;
  updatedAt: Date;
}

// Discriminated union on transactionType
export type Policy =
  | (PolicyBase & {
      transactionType: 'TOKEN_TRANSFER';
      tokenTransferCondition: TokenTransferCondition | null;
    })
  | (PolicyBase & {
      transactionType: 'CONTRACT_INTERACTION';
      contractInteractionCondition: ContractCondition[] | null;
    })
  | (PolicyBase & { transactionType: 'ANY' });

// ─── Internal helpers ──────────────────────────────────────────

type RawPolicyBase = Omit<PolicyBase, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type RawPolicy =
  | (RawPolicyBase & {
      transactionType: 'TOKEN_TRANSFER';
      tokenTransferCondition: TokenTransferCondition | null;
    })
  | (RawPolicyBase & {
      transactionType: 'CONTRACT_INTERACTION';
      contractInteractionCondition: ContractCondition[] | null;
    })
  | (RawPolicyBase & { transactionType: 'ANY' });

/**
 * Convert a raw API policy into a domain Policy.
 *
 * The API returns `createdAt` and `updatedAt` as ISO 8601 strings.
 * This function parses them into `Date` instances so consumers get
 * proper date objects instead of opaque strings.
 */
export function parsePolicy(raw: RawPolicy): Policy {
  const base = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    type: raw.type,
    networkId: raw.networkId,
    accounts: raw.accounts,
    limitation: raw.limitation,
    initiatorSetting: raw.initiatorSetting,
    approverSetting: raw.approverSetting,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };

  switch (raw.transactionType) {
    case 'TOKEN_TRANSFER':
      return {
        ...base,
        transactionType: 'TOKEN_TRANSFER',
        tokenTransferCondition: raw.tokenTransferCondition,
      };
    case 'CONTRACT_INTERACTION':
      return {
        ...base,
        transactionType: 'CONTRACT_INTERACTION',
        contractInteractionCondition: raw.contractInteractionCondition,
      };
    case 'ANY':
      return { ...base, transactionType: 'ANY' };
  }
}
