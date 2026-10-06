import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { photos } from "@/content/photos";
import { coverSizes, PhotoFrame } from "./PhotoFrame";

const frame = (props: Partial<Parameters<typeof PhotoFrame>[0]>) =>
  renderToStaticMarkup(createElement(PhotoFrame, { caption: "The dorms", photo: photos.dormCorridor, drawing: "pod", ...props }));

describe("PhotoFrame", () => {
  it("sits the photograph in a paper mat unless told not to", () => {
    expect(frame({})).toMatch(/class="_mat_[0-9a-f]+ _rect_/);
    expect(frame({ shape: "arch" })).toMatch(/class="_mount_[0-9a-f]+ _archMount_/);
    expect(frame({ mat: false })).not.toContain("_mat_");
  });

  it("loads first with preload, and with priority, its old name", () => {
    expect(frame({ preload: true })).toContain('rel="preload"');
    expect(frame({ priority: true })).toContain('rel="preload"');
    expect(frame({})).not.toContain('rel="preload"');
    expect(frame({})).toContain('loading="lazy"');
  });

  it("keeps the alt text and the caption", () => {
    const markup = frame({});
    expect(markup).toContain(`alt="${photos.dormCorridor.alt}"`);
    expect(markup).toContain("<figcaption");
  });

  it("sets a plate on the mat's foot, before the caption", () => {
    const markup = frame({ shape: "arch", plate: createElement("p", null, "9.4/10") });
    expect(markup).toMatch(/class="_figure_[0-9a-f]+ _plated_/);
    expect(markup).toMatch(/<div class="_plate_[0-9a-f]+"><p>9.4\/10<\/p><\/div><figcaption/);
    expect(frame({})).not.toContain("_plate");
  });

  it("asks for as many pixels as the photograph is drawn across", () => {
    // A 3:2 photograph in a 2:3 arch is cropped to its middle: drawn 2.25 times the frame's width, then settled at 1.08.
    expect(frame({ shape: "arch", aspect: "2 / 3", sizes: "(min-width: 60rem) 26rem, 80vw" })).toContain(
      'sizes="(min-width: 60rem) calc(2.44 * 26rem), calc(2.44 * 80vw)"',
    );
  });
});

describe("coverSizes", () => {
  it("scales every length by the crop and the settled scale", () => {
    expect(coverSizes("(min-width: 60rem) 22rem, (min-width: 40rem) 45vw, 90vw", "4 / 5", [2000, 1600])).toBe(
      "(min-width: 60rem) calc(1.69 * 22rem), (min-width: 40rem) calc(1.69 * 45vw), calc(1.69 * 90vw)",
    );
  });

  it("only settles a photograph that is narrower than its frame", () => {
    expect(coverSizes("90vw", "4 / 5", [1200, 1600])).toBe("calc(1.08 * 90vw)");
  });

  it("keeps lengths that are already functions whole", () => {
    expect(coverSizes("(min-width: 48rem) min(30rem, 40vw), calc(100vw - 2rem)", "1", [1000, 1000])).toBe(
      "(min-width: 48rem) calc(1.08 * min(30rem, 40vw)), calc(1.08 * calc(100vw - 2rem))",
    );
  });

  it("leaves the hint alone without the photograph's size", () => {
    expect(coverSizes("(min-width: 60rem) 18rem, 12rem", "4 / 5")).toBe("(min-width: 60rem) 18rem, 12rem");
  });
});
