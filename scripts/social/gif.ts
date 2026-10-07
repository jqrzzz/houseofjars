/**
 * A GIF's blocks, walked without decoding a pixel: its size, its loop count (the NETSCAPE2.0 extension) and each
 * frame's delay, which lives in the Graphic Control Extension before the frame. ffmpeg writes every frame of an
 * image sequence with the same delay, so `npm run social` encodes the email GIF at 10 cs a frame and then sets
 * each frame's own delay here (the rests and holds of the piece's table), instead of ffmpeg's concat demuxer,
 * which rounds delays unevenly.
 *
 * The format: GIF89a (https://www.w3.org/Graphics/GIF/spec-gif89a.txt).
 */

export interface GifFrameInfo {
  /** The frame's delay, in hundredths of a second (0 when it has no Graphic Control Extension). */
  readonly delay: number;
  /** Where the delay's two bytes sit in the file, or -1 without a Graphic Control Extension. */
  readonly delayAt: number;
}

export interface GifInfo {
  readonly width: number;
  readonly height: number;
  /** NETSCAPE2.0's loop count: 0 is forever; null when the file has no loop extension (it plays once). */
  readonly loop: number | null;
  readonly frames: readonly GifFrameInfo[];
}

const u16 = (bytes: Uint8Array, at: number) => bytes[at]! | (bytes[at + 1]! << 8);

/** The index past a run of data sub-blocks (each a length byte and that many bytes, ended by a zero length). */
function skipSubBlocks(bytes: Uint8Array, at: number): number {
  let i = at;
  while (i < bytes.length && bytes[i] !== 0) i += bytes[i]! + 1;
  if (i >= bytes.length) throw new Error("GIF: data sub-blocks run past the end of the file.");
  return i + 1;
}

/** Reads a GIF's size, loop count and frame delays; throws on anything that is not a well-formed GIF. */
export function readGif(bytes: Uint8Array): GifInfo {
  const signature = String.fromCharCode(...bytes.subarray(0, 6));
  if (signature !== "GIF89a" && signature !== "GIF87a") throw new Error(`GIF: not a GIF (starts "${signature}").`);
  const width = u16(bytes, 6);
  const height = u16(bytes, 8);
  const packed = bytes[10]!;
  let i = 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0);
  let loop: number | null = null;
  let pending: GifFrameInfo | null = null;
  const frames: GifFrameInfo[] = [];
  for (;;) {
    if (i >= bytes.length) throw new Error("GIF: no trailer.");
    const block = bytes[i]!;
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = bytes[i + 1]!;
      i += 2;
      if (label === 0xf9) {
        // Graphic Control Extension: size 4, packed fields, delay (2 bytes), transparent index, terminator.
        pending = { delay: u16(bytes, i + 2), delayAt: i + 2 };
      } else if (label === 0xff && bytes[i] === 11) {
        const app = String.fromCharCode(...bytes.subarray(i + 1, i + 12));
        const data = i + 12;
        if ((app === "NETSCAPE2.0" || app === "ANIMEXTS1.0") && bytes[data]! >= 3 && bytes[data + 1] === 1) loop = u16(bytes, data + 2);
      }
      i = skipSubBlocks(bytes, i);
    } else if (block === 0x2c) {
      // Image descriptor: separator, left, top, width, height (2 bytes each), packed; then its colour table.
      const local = bytes[i + 9]!;
      i += 10 + (local & 0x80 ? 3 * 2 ** ((local & 0x07) + 1) : 0);
      i = skipSubBlocks(bytes, i + 1); // the LZW minimum code size, then the image data
      frames.push(pending ?? { delay: 0, delayAt: -1 });
      pending = null;
    } else {
      throw new Error(`GIF: unknown block 0x${block.toString(16)} at byte ${i}.`);
    }
  }
  return { width, height, loop, frames };
}

/** A copy of the GIF with each frame's delay set, in hundredths of a second, one per frame. */
export function setDelays(bytes: Uint8Array, delays: readonly number[]): Uint8Array {
  const { frames } = readGif(bytes);
  if (frames.length !== delays.length) throw new Error(`GIF: ${frames.length} frames, but ${delays.length} delays.`);
  const out = Uint8Array.from(bytes);
  frames.forEach((frame, n) => {
    const delay = delays[n]!;
    if (frame.delayAt < 0) throw new Error(`GIF: frame ${n + 1} has no Graphic Control Extension to hold its delay.`);
    if (!Number.isInteger(delay) || delay < 0 || delay > 0xffff) throw new Error(`GIF: ${delay} is not a delay in centiseconds.`);
    out[frame.delayAt] = delay & 0xff;
    out[frame.delayAt + 1] = delay >> 8;
  });
  return out;
}
