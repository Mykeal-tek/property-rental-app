import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const HASH_PREFIX = "s2";
const KEY_LENGTH = 64;

export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const parts = passwordHash.split("$");
  if (parts.length !== 3) return false;

  const [prefix, salt, storedHex] = parts;
  if (prefix !== HASH_PREFIX || !salt || !storedHex) return false;

  const derived = scryptSync(password, salt, KEY_LENGTH);
  const stored = Buffer.from(storedHex, "hex");
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}
