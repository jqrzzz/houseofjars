/** Size limits for a concierge conversation, shared by the chat window and the API (no zod here). */
export const MAX_TURNS = 12;
export const MAX_MESSAGE_CHARS = 1500;
export const MAX_TOTAL_CHARS = 12_000;
export const MAX_REQUEST_BYTES = 64 * 1024;

/**
 * A message as it goes back to the API: trimmed and within the per-message
 * cap. The server signs Shadow's replies in exactly this form.
 */
export function historyText(content: string): string {
  return content.trim().slice(0, MAX_MESSAGE_CHARS).trim();
}
