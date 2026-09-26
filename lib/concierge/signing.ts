import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { historyText } from "./limits";

/**
 * Signs what the server itself wrote, so the browser can keep it and hand it
 * back without being able to change it. Only replies carrying a valid
 * signature go back to Claude as Shadow's own turns.
 */
export interface Signer {
  signReply(sessionId: string, content: string): string;
  verifyReply(sessionId: string, content: string, signature: string): boolean;
}

/**
 * The key is derived from `secret` with HKDF, so every server instance agrees
 * without extra configuration and the secret itself is never a MAC key.
 */
export function createSigner(secret: string): Signer {
  const key = Buffer.from(hkdfSync("sha256", secret, "houseofjars-concierge", "signing-v1", 32));
  // Every field but the last is fixed-format (a label, a UUID), so joining with newlines is unambiguous.
  const mac = (...fields: string[]) => createHmac("sha256", key).update(fields.join("\n")).digest("base64url");

  return {
    signReply: (sessionId, content) => mac("reply", sessionId, historyText(content)),
    verifyReply: (sessionId, content, signature) => equal(mac("reply", sessionId, historyText(content)), signature),
  };
}

function equal(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

let cached: { secret: string; signer: Signer } | null = null;

/** The concierge's signer, keyed from ANTHROPIC_API_KEY; null without it (the concierge is off then anyway). */
export function conciergeSigner(env: Readonly<Record<string, string | undefined>> = process.env): Signer | null {
  const secret = env.ANTHROPIC_API_KEY;
  if (!secret) return null;
  if (cached?.secret !== secret) cached = { secret, signer: createSigner(secret) };
  return cached.signer;
}
