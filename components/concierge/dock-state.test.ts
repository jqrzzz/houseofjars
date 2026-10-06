import { describe, expect, it } from "vitest";
import { dockHidden } from "./dock-state";

describe("dockHidden", () => {
  it("keeps the dock when nothing reaches into its band", () => {
    expect(dockHidden([])).toBe("false");
  });

  it("steps only Shadow's button aside for inline Ask Shadow buttons, so Book direct stays", () => {
    expect(dockHidden(["ask"])).toBe("ask");
    expect(dockHidden(["ask", "ask"])).toBe("ask");
  });

  it("steps the whole dock aside for a booking form or the hero, even beside an Ask Shadow button", () => {
    expect(dockHidden([""])).toBe("true");
    expect(dockHidden(["ask", ""])).toBe("true");
    expect(dockHidden(["", "ask"])).toBe("true");
  });
});
