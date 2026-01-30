/**
 * 🔐 Envelope Encryption (KEK/DEK)
 * - يولد DEK (AES-256) لتشفير البيانات/الملفات
 * - يغلّف DEK باستخدام KEK عبر AES-256-GCM
 */

import * as crypto from 'crypto';

export interface WrappedDek {
  wrapAlgorithm: 'aes-256-gcm';
  ivHex: string;        // IV المستخدم لتغليف DEK
  tagHex: string;       // Auth Tag لتغليف DEK
  wrappedKeyB64: string;// DEK المغلّف Base64
}

export function generateDek(bytes: number = 32): Buffer {
  return crypto.randomBytes(bytes);
}

export function wrapDekWithKek(dek: Buffer, kek: Buffer): WrappedDek {
  const iv = crypto.randomBytes(12); // IV 96-bit مفضل مع GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
  const enc = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    wrapAlgorithm: 'aes-256-gcm',
    ivHex: iv.toString('hex'),
    tagHex: tag.toString('hex'),
    wrappedKeyB64: enc.toString('base64')
  };
}

export function unwrapDekWithKek(wrapped: WrappedDek, kek: Buffer): Buffer {
  const iv = Buffer.from(wrapped.ivHex, 'hex');
  const tag = Buffer.from(wrapped.tagHex, 'hex');
  const enc = Buffer.from(wrapped.wrappedKeyB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]);
}
