import { describe, it, expect, beforeEach } from 'vitest';

// Simple localStorage mock for governance util
class LocalStorageMock {
  store: Record<string,string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, val: string) { this.store[key] = String(val); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

// @ts-ignore
globalThis.localStorage = new LocalStorageMock();

import { governance } from '../utils/securityGovernance';

describe('Governance exceptions and lifecycle', () => {
  beforeEach(() => {
    // reset state per test
    // @ts-ignore
    (globalThis.localStorage as any).clear();
    // Reinitialize governance state by creating a fresh instance is not trivial since governance is a singleton,
    // but at minimum, clear violations and exceptions and re-seed policies by direct mutation
    governance.state.violations = [];
    governance.state.exceptions = [];
  });

  it('approved exception bypasses non-compliant encryption check', async () => {
    // Add and approve a global exception for encryptionPolicy
  const ex = governance.addException({ policy: 'encryptionPolicy', scope: '*', reason: 'legacy endpoint', expiresAt: '2099-01-01', requestedBy: 'tester' });
    governance.approveException(ex.id, 'CISO');

    const res = await governance.enforcePolicy('encryptionPolicy', { tlsVersion: 'TLS 1.2', hstsEnabled: false, weakCiphers: ['RC4'] });
    expect(res.compliant).toBe(true); // exception should short-circuit
    expect(governance.getViolations().length).toBe(0);
  });

  it('lifecycle updates are persisted', () => {
    governance.updatePolicyLifecycle('passwordPolicy', { status: 'under_review', owner: 'مشرف الهوية', version: '9.9' });
    const p = governance.getPolicies().passwordPolicy;
    expect(p.status).toBe('under_review');
    expect(p.owner).toBe('مشرف الهوية');
    expect(p.version).toBe('9.9');
    // ensure it persisted to localStorage
    const raw = localStorage.getItem('governance_state');
    expect(raw).toBeTruthy();
    const parsed = raw ? JSON.parse(raw) : null;
    expect(parsed?.policies?.passwordPolicy?.status).toBe('under_review');
  });
});
