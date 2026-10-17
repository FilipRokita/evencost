import { hash, verify } from "@node-rs/argon2";

/**
 * OWASP's first choice for new passwords: Argon2id, 19 MiB of memory, two
 * passes, one lane. Auth libraries do not hash passwords; this is app code, and
 * it lives outside any framework so it can be tested on its own.
 */
const OPTIONS = {
  algorithm: 2, // Argon2id; the library exports Algorithm as a const enum, which isolatedModules rejects
  memoryCost: 19_456, // KiB, so 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/**
 * The parameters are stored inside the hash, so verification needs no options.
 * The argument shape is the one Better Auth's `password` option expects.
 */
export function verifyPassword({ password, hash }: { password: string; hash: string }): Promise<boolean> {
  return verify(hash, password);
}
