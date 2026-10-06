import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { photos } from "@/content/photos";
import { PhotoFrame } from "./PhotoFrame";

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
});
