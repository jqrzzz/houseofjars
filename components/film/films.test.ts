import { existsSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Film } from "./Film";
import { filmFiles, films, type FilmEntry } from "./films";

const sample: FilmEntry = { id: "arrival", title: "From the terrace to your pod", width: 720, height: 1280, seconds: 20 };

describe("Film", () => {
  it("renders nothing until a film is listed", () => {
    expect(renderToStaticMarkup(createElement(Film, { id: "arrival", list: [] }))).toBe("");
    expect(renderToStaticMarkup(createElement(Film, { id: "lights-on", list: [sample] }))).toBe("");
  });

  it("shows a listed film with controls, its size, a poster and English captions, and never plays by itself", () => {
    const html = renderToStaticMarkup(createElement(Film, { id: "arrival", list: [sample] }));
    expect(html).toMatch(/<video[^>]* controls=""/);
    expect(html).toContain('preload="none"');
    expect(html).toMatch(/playsinline=""/i);
    expect(html).toContain('width="720" height="1280"');
    expect(html).toContain('poster="/film/arrival-poster.webp"');
    expect(html).toContain('<track kind="captions" src="/film/arrival.en.vtt" srcLang="en" label="English"');
    expect(html).toContain('type="video/webm"');
    expect(html).toContain('type="video/mp4"');
    expect(html).not.toMatch(/autoplay/i);
  });

  it("lists only films whose files are committed", () => {
    for (const film of films) {
      for (const file of Object.values(filmFiles(film.id))) expect(existsSync(join(process.cwd(), "public", file)), file).toBe(true);
    }
  });
});
