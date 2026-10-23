import { describe, expect, it, vi } from "vitest";
import type { CountLine } from "./lines";

// after() runs its callback once the response is finished; here, when the test says so.
const finished: (() => unknown)[] = [];
vi.mock("next/server", () => ({ after: (callback: () => unknown) => void finished.push(callback) }));

const { tallyAfterResponse } = await import("./tally");

describe("a request's tally", () => {
  it("sends what the request counted in one call, after the response", async () => {
    const sent: (readonly CountLine[])[] = [];
    const tally = tallyAfterResponse(async (lines) => void sent.push(lines));
    tally.add("chat", "question");
    tally.add("check");
    tally.add("check");
    expect(sent).toEqual([]);
    for (const callback of finished.splice(0)) await callback();
    expect(sent).toEqual([[{ measure: "chat" }, { measure: "question" }, { measure: "check", n: 2 }]]);
  });
});
