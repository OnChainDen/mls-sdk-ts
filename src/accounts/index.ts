import { RequestFn, RequestOptions } from '../client/types';
import { Account, RawAccount, parseAccount } from './types';

/** List all accounts for the organization */
export async function getAccounts(
  req: RequestFn,
  options?: RequestOptions
): Promise<{ data: Account[] }> {
  const res = await req<{ data: RawAccount[] }>(
    'GET',
    '/api/v1/accounts',
    undefined,
    options
  );
  return { data: res.data.map(parseAccount) };
}

/** Get a specific account by ID */
export async function getAccount(
  req: RequestFn,
  accountId: string,
  options?: RequestOptions
): Promise<{ data: Account }> {
  const res = await req<{ data: RawAccount }>(
    'GET',
    `/api/v1/accounts/${encodeURIComponent(accountId)}`,
    undefined,
    options
  );
  return { data: parseAccount(res.data) };
}
