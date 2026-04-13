import { RequestFn, RequestOptions, SDKError } from '../client/types';
import { RegistrationPayload, RegistrationResult } from './types';

/**
 * Get a registration payload message for an API user to prove ownership of a wallet.
 *
 * Sign the returned message, then submit it with `submitRegistration` to prove wallet ownership and complete registration.
 */
export async function getMemberRegistrationPayload(
  req: RequestFn,
  walletAddress: string,
  options?: RequestOptions
): Promise<{ data: RegistrationPayload }> {
  const path = '/api/v1/members/registrations/payload';
  const res = await req<{ data: RegistrationPayload }>(
    'GET',
    path,
    { params: { walletAddress } },
    options
  );
  if (!res || typeof res !== 'object' || !('data' in res)) {
    throw new SDKError(
      'Invalid response format: expected an object with top-level "data"',
      0,
      'INVALID_RESPONSE',
      {
        method: 'GET',
        path,
      }
    );
  }
  return { data: res.data };
}

/**
 * Submit a signed registration payload to complete API user registration.
 *
 * Call this after signing the message from `getMemberRegistrationPayload` to complete registration.
 */
export async function submitRegistration(
  req: RequestFn,
  walletAddress: string,
  signature: string,
  options?: RequestOptions
): Promise<{ data: RegistrationResult }> {
  const path = '/api/v1/members/registrations';
  const res = await req<{
    data: Omit<RegistrationResult, 'registeredAt'> & { registeredAt: string };
  }>('POST', path, { body: { walletAddress, signature } }, options);
  if (!res || typeof res !== 'object' || !('data' in res)) {
    throw new SDKError(
      'Invalid response format: expected an object with top-level "data"',
      0,
      'INVALID_RESPONSE',
      {
        method: 'POST',
        path,
      }
    );
  }
  return {
    data: {
      ...res.data,
      registeredAt: new Date(res.data.registeredAt),
    },
  };
}
