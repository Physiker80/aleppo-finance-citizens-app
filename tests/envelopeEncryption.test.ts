import { describe, it, expect } from 'vitest';
import { encryptionService } from '../services/encryptionService';
import * as fs from 'fs';

// Minimal mock File for Node tests
class MockFile {
  name: string;
  private data: Buffer;
  constructor(name: string, content: Buffer | string) {
    this.name = name;
    this.data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    const ab = new ArrayBuffer(this.data.length);
    const view = new Uint8Array(ab);
    view.set(this.data);
    return ab;
  }
}

describe('Envelope Encryption (KMS) - integration', () => {
  it('encrypts and decrypts a file using KEK/DEK (wrapped DEK in metadata)', async () => {
    const originalText = 'Hello Envelope Encryption! مرحباً';
    const mock = new MockFile('hello.txt', originalText) as unknown as File;

    const enc = await encryptionService.encryptFileEnvelope(mock);
    expect(enc.success).toBe(true);
    expect(enc.metadata.wrappedDek).toBeDefined();
    expect(enc.metadata.kmsKeyId).toBeDefined();

    const dec = await encryptionService.decryptFileEnvelope(enc.encryptedPath);
    expect(dec.success).toBe(true);

    // Read decrypted file content and compare
    const decrypted = fs.readFileSync(dec.decryptedPath, 'utf8');
    expect(decrypted).toBe(originalText);

    // Cleanup temp files
    if (fs.existsSync(enc.encryptedPath)) fs.unlinkSync(enc.encryptedPath);
    if (fs.existsSync(dec.decryptedPath)) fs.unlinkSync(dec.decryptedPath);
    const metaPath = enc.encryptedPath + '.meta';
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  }, 30_000);
});
