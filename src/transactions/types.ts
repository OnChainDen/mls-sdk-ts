export type ExecutionStatus =
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'blocked'
  | null;

export interface MemberSummary {
  id: string;
  name: string;
  type: 'user' | 'api';
  walletAddress: string;
}

export interface PolicySummary {
  id: string;
  threshold: number;
}

export type SignatureStatus =
  | 'pendingInitiatorSignature'
  | 'pendingReviewSignatures'
  | 'approvalReady'
  | 'rejectionReady'
  | 'approvalAndRejectionReady'
  | 'expired';

type PendingInitiatorSignatureData = {
  status: Extract<SignatureStatus, 'pendingInitiatorSignature'>;
  initiatorPayload: string;
};

type ReviewSignatureStatus = Extract<
  SignatureStatus,
  | 'pendingReviewSignatures'
  | 'approvalReady'
  | 'rejectionReady'
  | 'approvalAndRejectionReady'
>;

type ReviewSignatureData = {
  status: ReviewSignatureStatus;
  approvePayload: string;
  rejectPayload: string;
};

type ExpiredSignatureData = {
  status: Extract<SignatureStatus, 'expired'>;
};

export type SignatureData =
  | PendingInitiatorSignatureData
  | ReviewSignatureData
  | ExpiredSignatureData;

interface TokenTransferData {
  destination: string;
  asset: {
    id: string;
    symbol: string;
    name: string | null;
    decimals: number;
    logoUrl: string | null;
    tokenAddress: string;
  };
  rawAmount: string;
  displayAmount: string;
  networkId: number;
}

interface ContractFunctionParameter {
  name: string;
  type: string;
  value: string;
}

interface ContractInteractionData {
  toAddress: string;
  calldata: string;
  functionName?: string;
  functionParameters?: ContractFunctionParameter[];
  networkId: number;
  value: string;
}

interface BaseTransaction {
  id: string;
  accountId: string;
  policy: PolicySummary;
  signatureData: SignatureData;
  executionStatus: ExecutionStatus;
  approvals: MemberSummary[];
  rejections: MemberSummary[];
  createdAt: Date;
  expiresAt: Date;
}

export interface TokenTransferTransaction extends BaseTransaction {
  type: 'TOKEN_TRANSFER';
  data: TokenTransferData;
}

export interface ContractInteractionTransaction extends BaseTransaction {
  type: 'CONTRACT_INTERACTION';
  data: ContractInteractionData;
}

export type Transaction =
  | TokenTransferTransaction
  | ContractInteractionTransaction;

export type PendingInitiatorTransaction =
  | (Omit<TokenTransferTransaction, 'signatureData'> & {
      signatureData: Extract<
        SignatureData,
        { status: 'pendingInitiatorSignature' }
      >;
    })
  | (Omit<ContractInteractionTransaction, 'signatureData'> & {
      signatureData: Extract<
        SignatureData,
        { status: 'pendingInitiatorSignature' }
      >;
    });

interface RawBaseTransaction extends Omit<
  BaseTransaction,
  'createdAt' | 'expiresAt'
> {
  createdAt: string;
  expiresAt: string;
}

interface RawTokenTransferTransaction extends RawBaseTransaction {
  type: 'TOKEN_TRANSFER';
  data: TokenTransferData;
}

interface RawContractInteractionTransaction extends RawBaseTransaction {
  type: 'CONTRACT_INTERACTION';
  data: ContractInteractionData;
}

export type RawTransaction =
  | RawTokenTransferTransaction
  | RawContractInteractionTransaction;

/** Supported status filters for `getTransactions`. */
export type GetTransactionsStatus = 'queued' | 'executed';

export interface GetTransactionsParams {
  /** Optional account ID to scope transactions to a specific account. */
  accountId?: string;
  /** Optional status filter. If omitted, all transactions are returned. */
  status?: GetTransactionsStatus;
}

export interface CreateTransactionInput {
  accountId: string;
  initiatorWalletAddress: string;
  networkId: number;
  policyId: string;
  description: string;
  to: string;
  value: string;
  data: string;
}

export interface SignTransactionInput {
  type: 'initiator' | 'approve' | 'reject';
  signature: string;
  reason?: string;
  execute?: boolean;
}

export interface ExecuteTransactionInput {
  type: 'approve' | 'reject';
}

export function parseTransaction(raw: RawTransaction): Transaction {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    expiresAt: new Date(raw.expiresAt),
  };
}

export function parsePendingInitiatorTransaction(
  raw: RawTransaction
): PendingInitiatorTransaction {
  const transaction = parseTransaction(raw);
  const signatureData = (transaction as { signatureData?: SignatureData })
    .signatureData;

  if (!signatureData || signatureData.status !== 'pendingInitiatorSignature') {
    throw new Error(
      'Expected createTransaction to return a transaction pending initiator signature'
    );
  }

  return {
    ...transaction,
    signatureData,
  };
}
