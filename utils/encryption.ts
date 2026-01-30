// =====================================================
// 🔐 Data Encryption System
// نظام تشفير البيانات
// =====================================================

/**
 * مفتاح التشفير الافتراضي (يجب تغييره في الإنتاج)
 * في بيئة الإنتاج، استخدم متغيرات البيئة
 */
const DEFAULT_KEY = 'Syrian-Finance-System-2024-SecureKey!@#$';

/**
 * توليد مفتاح عشوائي
 */
export function generateRandomKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
}

/**
 * الحصول على مفتاح التشفير
 */
function getEncryptionKey(): string {
    // محاولة الحصول على المفتاح من localStorage (للتطوير)
    // في الإنتاج، استخدم متغيرات البيئة أو خدمة إدارة المفاتيح
    let key = localStorage.getItem('encryption-key');

    if (!key) {
        key = DEFAULT_KEY;
        // لا نحفظ المفتاح الافتراضي
    }

    return key;
}

/**
 * تعيين مفتاح تشفير مخصص
 */
export function setEncryptionKey(key: string): void {
    if (key.length < 16) {
        throw new Error('مفتاح التشفير يجب أن يكون 16 حرف على الأقل');
    }
    localStorage.setItem('encryption-key', key);
}

/**
 * تحويل نص إلى مصفوفة بايت
 */
function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

/**
 * تحويل مصفوفة بايت إلى نص
 */
function bytesToString(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes);
}

/**
 * تحويل مصفوفة بايت إلى Base64
 */
function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * تحويل Base64 إلى مصفوفة بايت
 */
function base64ToBytes(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * إنشاء مفتاح تشفير من نص
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        stringToBytes(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * تشفير نص باستخدام AES-GCM
 */
export async function encrypt(plaintext: string, customKey?: string): Promise<string> {
    try {
        const key = customKey || getEncryptionKey();

        // توليد salt و IV عشوائيين
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // اشتقاق مفتاح التشفير
        const cryptoKey = await deriveKey(key, salt);

        // تشفير البيانات
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            stringToBytes(plaintext)
        );

        // دمج salt + iv + encrypted
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        return bytesToBase64(combined);
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('فشل تشفير البيانات');
    }
}

/**
 * فك تشفير نص
 */
export async function decrypt(ciphertext: string, customKey?: string): Promise<string> {
    try {
        const key = customKey || getEncryptionKey();

        // فك ترميز Base64
        const combined = base64ToBytes(ciphertext);

        // استخراج salt و iv و encrypted
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encrypted = combined.slice(28);

        // اشتقاق مفتاح التشفير
        const cryptoKey = await deriveKey(key, salt);

        // فك التشفير
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            cryptoKey,
            encrypted
        );

        return bytesToString(new Uint8Array(decrypted));
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('فشل فك تشفير البيانات');
    }
}

/**
 * تشفير كائن JSON
 */
export async function encryptObject<T>(obj: T, customKey?: string): Promise<string> {
    const json = JSON.stringify(obj);
    return encrypt(json, customKey);
}

/**
 * فك تشفير كائن JSON
 */
export async function decryptObject<T>(ciphertext: string, customKey?: string): Promise<T> {
    const json = await decrypt(ciphertext, customKey);
    return JSON.parse(json);
}

/**
 * تشفير بسيط (XOR) للاستخدام المتزامن
 * ملاحظة: أقل أماناً من AES، للاستخدام مع البيانات غير الحساسة
 */
export function simpleEncrypt(text: string, key?: string): string {
    const k = key || getEncryptionKey();
    let result = '';

    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ k.charCodeAt(i % k.length);
        result += String.fromCharCode(charCode);
    }

    return btoa(result);
}

/**
 * فك تشفير بسيط (XOR)
 */
export function simpleDecrypt(encoded: string, key?: string): string {
    const k = key || getEncryptionKey();

    try {
        const decoded = atob(encoded);
        let result = '';

        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ k.charCodeAt(i % k.length);
            result += String.fromCharCode(charCode);
        }

        return result;
    } catch {
        return encoded; // إرجاع النص الأصلي إذا فشل فك التشفير
    }
}

/**
 * تجزئة كلمة المرور باستخدام SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltedPassword = bytesToString(salt) + password;

    const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        stringToBytes(saltedPassword)
    );

    const hashArray = new Uint8Array(hashBuffer);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt, 0);
    combined.set(hashArray, salt.length);

    return bytesToBase64(combined);
}

/**
 * التحقق من كلمة المرور
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        const combined = base64ToBytes(hash);
        const salt = combined.slice(0, 16);
        const storedHash = combined.slice(16);

        const saltedPassword = bytesToString(salt) + password;
        const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            stringToBytes(saltedPassword)
        );

        const newHash = new Uint8Array(hashBuffer);

        // مقارنة آمنة من هجمات التوقيت
        if (newHash.length !== storedHash.length) return false;

        let result = 0;
        for (let i = 0; i < newHash.length; i++) {
            result |= newHash[i] ^ storedHash[i];
        }

        return result === 0;
    } catch {
        return false;
    }
}

/**
 * تشفير حقل محدد في كائن
 */
export async function encryptField<T extends Record<string, unknown>>(
    obj: T,
    fieldName: keyof T
): Promise<T> {
    const value = obj[fieldName];
    if (value === undefined || value === null) return obj;

    const encrypted = await encrypt(String(value));
    return { ...obj, [fieldName]: encrypted };
}

/**
 * فك تشفير حقل محدد في كائن
 */
export async function decryptField<T extends Record<string, unknown>>(
    obj: T,
    fieldName: keyof T
): Promise<T> {
    const value = obj[fieldName];
    if (value === undefined || value === null || typeof value !== 'string') return obj;

    try {
        const decrypted = await decrypt(value);
        return { ...obj, [fieldName]: decrypted };
    } catch {
        return obj; // إرجاع الكائن الأصلي إذا فشل فك التشفير
    }
}

/**
 * التحقق من دعم التشفير
 */
export function isEncryptionSupported(): boolean {
    return typeof crypto !== 'undefined' &&
        crypto.subtle !== undefined &&
        typeof crypto.getRandomValues === 'function';
}

/**
 * تشفير localStorage
 */
export const encryptedStorage = {
    async setItem(key: string, value: unknown): Promise<void> {
        const encrypted = await encrypt(JSON.stringify(value));
        localStorage.setItem(`enc_${key}`, encrypted);
    },

    async getItem<T>(key: string): Promise<T | null> {
        const encrypted = localStorage.getItem(`enc_${key}`);
        if (!encrypted) return null;

        try {
            const decrypted = await decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch {
            return null;
        }
    },

    removeItem(key: string): void {
        localStorage.removeItem(`enc_${key}`);
    }
};

export default {
    encrypt,
    decrypt,
    encryptObject,
    decryptObject,
    simpleEncrypt,
    simpleDecrypt,
    hashPassword,
    verifyPassword,
    encryptField,
    decryptField,
    isEncryptionSupported,
    generateRandomKey,
    setEncryptionKey,
    encryptedStorage
};
