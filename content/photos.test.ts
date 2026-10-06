import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { drawings } from "@/components/art/drawings";
import { photos } from "./photos";

/** A JPEG's width and height, from its start-of-frame segment. */
function jpegSize(file: string): [number, number] {
  const data = readFileSync(join(process.cwd(), "public", file));
  let at = 2;
  while (at < data.length) {
    const marker = data[at + 1]!;
    const length = data.readUInt16BE(at + 2);
    // SOF0 to SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return [data.readUInt16BE(at + 7), data.readUInt16BE(at + 5)];
    }
    at += 2 + length;
  }
  throw new Error(`No frame size in ${file}`);
}

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
    // The ladder its caption names is at the left edge of the photograph.
    expect(photos.podLadder.focus).toBe("0% 50%");
    expect(photos.wallOfJars.focus).toBe("80% 50%");
    expect(photos.stairsJar.focus).toBe("15% 50%");
    expect("focus" in photos.dormCorridor).toBe(false);
  });
});

describe("photo sizes", () => {
  it.each(Object.entries(photos))("%s gives the web copy's real size", (_, photo) => {
    expect(jpegSize(photo.src)).toEqual(photo.size);
  });
});

describe("photo drawings", () => {
  it.each(Object.entries(photos))("%s has its own drawing, Day and Evening, described for screen readers", (_, photo) => {
    const drawing = drawings[photo.drawing];
    expect(drawing).toBeDefined();
    expect(existsSync(join(process.cwd(), "public", drawing.src))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", drawing.evening))).toBe(true);
    expect(photo.drawnAlt).toMatch(/^Drawing of /);
  });

  it("are each drawn once", () => {
    const names = Object.values(photos).map((photo) => photo.drawing);
    expect(new Set(names).size).toBe(names.length);
  });
});

/** Every .tsx file under a folder. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

describe("real photographs", () => {
  it("are asked for only by the booking page's gallery", () => {
    const root = process.cwd();
    const asking = ["app", "components"]
      .flatMap((dir) => tsxFiles(join(root, dir)))
      .filter((file) => /<PhotoFrame\b[^>]*\sreal(?=[\s/>=])/.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(asking).toEqual(["components/book/RealPhotos.tsx"]);
  });
});
