import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { times } from "../../content/stay";
import { placedHouseRules } from "../../lib/house/rules";
import { siteUrl } from "../../lib/site";
import { captionTracks, countWords, opaqueWindows, readingBudget, readingProblems, reviewProblems, secondsToRead } from "./piece";
import { boardAlt, copy, emailGif, houseRules, postCaption, videoAlt } from "./pieces/house-rules";

const rule = (id: string) => {
  const found = placedHouseRules().find((r) => r.id === id);
  if (!found) throw new Error(`no rule ${id}`);
  return found;
};

/** Every string in a value, however deep. */
const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];

describe("house rules: the facts", () => {
  it("says only what the house's own rules say", () => {
    const shoes = rule("no-shoes-upstairs");
    expect(shoes.rule).toContain("No shoes upstairs");
    expect(shoes.rule).toContain("at the foot of the stairs");
    expect(shoes.fact.confirmed).toBe(true);
    expect(rule("no-smoking").rule).toContain("No smoking");
    const smoke = rule("smoke-past-the-terrace");
    expect(smoke.rule).toContain("past the terrace");
    expect(smoke.rule).toContain("not on the terrace");
    expect(smoke.fact.confirmed).toBe(true);
    expect(rule("quiet").rule).toBe("Keep your voice down at all times.");
  });

  it("shows the quiet hours exactly as content/stay.ts has them, on the 24-hour clock", () => {
    expect(times.quietHours).not.toBeNull();
    expect(copy.quiet.times).toBe(times.quietHours!.value);
    expect(copy.quiet.times).toMatch(/^\d\d:\d\d–\d\d:\d\d$/);
    // The film and the board show the same time.
    expect(houseRules.board.rows[2]!.times).toBe(copy.quiet.times);
    expect(houseRules.video.captions.find((c) => c.id === "rule-3")!.blocks.flatMap((b) => b.lines)).toContain(copy.quiet.times);
    expect(houseRules.board.rows[2]!.body).toEqual([rule("quiet").rule]);
  });

  it("gives the site's address without www.", () => {
    expect(copy.lockup.url).toBe(new URL(siteUrl).host.replace(/^www\./, ""));
    expect(copy.signOff.url).toBe(copy.lockup.url);
    expect(copy.lockup.url).not.toMatch(/^www\./);
  });

  it("writes the post from the rules' own words, with the link to all of them", () => {
    const post = postCaption();
    for (const id of ["no-shoes-upstairs", "smoke-past-the-terrace", "quiet"]) {
      expect(post).toContain(rule(id).rule);
      expect(post).toContain(rule(id).why);
    }
    expect(post).toContain(rule("no-smoking").rule);
    expect(post).toContain(`Quiet hours ${times.quietHours!.value}.`);
    expect(post.trim().split("\n").at(-1)).toBe(`All the house rules: ${copy.lockup.url}/house-rules`);
    expect(houseRules.post).toContain(videoAlt);
    expect(houseRules.post).toContain(boardAlt);
  });

  it("never says what the piece must not say", () => {
    const all = [...strings(copy), ...strings(houseRules.video.captions), ...strings(houseRules.board), houseRules.post, videoAlt, boardAlt];
    expect(all.length).toBeGreaterThan(20);
    for (const text of all) {
      // No 12-hour times: "9 PM", "9PM", "7am", "9 p.m." (but not "team" or "camp").
      expect(text, text).not.toMatch(/(?:\d|\b)[ap]\.?m\.?(?![a-z])/i);
      expect(text.toLowerCase(), text).not.toContain("take of "); // the stair sign's typo
      expect(text.toLowerCase(), text).not.toContain("15 seconds");
      expect(text.toLowerCase(), text).not.toContain("soft voices");
      for (const found of text.matchAll(/on the terrace/gi)) {
        expect(text.slice(0, found.index).toLowerCase().trimEnd().endsWith("not"), text).toBe(true);
      }
    }
  });
});

describe("house rules: the committed outputs", () => {
  /*
   * The film, the GIF, the cards and the post are snapshots of the piece as built. The post's caption and alt texts
   * spell out every fact the piece reads from content/ (the rules' wording and reasons, the quiet hours, the
   * address), so when it no longer matches, the pictures are out of date too.
   */
  it("social/house-rules/house-rules-post.txt is what the piece writes: if not, rebuild every output (npm run social -- house-rules)", () => {
    const committed = readFileSync(join(process.cwd(), "social/house-rules/house-rules-post.txt"), "utf8");
    expect(committed, "The piece's facts changed: run npm run social -- house-rules --check and commit the film, the GIFs, the cards and the post.").toBe(houseRules.post);
  });

  it("hands the email its GIF tag: the @2x file at 600 × 792, with the board's alt text, on rice", () => {
    expect(emailGif.img).toBe(
      `<img src="${siteUrl}/email/house-rules@2x.gif" width="600" height="792" alt="${boardAlt}" style="display:block;width:100%;max-width:600px;height:auto;border:0">`,
    );
    expect(emailGif.cell).toBe("#fbf6ee");
    expect(houseRules.post).toContain(emailGif.img);
  });
});

describe("house rules: reading time", () => {
  it("counts words as the spec does", () => {
    expect(countWords("21:00–07:00")).toBe(2);
    expect(countWords("houseofjars.la")).toBe(1);
    expect(countWords("Smoke past the terrace, not on\u00a0it.")).toBe(7);
    expect(secondsToRead(3)).toBe(2);
  });

  it("gives every caption its words ÷ 3 + 1 seconds fully on screen", () => {
    expect(readingProblems(houseRules)).toEqual([]);
    const budget = Object.fromEntries(readingBudget(houseRules.video.captions).map((row) => [row.id, row]));
    expect(budget.title!.words).toBe(3);
    expect(budget["rule-1"]!.words).toBe(10);
    expect(budget["rule-2"]!.words).toBe(10);
    expect(budget["rule-3"]!.words).toBe(4);
    expect(budget.sleep!.words).toBe(2);
    // "Sleep well" joins the quiet tag: read together from the quiet words' arrival.
    expect(budget["rule-3+sleep"]).toMatchObject({ words: 6, needs: 3 });
    expect(budget["rule-3+sleep"]!.has).toBeCloseTo(3.48, 6);
  });

  it("reviews the film at its own moments: a plate is on screen where its colour is sampled", () => {
    expect(reviewProblems(houseRules)).toEqual([]);
    expect(reviewProblems({ ...houseRules, video: { ...houseRules.video, review: { ...houseRules.video.review, plate: 1 } } })).toHaveLength(1);
  });

  it("runs 16.000 s, 480 frames", () => {
    expect(houseRules.video.seconds).toBe(16);
    expect(houseRules.video.seconds * houseRules.video.fps).toBe(480);
  });

  it("keeps each caption's opacity at 1 for its whole window, from the same numbers", () => {
    const tracks = captionTracks(houseRules.video.captions);
    for (const window of opaqueWindows(houseRules.video.captions)) {
      const keys = tracks.find((t) => t.part === `caption-${window.id}`)!.keys;
      const to = Math.min(window.to, houseRules.video.seconds);
      // The key at or before the window's start is 1, and no key inside the window is anything else.
      const before = keys.filter(([t]) => t <= window.from + 1e-9).at(-1)!;
      expect(before[1], window.id).toBe(1);
      for (const [t, v] of keys) if (t > window.from && t < to) expect(v, `${window.id} at ${t}`).toBe(1);
    }
  });

  it("ends the film where it starts, for a seamless loop", () => {
    const evening = houseRules.video.tracks.find((t) => t.part === "evening-layer")!;
    expect(evening.keys[0]![1]).toBe("inset(0px 1080px 0px 0px)");
    const last = evening.keys.at(-1)!;
    expect(last[0]).toBeLessThan(houseRules.video.seconds - 2 / houseRules.video.fps);
    expect(last[1]).toBe("inset(0px 0px 0px 1080px)");
    const title = captionTracks(houseRules.video.captions).find((t) => t.part === "caption-title")!;
    expect(title.keys[0]).toEqual([0, 1]);
    expect(title.keys.at(-1)![1]).toBe(1);
  });
});

describe("house rules: the GIF", () => {
  it("rests, then carries the lamplight row to row: 20 frames, 8.2 s", () => {
    const frames = houseRules.gif.frames;
    expect(frames).toHaveLength(20);
    expect(frames.map((f) => f.cs)).toEqual([300, 10, 10, 10, 10, 120, 10, 10, 10, 10, 120, 10, 10, 10, 10, 120, 10, 10, 10, 10]);
    expect(frames[0]!.wash).toEqual([0, 0, 0]);
    expect(frames[5]!.wash).toEqual([1, 0, 0]);
    expect(frames[7]!.wash).toEqual([0.6, 0.4, 0]);
    expect(frames[10]!.wash).toEqual([0, 1, 0]);
    expect(frames[15]!.wash).toEqual([0, 0, 1]);
    expect(frames[19]!.wash).toEqual([0, 0, 0.2]);
  });
});
