import { describe, expect, it } from "vitest";
import { photos } from "./photos";

describe("photo places", () => {
  it("are set exactly where the house model confirms the area", () => {
    const places = Object.fromEntries(Object.entries(photos).map(([key, photo]) => [key, "place" in photo ? photo.place?.area : undefined]));
    expect(places).toEqual({
      dormCorridor: "dorm-h",
      dormFan: "dorm-h",
      podCurtain: "dorm-h",
      podLadder: "dorm-h",
      locker: "dorm-h",
      entrance: "terrace",
      wallOfJars: undefined,
      stairsJar: "landing-1",
      lamp: undefined,
    });
  });

  it("keep their focus points", () => {
    expect(photos.podCurtain.focus).toBe("75% 50%");
    expect(photos.wallOfJars.focus).toBe("80% 50%");
    expect(photos.stairsJar.focus).toBe("15% 50%");
    expect("focus" in photos.dormCorridor).toBe(false);
  });
});
