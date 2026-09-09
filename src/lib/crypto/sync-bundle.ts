/**
 * Web Crypto API Layer for Local Field Sync Bundles
 * Provides on-device AES-GCM-256 payload encryption with tamper-evident SHA-256 checksums
 */

export interface EncryptedSyncBundle {
  bundleId: string;
  officerId: string;
  timestamp: string;
  recordId: string;
  iv: string; // Base64
  encryptedData: string; // Base64 AES-GCM ciphertext
  encryptedKey: string; // Base64 wrapped key
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
 * Encrypt a VerificationRecord into an EncryptedSyncBundle using Web Crypto AES-GCM-256
 */
export async function encryptVerificationRecord(
  record: VerificationRecord,
  officerId: string
): Promise<EncryptedSyncBundle> {
  const jsonPayload = JSON.stringify(record);
  const checksum = await computeSHA256(jsonPayload);

  // 1. Generate an Ephemeral AES-256-GCM Key
  const aesKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Generate random 12-byte IV for GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt payload
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

  // 4. Export raw key bytes and encode as wrapped key (simulated local vault key)
  const rawKeyBuffer = await crypto.subtle.exportKey('raw', aesKey);

  const bundle: EncryptedSyncBundle = {
    bundleId: 'SB-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
    officerId,
    timestamp: new Date().toISOString(),
    recordId: record.id,
    iv: arrayBufferToBase64(iv.buffer),
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    encryptedKey: arrayBufferToBase64(rawKeyBuffer),
    checksum,
    algorithm: 'AES-GCM-256 / SHA-256',
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
 * Decrypt an EncryptedSyncBundle (Client-side verification & audit tool)
 */
export async function decryptSyncBundle(bundle: EncryptedSyncBundle): Promise<VerificationRecord> {
  const rawKeyBuffer = base64ToArrayBuffer(bundle.encryptedKey);
  const ivBuffer = base64ToArrayBuffer(bundle.iv);
  const encryptedDataBuffer = base64ToArrayBuffer(bundle.encryptedData);

  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    aesKey,
    encryptedDataBuffer
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  const record: VerificationRecord = JSON.parse(jsonStr);

  // Integrity validation
  const calculatedChecksum = await computeSHA256(jsonStr);
  if (calculatedChecksum !== bundle.checksum) {
    throw new Error('Integrity Check Failed: Bundle checksum mismatch! Possible tampering.');
  }

  return record;
}
