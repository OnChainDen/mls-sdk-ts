// ─── Domain types ──────────────────────────────────────────────

export interface RegistrationPayload {
  messageToSign: string;
}

export interface RegistrationResult {
  walletAddress: string;
  registered: boolean;
  registeredAt: Date;
}
