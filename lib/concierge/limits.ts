/** Size limits for a concierge conversation, shared by the chat window and the API (no zod here). */
export const MAX_TURNS = 12;
export const MAX_MESSAGE_CHARS = 1500;
export const MAX_TOTAL_CHARS = 12_000;
export const MAX_REQUEST_BYTES = 64 * 1024;
