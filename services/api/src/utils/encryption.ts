import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

// Encrypt sensitive data
export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag for GCM mode
  const authTag = (cipher as crypto.CipherGCM).getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

// Decrypt sensitive data
export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex')
  );
  
  // Set authentication tag for GCM mode
  (decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Hash sensitive data (one-way)
export function hashSensitiveData(data: string): string {
  return crypto.createHmac('sha256', ENCRYPTION_KEY).update(data).digest('hex');
}

// Mask sensitive data (e.g., phone numbers, emails)
export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length < 8) return phoneNumber;
  return phoneNumber.slice(0, 4) + '****' + phoneNumber.slice(-3);
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;
  return localPart.slice(0, 2) + '***@' + domain;
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Constant-time comparison to prevent timing attacks
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
