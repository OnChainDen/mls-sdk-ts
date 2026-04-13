/**
 * SDK Configuration
 */
export interface SDKConfig {
  /** API key for authentication (required) */
  apiKey: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

/**
 * Request options for individual API calls
 */
export interface RequestOptions {
  /** Override timeout for this request */
  timeout?: number;
  /** Additional headers for this request */
  headers?: Record<string, string>;
  /** AbortSignal for request cancellation */
  signal?: AbortSignal;
}

/**
 * Internal request function signature used by resource modules.
 */
export type RequestFn = <R>(
  method: string,
  path: string,
  init?: { params?: Record<string, unknown>; body?: unknown },
  options?: RequestOptions
) => Promise<R>;

/**
 * SDK Error class with request metadata for debugging.
 */
export class SDKError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  /** Server-assigned request ID (from x-request-id header) */
  public readonly requestId: string | undefined;
  /** HTTP method that triggered the error */
  public readonly method: string | undefined;
  /** Request path that triggered the error */
  public readonly path: string | undefined;

  constructor(
    message: string,
    status: number,
    code?: string,
    metadata?: {
      requestId?: string | undefined;
      method?: string | undefined;
      path?: string | undefined;
    }
  ) {
    super(message);
    this.name = 'SDKError';
    this.status = status;
    this.code = code;
    this.requestId = metadata?.requestId;
    this.method = metadata?.method;
    this.path = metadata?.path;
  }
}
