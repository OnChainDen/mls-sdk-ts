import { RequestFn, RequestOptions } from '../client/types';
import {
  CreateTransactionInput,
  ExecuteTransactionInput,
  GetTransactionsParams,
  PendingInitiatorTransaction,
  parsePendingInitiatorTransaction,
  RawTransaction,
  SignTransactionInput,
  Transaction,
  parseTransaction,
} from './types';

/** List transactions with optional account and status filters.
 *
 * If `accountId` is omitted, all transactions for the organization are returned.
 * If `status` is omitted, transactions of all statuses are returned.
 */
export async function getTransactions(
  req: RequestFn,
  params?: GetTransactionsParams,
  options?: RequestOptions
): Promise<{ data: Transaction[] }> {
  const res = await req<{ data: RawTransaction[] }>(
    'GET',
    '/api/v1/transactions',
    params ? { params: params as Record<string, unknown> } : undefined,
    options
  );
  return { data: res.data.map(parseTransaction) };
}

/** Get a single transaction by id. */
export async function getTransaction(
  req: RequestFn,
  transactionId: string,
  options?: RequestOptions
): Promise<{ data: Transaction }> {
  const res = await req<{ data: RawTransaction }>(
    'GET',
    `/api/v1/transactions/${encodeURIComponent(transactionId)}`,
    undefined,
    options
  );
  return { data: parseTransaction(res.data) };
}

/** Create a transaction. */
export async function createTransaction(
  req: RequestFn,
  input: CreateTransactionInput,
  options?: RequestOptions
): Promise<{ data: PendingInitiatorTransaction }> {
  const res = await req<{ data: RawTransaction }>(
    'POST',
    '/api/v1/transactions',
    { body: input },
    options
  );
  return { data: parsePendingInitiatorTransaction(res.data) };
}

/** Submit a signature for a transaction. */
export async function signTransaction(
  req: RequestFn,
  transactionId: string,
  input: SignTransactionInput,
  options?: RequestOptions
): Promise<{ data: Transaction }> {
  const res = await req<{ data: RawTransaction }>(
    'POST',
    `/api/v1/transactions/${encodeURIComponent(transactionId)}/signatures`,
    { body: input },
    options
  );
  return { data: parseTransaction(res.data) };
}

/** Execute a transaction with a specific resolution, approve or reject.
 *
 * Specify `type` as `approve` to execute the transaction on-chain as intended (e.g. a token transfer).
 * Specify `type` as `reject` to invalidate the existing approval signatures so they cannot be used in the future.
 */
export async function executeTransaction(
  req: RequestFn,
  transactionId: string,
  input: ExecuteTransactionInput,
  options?: RequestOptions
): Promise<{ data: Transaction }> {
  const res = await req<{ data: RawTransaction }>(
    'POST',
    `/api/v1/transactions/${encodeURIComponent(transactionId)}/execute`,
    { body: input },
    options
  );
  return { data: parseTransaction(res.data) };
}
