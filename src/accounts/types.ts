// ─── Domain types ──────────────────────────────────────────────

export interface AccountNetwork {
  id: number;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  address: string;
  networks: AccountNetwork[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Internal helpers ──────────────────────────────────────────

/** Raw shape from the API — dates are ISO strings over the wire */
export interface RawAccount extends Omit<Account, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export function parseAccount(raw: RawAccount): Account {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}
