import { SDKConfig, RequestOptions, SDKError, RequestFn } from './types';
import { Account } from '../accounts/types';
import { Policy } from '../policies/types';
import { RegistrationPayload, RegistrationResult } from '../members/types';
import {
  CreateTransactionInput,
  ExecuteTransactionInput,
  GetTransactionsParams,
  PendingInitiatorTransaction,
  SignTransactionInput,
  Transaction,
} from '../transactions/types';
import * as accounts from '../accounts';
import * as members from '../members';
import * as policies from '../policies';
import * as transactions from '../transactions';

/**
 * Serialize an object into a query string.
 */
function stringifyParams(params: Record<string, unknown>): string {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return '';
  }

  return entries
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&');
}

/**
 * Build a full URL from a base URL and path.
 * If the path is already a full URL, return it as-is.
 */
function createUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Check if a Content-Type header value indicates JSON.
 */
function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  // Matches application/json, application/problem+json, application/vnd.api+json, etc.
  return /application\/(?:[\w.+-]*\+)?json/i.test(contentType);
}

/**
 * Core request function.
 */
async function request<R>(
  defaultHeaders: Record<string, string>,
  defaultTimeout: number,
  method: string,
  url: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<R> {
  const timeout = options?.timeout ?? defaultTimeout;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // If the caller provides their own signal, link it to our controller
  // so we can distinguish "our timeout fired" vs "caller cancelled"
  const callerSignal = options?.signal;
  const onCallerAbort = () => controller.abort();

  if (callerSignal) {
    if (callerSignal.aborted) {
      clearTimeout(timeoutId);
      throw new SDKError('Request aborted', 0, 'ABORTED', { method, path });
    }
    callerSignal.addEventListener('abort', onCallerAbort);
  }

  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...options?.headers,
  };

  try {
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    const requestId = response.headers.get('x-request-id') ?? undefined;
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorCode: string | undefined;

      if (isJsonContentType(contentType)) {
        try {
          const parsed = (await response.json()) as {
            message?: string;
            code?: string;
          };
          errorMessage = parsed.message ?? errorMessage;
          errorCode = parsed.code;
        } catch {
          // Fall through with default message
        }
      } else {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      }

      throw new SDKError(errorMessage, response.status, errorCode, {
        requestId,
        method,
        path,
      });
    }

    // 204 No Content — nothing to parse
    if (response.status === 204) {
      return undefined as R;
    }

    // Only parse JSON when the server says it's JSON
    if (isJsonContentType(contentType)) {
      return (await response.json()) as R;
    }

    // Non-JSON success response — return raw text
    const text = await response.text();
    return text as unknown as R;
  } catch (error: unknown) {
    if (error instanceof SDKError) {
      throw error;
    }

    // Check for abort — handles both Error and DOMException variants
    // across Node, browser, and test environments
    const errorName =
      error instanceof Error
        ? error.name
        : typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            typeof (error as { name: unknown }).name === 'string'
          ? (error as { name: string }).name
          : undefined;

    if (errorName === 'AbortError') {
      // Distinguish between an API timeout and a caller-initiated abort.
      if (callerSignal?.aborted) {
        throw new SDKError('Request aborted', 0, 'ABORTED', { method, path });
      }
      throw new SDKError('Request timeout', 408, 'TIMEOUT', { method, path });
    }

    if (error instanceof Error) {
      throw new SDKError(error.message, 0, 'NETWORK_ERROR', { method, path });
    }

    throw new SDKError('Unknown error occurred', 0, 'UNKNOWN_ERROR', {
      method,
      path,
    });
  } finally {
    clearTimeout(timeoutId);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', onCallerAbort);
    }
  }
}

/**
 * Den API client.
 *
 * Requires Node 18+ (uses global `fetch`).
 *
 * @example
 * ```ts
 * const client = new DenClient({ apiKey: 'ck_live_...', baseUrl: 'https://api.example.com' });
 * const accounts = await client.getAccounts();
 * const account = await client.getAccount('account-123');
 * ```
 */
export class DenClient {
  private readonly req: RequestFn;

  constructor(config: SDKConfig) {
    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const timeout = config.timeout ?? 30000;
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
      ...config.headers,
    };

    this.req = <R>(
      method: string,
      path: string,
      init?: { params?: Record<string, unknown>; body?: unknown },
      options?: RequestOptions
    ): Promise<R> => {
      let url = createUrl(baseUrl, path);

      if (init?.params) {
        const qs = stringifyParams(init.params);
        if (qs) {
          url += `?${qs}`;
        }
      }

      return request<R>(
        defaultHeaders,
        timeout,
        method,
        url,
        path,
        init?.body,
        options
      );
    };
  }

  // ─── Accounts ──────────────────────────────────────────────────

  /** List all accounts for the organization */
  async getAccounts(options?: RequestOptions): Promise<{ data: Account[] }> {
    return accounts.getAccounts(this.req, options);
  }

  /** Get a specific account by ID */
  async getAccount(
    accountId: string,
    options?: RequestOptions
  ): Promise<{ data: Account }> {
    return accounts.getAccount(this.req, accountId, options);
  }

  // ─── Transactions ───────────────────────────────────────────────

  /** List transactions with optional account and status filters. If `status` is omitted, all transactions are returned. */
  async getTransactions(
    params?: GetTransactionsParams,
    options?: RequestOptions
  ): Promise<{ data: Transaction[] }> {
    return transactions.getTransactions(this.req, params, options);
  }

  /** Get a single transaction by ID */
  async getTransaction(
    transactionId: string,
    options?: RequestOptions
  ): Promise<{ data: Transaction }> {
    return transactions.getTransaction(this.req, transactionId, options);
  }

  /** Create a transaction */
  async createTransaction(
    input: CreateTransactionInput,
    options?: RequestOptions
  ): Promise<{ data: PendingInitiatorTransaction }> {
    return transactions.createTransaction(this.req, input, options);
  }

  /** Sign a transaction */
  async signTransaction(
    transactionId: string,
    input: SignTransactionInput,
    options?: RequestOptions
  ): Promise<{ data: Transaction }> {
    return transactions.signTransaction(
      this.req,
      transactionId,
      input,
      options
    );
  }

  /** Execute a transaction resolution */
  async executeTransaction(
    transactionId: string,
    input: ExecuteTransactionInput,
    options?: RequestOptions
  ): Promise<{ data: Transaction }> {
    return transactions.executeTransaction(
      this.req,
      transactionId,
      input,
      options
    );
  }

  // ─── Members / Registration ─────────────────────────────────────

  /** Get the registration payload message for an API user to sign */
  async getMemberRegistrationPayload(
    walletAddress: string,
    options?: RequestOptions
  ): Promise<{ data: RegistrationPayload }> {
    return members.getMemberRegistrationPayload(
      this.req,
      walletAddress,
      options
    );
  }

  /** Submit a signed registration payload to complete registration */
  async submitRegistration(
    walletAddress: string,
    signature: string,
    options?: RequestOptions
  ): Promise<{ data: RegistrationResult }> {
    return members.submitRegistration(
      this.req,
      walletAddress,
      signature,
      options
    );
  }

  // ─── Policies ──────────────────────────────────────────────────

  /** List all policies for the organization */
  async getPolicies(options?: RequestOptions): Promise<{ data: Policy[] }> {
    return policies.getPolicies(this.req, options);
  }
}
