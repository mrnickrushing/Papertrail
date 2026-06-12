import { createHash, randomBytes } from 'node:crypto';

const HASH_VERSION = 'pbkdf2';
const DEFAULT_ITERATIONS = 1000;
const SALT_BYTES = 16;

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function generateSalt(): string {
  return bytesToBase64(randomBytes(SALT_BYTES));
}

async function deriveHash(password: string, saltBase64: string, iterations: number): Promise<string> {
  let current = `${saltBase64}:${password}`;
  for (let i = 0; i < iterations; i++) {
    current = createHash('sha256').update(current).digest('hex');
  }
  return current;
}

export async function hashPassword(password: string): Promise<string> {
  const saltBase64 = generateSalt();
  const digest = await deriveHash(password, saltBase64, DEFAULT_ITERATIONS);
  return `${HASH_VERSION}$${DEFAULT_ITERATIONS}$${saltBase64}$${digest}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (storedHash.startsWith(`${HASH_VERSION}$`)) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return { ok: false, needsRehash: false };
    const iterations = parseInt(parts[1], 10);
    const saltBase64 = parts[2];
    const expected = parts[3];
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return { ok: false, needsRehash: false };
    }
    const computed = await deriveHash(password, saltBase64, iterations);
    return { ok: constantTimeEqual(computed, expected), needsRehash: false };
  }

  const legacy = createHash('sha256').update(password).digest('hex');
  const ok = constantTimeEqual(legacy, storedHash);
  return { ok, needsRehash: ok };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
