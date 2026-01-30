import { describe, it, expect, beforeEach } from 'vitest';
import { KeyType, KeyStatus, keyRotationManager } from '../utils/keyRotationManager';

describe('KeyRotationManager (3.3 lifecycle)', () => {
  beforeEach(() => {
    // Clear localStorage keys used by KMS between tests
    try {
      localStorage.removeItem('kms.key.metadata.v1');
      localStorage.removeItem('kms.rotation.logs.v1');
      localStorage.removeItem('kms.alerts.v1');
      localStorage.removeItem('kms.deletion.schedule.v1');
    } catch {}
  });

  it('creates initial file encryption key and rotates it', async () => {
    // Ensure no active keys yet
    let list = keyRotationManager.getKeysByType(KeyType.FILE_ENCRYPTION);
    expect(list.length === 0 || list.every(k => k.status !== KeyStatus.ACTIVE)).toBe(true);

    // Generate a first active key
    const created = await keyRotationManager.generateKey(KeyType.FILE_ENCRYPTION, 'attachments');
    expect(created.type).toBe(KeyType.FILE_ENCRYPTION);
    expect(created.status).toBe(KeyStatus.ACTIVE);

    // Register a re-encryption handler and assert it's called
    let called = false;
    keyRotationManager.onReencryptionTask(KeyType.FILE_ENCRYPTION, async ({ oldKeyId, newKeyId }) => {
      expect(oldKeyId).toBeDefined();
      expect(newKeyId).toBeDefined();
      called = true;
    });

    // Rotate keys of this type
    const result = await keyRotationManager.rotateKeys(KeyType.FILE_ENCRYPTION);
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    // Check statuses: old should be deprecated, new should be active
    const after = keyRotationManager.getKeysByType(KeyType.FILE_ENCRYPTION);
    const active = after.filter(k => k.status === KeyStatus.ACTIVE);
    const deprecated = after.filter(k => k.status === KeyStatus.DEPRECATED);
    expect(active.length).toBeGreaterThan(0);
    expect(deprecated.length).toBeGreaterThan(0);

    // Ensure handler executed
    expect(called).toBe(true);
  });
});
