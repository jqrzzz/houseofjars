import type { ConciergeRequest } from "./request";
import type { Signer } from "./signing";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The conversation as Claude sees it: every guest message, and only the
 * replies this server signed. A reply the browser made up or edited is
 * dropped, so nobody can put words in Shadow's mouth; messages from the same
 * side that end up next to each other are joined into one turn.
 */
export function trustedHistory(request: ConciergeRequest, signer: Signer): HistoryMessage[] {
  const history: HistoryMessage[] = [];
  for (const message of request.messages) {
    if (message.role === "assistant") {
      const genuine = message.sig !== undefined && signer.verifyReply(request.session_id, message.content, message.sig);
      if (!genuine) continue;
    }
    const previous = history.at(-1);
    if (previous?.role === message.role) previous.content += `\n\n${message.content}`;
    else history.push({ role: message.role, content: message.content });
  }
  return history;
}
