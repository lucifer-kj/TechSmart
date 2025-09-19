import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars';
const ALGORITHM = 'aes-256-gcm';

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - The text to encrypt
 * @returns Encrypted data with IV and auth tag
 */
export function encrypt(text: string): EncryptedData {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  cipher.setAAD(Buffer.from('servicem8-portal', 'utf8'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

/**
 * Decrypts data encrypted with the encrypt function
 * @param encryptedData - The encrypted data object
 * @returns Decrypted text
 */
export function decrypt(encryptedData: EncryptedData): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
  decipher.setAAD(Buffer.from('servicem8-portal', 'utf8'));
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypts a field value for database storage
 * @param value - The value to encrypt
 * @returns JSON string of encrypted data
 */
export function encryptField(value: string): string {
  if (!value) return value;
  const encrypted = encrypt(value);
  return JSON.stringify(encrypted);
}

/**
 * Decrypts a field value from database storage
 * @param encryptedValue - The encrypted value from database
 * @returns Decrypted value
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;
  try {
    const encryptedData = JSON.parse(encryptedValue);
    return decrypt(encryptedData);
  } catch (error) {
    console.error('Failed to decrypt field:', error);
    return encryptedValue; // Return original if decryption fails
  }
}

/**
 * Hash a password using bcrypt-like approach with crypto
 * @param password - The password to hash
 * @returns Hashed password
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 * @param password - The password to verify
 * @param hashedPassword - The stored hash
 * @returns True if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

/**
 * Generate a secure random token
 * @param length - Length of token in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random UUID
 * @returns UUID v4 string
 */
export function generateSecureUUID(): string {
  return crypto.randomUUID();
}

/**
 * Create HMAC signature for data integrity
 * @param data - The data to sign
 * @param secret - The secret key
 * @returns Hex-encoded signature
 */
export function createSignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param data - The original data
 * @param signature - The signature to verify
 * @param secret - The secret key
 * @returns True if signature is valid
 */
export function verifySignature(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Sanitize sensitive data for logging
 * @param data - The data to sanitize
 * @returns Sanitized data with sensitive fields masked
 */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'signature', 
    'customer_signature', 'notes', 'feedback', 'email'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
