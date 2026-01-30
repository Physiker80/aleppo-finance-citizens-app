#!/usr/bin/env node
// Compute HMAC-SHA256 of stdin (raw) with a shared secret; prints hex
import crypto from 'crypto';

async function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('error', reject);
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function main() {
  const secret = process.env.HMAC_SECRET || process.argv[2] || '';
  if (!secret) {
    console.error('Usage: HMAC_SECRET=secret node scripts/hmac-sign.js < body.json');
    process.exit(2);
  }
  const buf = await readStdin();
  const sig = crypto.createHmac('sha256', String(secret)).update(buf).digest('hex');
  process.stdout.write(sig + '\n');
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
