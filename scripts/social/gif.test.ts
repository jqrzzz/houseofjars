import { describe, expect, it } from "vitest";
import { readGif, setDelays } from "./gif";

/** A tiny GIF89a, built byte by byte: 2 × 1 pixels, a 2-colour palette, a loop extension and one frame per delay. */
function gif(delays: readonly number[], { loop = 0 as number | null, comment = false } = {}): Uint8Array {
  const bytes: number[] = [...Buffer.from("GIF89a"), 2, 0, 1, 0, 0x80, 0, 0, 0, 0, 0, 255, 255, 255];
  if (loop !== null) bytes.push(0x21, 0xff, 11, ...Buffer.from("NETSCAPE2.0"), 3, 1, loop & 0xff, loop >> 8, 0);
  if (comment) bytes.push(0x21, 0xfe, 3, ...Buffer.from("hey"), 0);
  for (const delay of delays) {
    bytes.push(0x21, 0xf9, 4, 0, delay & 0xff, delay >> 8, 0, 0);
    bytes.push(0x2c, 0, 0, 0, 0, 2, 0, 1, 0, 0, 2, 2, 0x44, 0x01, 0);
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

describe("GIF block walker", () => {
  it("reads the size, the loop and every frame's delay", () => {
    const info = readGif(gif([300, 10, 120], { comment: true }));
    expect(info).toMatchObject({ width: 2, height: 1, loop: 0 });
    expect(info.frames.map((f) => f.delay)).toEqual([300, 10, 120]);
  });

  it("knows a GIF that plays once from one that loops", () => {
    expect(readGif(gif([10], { loop: null })).loop).toBeNull();
    expect(readGif(gif([10], { loop: 3 })).loop).toBe(3);
  });

  it("sets each frame's delay and nothing else", () => {
    const before = gif([10, 10, 10, 10]);
    const after = setDelays(before, [300, 10, 120, 0x1234]);
    expect(readGif(after).frames.map((f) => f.delay)).toEqual([300, 10, 120, 0x1234]);
    expect(after.length).toBe(before.length);
    const changed = [...after].flatMap((b, i) => (b === before[i] ? [] : [i]));
    expect(changed.length).toBeLessThanOrEqual(8);
    expect(before[readGif(before).frames[0]!.delayAt]).toBe(10); // the original is untouched
  });

  it("refuses a delay list that doesn't match the frames, and files that aren't GIFs", () => {
    expect(() => setDelays(gif([10, 10]), [10])).toThrow(/2 frames/);
    expect(() => readGif(Uint8Array.from(Buffer.from("PNG...")))).toThrow(/not a GIF/);
    expect(() => readGif(gif([10]).subarray(0, 30))).toThrow();
  });
});
