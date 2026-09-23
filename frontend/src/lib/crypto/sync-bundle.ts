/**
 * Web Crypto API Layer for Local Field Sync Bundles
 * Provides on-device AES-GCM-256 payload encryption with tamper-evident SHA-256 checksums
 */

export interface EncryptedSyncBundle {
  bundleId: string;
  officerId: string;
  timestamp: string;
  recordId: string;
  iv: string; // Base64 AES-GCM IV (12 bytes)
  encryptedData: string; // Base64 AES-GCM ciphertext
  encryptedKey: string; // Base64 AES-KW wrapped key (cannot be decrypted without vault key)
  keySalt: string; // Base64 salt used for PBKDF2 derivation
  checksum: string; // SHA-256 hex
  algorithm: string;
  metadata: {
    partNo: string;
    epicNo: string;
    voterName: string;
    verifiedStatus: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED';
  };
}

export interface VerificationRecord {
  id: string;
  epicNo: string;
  fullName: string;
  relativeName?: string;
  partNo: string;
  serialNo?: string;
  verificationStatus: 'VERIFIED' | 'DISCREPANCY' | 'REJECTED';
  matchScore: number;
  ocrConfidence: number;
  checklistResponses: Record<string, any>;
  discrepancyNotes?: string;
  timestamp: string;
  officerId: string;
  geoCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
}

export class DecryptionError extends Error {
  constructor(
    public readonly code: 'WRONG_KEY' | 'CORRUPTED_BUNDLE' | 'UNSUPPORTED_BROWSER' | 'DECODE_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate that a VerificationRecord contains genuine, non-placeholder data before encryption
 */
export function validateVerificationRecord(record: VerificationRecord): void {
  if (!record.id || record.id.trim() === '') {
    throw new ValidationError('Record ID is missing.');
  }
  if (!record.epicNo || record.epicNo.trim() === '' || record.epicNo === 'PENDING-EPIC') {
    throw new ValidationError('EPIC Number cannot be empty or a pending placeholder.');
  }
  if (record.epicNo.length < 5) {
    throw new ValidationError(`Invalid EPIC Number format: "${record.epicNo}". Minimum 5 characters required.`);
  }
  if (!record.fullName || record.fullName.trim() === '' || record.fullName === 'Verified Citizen') {
    throw new ValidationError('Elector full name cannot be empty or a generic placeholder.');
  }
  if (record.fullName.trim().length < 2) {
    throw new ValidationError('Elector full name must be at least 2 characters.');
  }
  if (!record.partNo || record.partNo.trim() === '') {
    throw new ValidationError('Electoral Part Number is required.');
  }
  if (!record.officerId || record.officerId.trim() === '') {
    throw new ValidationError('Auditing Officer ID is required for statutory attribution.');
  }
}

// Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Compute SHA-256 Digest
export async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive an AES-KW (Key-Wrapping Key) from officer passphrase/ID using PBKDF2 (100,000 rounds)
 */
async function deriveWrappingKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Encrypt a VerificationRecord into an EncryptedSyncBundle using Web Crypto AES-GCM-256
 * with AES-KW key wrapping via PBKDF2 derived vault credentials.
 */
export async function encryptVerificationRecord(
  record: VerificationRecord,
  officerId: string,
  vaultPassphrase?: string
): Promise<EncryptedSyncBundle> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new DecryptionError('UNSUPPORTED_BROWSER', 'Web Crypto API is not available.');
  }

  // Pre-encryption schema & data integrity check
  validateVerificationRecord(record);

  const jsonPayload = JSON.stringify(record);
  const checksum = await computeSHA256(jsonPayload);

  // 1. Generate an Ephemeral AES-256-GCM Data Encryption Key
  const aesKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // Must be extractable so it can be wrapped with AES-KW
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 12-byte IV for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt payload with AES-GCM
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonPayload);
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    aesKey,
    encodedData
  );

  // 4. Derive Wrapping Key (KWK) using PBKDF2 from officer credentials + salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const secretPhrase = vaultPassphrase || `${officerId}:SIR_VAULT_STATUTORY_SECRET_V1`;
  const wrappingKey = await deriveWrappingKey(secretPhrase, salt);

  // 5. Wrap the AES-GCM key with AES-KW (Key never stored in plaintext)
  const wrappedKeyBuffer = await crypto.subtle.wrapKey(
    'raw',
    aesKey,
    wrappingKey,
    'AES-KW'
  );

  const bundle: EncryptedSyncBundle = {
    bundleId: 'SB-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
    officerId,
    timestamp: new Date().toISOString(),
    recordId: record.id,
    iv: arrayBufferToBase64(iv.buffer),
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    encryptedKey: arrayBufferToBase64(wrappedKeyBuffer),
    keySalt: arrayBufferToBase64(salt.buffer),
    checksum,
    algorithm: 'AES-GCM-256 / AES-KW-256 / PBKDF2-SHA256',
    metadata: {
      partNo: record.partNo,
      epicNo: record.epicNo,
      voterName: record.fullName,
      verifiedStatus: record.verificationStatus,
    },
  };

  return bundle;
}

/**
 * Decrypt an EncryptedSyncBundle using Web Crypto with wrapped key unwrapping
 */
export async function decryptSyncBundle(
  bundle: EncryptedSyncBundle,
  vaultPassphrase?: string
): Promise<VerificationRecord> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new DecryptionError('UNSUPPORTED_BROWSER', 'Web Crypto API is not available on this device.');
  }

  try {
    const wrappedKeyBuffer = base64ToArrayBuffer(bundle.encryptedKey);
    const ivBuffer = base64ToArrayBuffer(bundle.iv);
    const encryptedDataBuffer = base64ToArrayBuffer(bundle.encryptedData);
    const saltBuffer = bundle.keySalt ? base64ToArrayBuffer(bundle.keySalt) : new Uint8Array(16).buffer;

    const secretPhrase = vaultPassphrase || `${bundle.officerId}:SIR_VAULT_STATUTORY_SECRET_V1`;
    let wrappingKey: CryptoKey;
    try {
      wrappingKey = await deriveWrappingKey(secretPhrase, new Uint8Array(saltBuffer));
    } catch {
      throw new DecryptionError('WRONG_KEY', 'Failed to derive unwrapping key from supplied credentials.');
    }

    let aesKey: CryptoKey;
    try {
      aesKey = await crypto.subtle.unwrapKey(
        'raw',
        wrappedKeyBuffer,
        wrappingKey,
        'AES-KW',
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
    } catch {
      // Backward compatibility fallback in case an older un-wrapped bundle was saved
      try {
        aesKey = await crypto.subtle.importKey(
          'raw',
          wrappedKeyBuffer,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
      } catch {
        throw new DecryptionError('WRONG_KEY', 'Decryption key unwrapping failed. Incorrect vault secret or corrupted key.');
      }
    }

    let decryptedBuffer: ArrayBuffer;
    try {
      decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(ivBuffer),
        },
        aesKey,
        encryptedDataBuffer
      );
    } catch {
      throw new DecryptionError('CORRUPTED_BUNDLE', 'AES-GCM authentication tag mismatch or corrupted ciphertext.');
    }

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);
    
    let record: VerificationRecord;
    try {
      record = JSON.parse(jsonStr);
    } catch {
      throw new DecryptionError('DECODE_FAILED', 'Payload is not valid JSON.');
    }

    // Integrity validation
    const calculatedChecksum = await computeSHA256(jsonStr);
    if (calculatedChecksum !== bundle.checksum) {
      throw new DecryptionError('CORRUPTED_BUNDLE', 'Integrity Check Failed: SHA-256 checksum mismatch. Possible tampering.');
    }

    return record;
  } catch (err: any) {
    if (err instanceof DecryptionError) {
      throw err;
    }
    throw new DecryptionError('CORRUPTED_BUNDLE', err.message || 'Failed to decrypt sync bundle.');
  }
}
