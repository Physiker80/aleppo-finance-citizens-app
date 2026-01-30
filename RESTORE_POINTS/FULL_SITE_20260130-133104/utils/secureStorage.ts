// Secure session-based storage with optional AES-256-GCM encryption and TTL expiry
// Note: This improves over localStorage by using sessionStorage, encryption, and auto-expire.
// It is still client-side and should complement server-side HttpOnly session cookies.

export type SecureStoreOptions = {
  encryption?: 'AES-256' | 'none';
  sessionBased?: boolean; // true => sessionStorage, false => localStorage
  autoExpireMs?: number; // e.g., 30 * 60 * 1000
};

type StoredEnvelope = {
  v: 2;
  alg: 'AES-GCM' | 'PLAINTEXT';
  iv?: string; // base64
  data: string; // base64 for AES, UTF-8 string for PLAINTEXT
  exp?: number; // epoch ms
};

const MASTER_KEY_STORAGE_KEY = 'ss_master_key_v1';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function b64encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64decode(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
  // Try to import existing master key from sessionStorage
  const existing = sessionStorage.getItem(MASTER_KEY_STORAGE_KEY);
  if (existing) {
    const raw = b64decode(existing);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  // Generate a new 256-bit key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(MASTER_KEY_STORAGE_KEY, b64encode(raw));
  return key;
}

async function encryptJson(value: any): Promise<{ iv: Uint8Array; data: ArrayBuffer }> {
  const key = await getOrCreateCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = textEncoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { iv, data: ciphertext };
}

async function decryptJson(iv: ArrayBuffer, data: ArrayBuffer): Promise<any> {
  const key = await getOrCreateCryptoKey();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, data);
  const text = textDecoder.decode(plaintext);
  return JSON.parse(text);
}

function getStorage(sessionBased?: boolean): Storage {
  return sessionBased ? sessionStorage : localStorage;
}

export const secureStorage = {
  async set(key: string, value: any, opts: SecureStoreOptions = {}): Promise<void> {
    const { encryption = 'AES-256', sessionBased = true, autoExpireMs } = opts;
    const storage = getStorage(sessionBased);
    const exp = typeof autoExpireMs === 'number' ? Date.now() + Math.max(1000, autoExpireMs) : undefined;

    let envelope: StoredEnvelope;
    if (encryption === 'AES-256' && 'crypto' in window && window.isSecureContext) {
      try {
  const { iv, data } = await encryptJson(value);
  envelope = { v: 2, alg: 'AES-GCM', iv: b64encode(iv.buffer as ArrayBuffer), data: b64encode(data), exp };
      } catch (e) {
        // Fallback to plaintext if crypto fails (rare); still use sessionStorage and TTL
        envelope = { v: 2, alg: 'PLAINTEXT', data: JSON.stringify(value), exp } as StoredEnvelope;
      }
    } else {
      envelope = { v: 2, alg: 'PLAINTEXT', data: JSON.stringify(value), exp } as StoredEnvelope;
    }
    storage.setItem(`ss:${key}`, JSON.stringify(envelope));
  },

  async get<T = any>(key: string, opts: SecureStoreOptions = {}): Promise<T | null> {
    const { sessionBased = true } = opts;
    const storage = getStorage(sessionBased);
    const raw = storage.getItem(`ss:${key}`);
    if (!raw) return null;
    try {
      const env = JSON.parse(raw) as StoredEnvelope;
      if (env.exp && Date.now() > env.exp) {
        storage.removeItem(`ss:${key}`);
        return null;
      }
      if (env.alg === 'AES-GCM' && env.iv) {
  const iv = b64decode(env.iv);
  const data = b64decode(env.data);
  return await decryptJson(iv, data) as T;
      }
      // PLAINTEXT
      return JSON.parse(env.data) as T;
    } catch {
      // Corrupted
      storage.removeItem(`ss:${key}`);
      return null;
    }
  },

  async remove(key: string, opts: SecureStoreOptions = {}): Promise<void> {
    const { sessionBased = true } = opts;
    const storage = getStorage(sessionBased);
    storage.removeItem(`ss:${key}`);
  },

  // Optional helper to cleanup stale entries with prefix
  clearExpired(prefix = 'ss:'): void {
    const storage = sessionStorage; // only session-based entries need periodic cleanup
    const now = Date.now();
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (!k || !k.startsWith(prefix)) continue;
      try {
        const env = JSON.parse(storage.getItem(k) || 'null') as StoredEnvelope | null;
        if (env && env.exp && now > env.exp) storage.removeItem(k);
      } catch { /* ignore */ }
    }
  }
};
