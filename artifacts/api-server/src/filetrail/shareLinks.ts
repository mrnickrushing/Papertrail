import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { ShareLinkRecord, ShareLinkStoreRecord } from './types.js';

const PREFIX = 'scrypt';
const HASH_BYTES = 64;

export function hashShareLinkPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, HASH_BYTES).toString('hex');
  return `${PREFIX}:${salt}:${hash}`;
}

export function verifyShareLinkPassword(password: string, passwordHash?: string): boolean {
  if (!passwordHash) return false;
  const [scheme, salt, expectedHash] = passwordHash.split(':');
  if (scheme !== PREFIX || !salt || !expectedHash) return false;
  const actualHash = scryptSync(password, salt, expectedHash.length / 2);
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

export function toPublicShareLinkRecord(record: ShareLinkStoreRecord): ShareLinkRecord {
  const { passwordHash: _ph, ...pub } = record;
  return pub;
}
