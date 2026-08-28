/**
 * TOTP (RFC 6238) two-factor authentication utilities.
 * Pure Node crypto implementation — no external dependencies.
 */
import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

/** Encode a buffer as RFC 4648 base32 (no padding). */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Decode a base32 string (ignores spaces/dashes/case). */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 character');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new random TOTP secret (base32, 160 bits). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Compute the HOTP value for a given counter (RFC 4226). */
function hotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, '0');
}

/**
 * Verify a 6-digit TOTP token against a base32 secret.
 * Allows +/- window time steps (default 1 = 30s clock drift tolerance).
 */
export function verifyTotpToken(secretBase32: string, token: string, window = 1): boolean {
  const cleaned = token.replace(/[\s-]/g, '');
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }
  const currentStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  for (let offset = -window; offset <= window; offset++) {
    if (hotp(secretBase32, currentStep + offset) === cleaned) {
      return true;
    }
  }
  return false;
}

/** Build an otpauth:// provisioning URI for authenticator apps. */
export function buildOtpauthUrl(secretBase32: string, accountName: string, issuer = 'GroomLink Admin'): string {
  const account = encodeURIComponent(accountName);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${account}?secret=${secretBase32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

/** Generate one-time backup codes in XXXX-XXXX format. */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomInt(0, 10 ** 8).toString().padStart(8, '0');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** Normalize a backup code input (strips spaces/dashes, uppercases). */
export function normalizeBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}
