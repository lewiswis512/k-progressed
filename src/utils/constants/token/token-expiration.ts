export const RESET_PASSWORD_TOKEN_TTL_MS: number = 60 * 60 * 1000;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS: number = 48 * 60 * 60 * 1000;
export const REFRESH_TOKEN_TTL_MS: number = 30 * 24 * 60 * 60 * 1000;

export const expiresIn = (milliseconds: number): Date =>
  new Date(Date.now() + milliseconds);
