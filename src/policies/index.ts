import { RequestFn, RequestOptions } from '../client/types';
import { Policy, RawPolicy, parsePolicy } from './types';

/** List all policies for the organization */
export async function getPolicies(
  req: RequestFn,
  options?: RequestOptions
): Promise<{ data: Policy[] }> {
  const res = await req<{ data: RawPolicy[] }>(
    'GET',
    '/api/v1/policies',
    undefined,
    options
  );
  return { data: res.data.map(parsePolicy) };
}
