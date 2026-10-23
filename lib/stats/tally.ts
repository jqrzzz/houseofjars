import { after } from "next/server";
import { chatLines, type ChatMeasure, type CountLine, type Tally } from "./lines";
import { sendCounts, statsConfig } from "./send";

/**
 * A tally for this request, sent to Shadow in one call once the response is
 * finished (for the concierge's stream: once the reply has streamed). For a
 * route handler, during its request.
 */
export function tallyAfterResponse(send: (lines: readonly CountLine[]) => Promise<void> = (lines) => sendCounts(lines, { config: statsConfig() })): Tally {
  const measures: ChatMeasure[] = [];
  after(() => send(chatLines(measures)));
  return {
    add(...more) {
      measures.push(...more);
    },
  };
}
