import { 
  encrypt, 
  decrypt, 
  encryptField, 
  decryptField, 
  hashPassword, 
  verifyPassword,
  generateSecureToken,
  generateSecureUUID,
  createSignature,
  verifySignature,
  sanitizeForLogging
} from '@/lib/encryption';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'This is sensitive data';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
      expect(encrypted.encrypted).not.toBe(originalText);
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.tag).toBeDefined();
    });

    it('should produce different encrypted values for same input', () => {
      const text = 'Same text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('encryptField and decryptField', () => {
    it('should encrypt and decrypt field values', () => {
      const originalValue = 'Customer signature data';
      const encryptedField = encryptField(originalValue);
      const decryptedField = decryptField(encryptedField);
      
      expect(decryptedField).toBe(originalValue);
      expect(encryptedField).not.toBe(originalValue);
    });

    it('should handle empty values', () => {
      expect(encryptField('')).toBe('');
      expect(decryptField('')).toBe('');
    });

    it('should handle null/undefined values', () => {
      expect(encryptField(null as any)).toBe(null);
      expect(decryptField(null as any)).toBe(null);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify passwords correctly', () => {
      const password = 'testPassword123';
      const hashed = hashPassword(password);
      
      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword('wrongPassword', hashed)).toBe(false);
    });

    it('should produce different hashes for same password', () => {
      const password = 'samePassword';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of specified length', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      
      expect(token16).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(token32).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateSecureUUID', () => {
    it('should generate valid UUIDs', () => {
      const uuid = generateSecureUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate different UUIDs each time', () => {
      const uuid1 = generateSecureUUID();
      const uuid2 = generateSecureUUID();
      
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('createSignature and verifySignature', () => {
    it('should create and verify signatures correctly', () => {
      const data = 'Important data to sign';
      const secret = 'secret-key';
      
      const signature = createSignature(data, secret);
      expect(verifySignature(data, signature, secret)).toBe(true);
      expect(verifySignature(data, signature, 'wrong-secret')).toBe(false);
      expect(verifySignature('different-data', signature, secret)).toBe(false);
    });

    it('should produce consistent signatures for same data', () => {
      const data = 'Same data';
      const secret = 'same-secret';
      
      const sig1 = createSignature(data, secret);
      const sig2 = createSignature(data, secret);
      
      expect(sig1).toBe(sig2);
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields', () => {
      const data = {
        id: '123',
        email: 'user@example.com',
        password: 'secret123',
        token: 'abc123',
        customer_signature: 'signature-data',
        notes: 'private notes',
        feedback: 'customer feedback',
        publicField: 'this is public'
      };
      
      const sanitized = sanitizeForLogging(data);
      
      expect(sanitized.id).toBe('123');
      expect(sanitized.email).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.customer_signature).toBe('[REDACTED]');
      expect(sanitized.notes).toBe('[REDACTED]');
      expect(sanitized.feedback).toBe('[REDACTED]');
      expect(sanitized.publicField).toBe('this is public');
    });

    it('should handle empty objects', () => {
      expect(sanitizeForLogging({})).toEqual({});
    });

    it('should handle objects without sensitive fields', () => {
      const data = {
        id: '123',
        name: 'John Doe',
        status: 'active'
      };
      
      const sanitized = sanitizeForLogging(data);
      expect(sanitized).toEqual(data);
    });
  });
});
