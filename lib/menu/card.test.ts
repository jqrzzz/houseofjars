import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { kip, menu } from "@/content/menu";
import { breakfast, building } from "@/content/stay";
import { mappedCharacters, woff2Tables } from "@/lib/fonts/woff2";
import { cardPrices, cardText, menuCard, nameText, NO_PRICE, PLUS_WORD, type Side } from "./card";

const sides: readonly Side[] = ["front", "back"];
const card = menuCard();
const name = (item: { name: string; detail?: string }) => (item.detail ? `${item.name} ${item.detail}` : item.name);

/** A line that ends on a price: "Latte +18,000", "2 fried eggs 20,000". */
const PRICED = /(?:^| )\+?\d{1,3}(?:,\d{3})*$/;

/** Every word the card gives screen readers but doesn't show: on the sheets all the same, so drawn in the same font. */
const spoken = [card.back.drinks.columns.drink, card.back.drinks.missing.hot, card.back.drinks.missing.iced, PLUS_WORD];

describe("the menu card's prices", () => {
  it("prints every price on the front's board once, as kip(price) after a +, in the content's order", () => {
    const { stayingGuests } = menu;
    const expected = [...stayingGuests.change.value, ...stayingGuests.add.value].map((item) => `${name(item)} +${kip(item.price)}`);
    expect(cardText("front").filter((line) => PRICED.test(line))).toEqual(expected);
  });

  it("prints every café price on the back once, as kip(price) without a +, hot then iced, in the content's order", () => {
    const cell = (value: number | null) => (value === null ? NO_PRICE : kip(value));
    const drinks = menu.drinks.value.map((drink) => `${name(drink)} ${cell(drink.hot)} ${cell(drink.iced)}`);
    const food = menu.breakfast.value.map((item) => `${name(item)} ${kip(item.price)}`);
    expect(cardText("back").filter((line) => PRICED.test(line) || line.endsWith(` ${NO_PRICE}`))).toEqual([...drinks, ...food]);
    expect(cardText("back").join("\n")).not.toContain("+");
  });

  it("has 10 prices on the front (9 changes and the egg) and 18 on the back (10 hot, 6 iced, 2 breakfasts)", () => {
    expect(cardPrices("front")).toEqual([...menu.stayingGuests.change.value, ...menu.stayingGuests.add.value].map((item) => item.price));
    expect(cardPrices("front")).toHaveLength(10);
    const { rows } = card.back.drinks;
    expect(rows.filter((drink) => drink.hot)).toHaveLength(10);
    expect(rows.filter((drink) => drink.iced)).toHaveLength(6);
    expect(card.back.breakfast.rows).toHaveLength(2);
    expect(cardPrices("back")).toHaveLength(18);
    expect(cardPrices("back")).toEqual([
      ...menu.drinks.value.flatMap((drink) => [drink.hot, drink.iced].filter((value): value is number => value !== null)),
      ...menu.breakfast.value.map((item) => item.price),
    ]);
  });

  it("prints a dash exactly where the card has no price", () => {
    const { rows } = card.back.drinks;
    expect(rows.filter((drink) => drink.iced === null).map(nameText)).toEqual([
      "Espresso single",
      "Espresso double",
      "Lipton tea",
      "Honey ginger tea",
      "Fresh milk 180 ml",
    ]);
    expect(rows.filter((drink) => drink.hot === null).map(nameText)).toEqual(["Fresh milk 250 ml, cold"]);
    expect(cardText("back")).toContain(`Fresh milk 250 ml, cold ${NO_PRICE} 25,000`);
    // A dash standing alone, not the one in a time range.
    const dashes = (side: Side) => cardText(side).filter((line) => line.split(" ").includes(NO_PRICE));
    expect(dashes("back")).toHaveLength(6);
    expect(dashes("front")).toEqual([]);
  });
});

describe("the menu card's words", () => {
  it("gives the house's hours from content/stay, as unspaced ranges", () => {
    expect(breakfast.hours.value).toBe("08:00–10:30");
    expect(building.cafeDrinks.value).toBe("08:00–19:00");
    expect(card.front.hours).toEqual([`Served ${breakfast.hours.value}`]);
    expect(card.back.hours).toEqual([`Breakfast ${breakfast.hours.value}`, `Coffee and tea ${building.cafeDrinks.value}`]);
    expect(cardText("back")[2]).toBe("Breakfast 08:00–10:30 · Coffee and tea 08:00–19:00");
    for (const line of cardText("front").concat(cardText("back"))) {
      for (const [range] of line.matchAll(/\d\d:\d\d\s*[-–]\s*\d\d:\d\d/g)) expect(range).toMatch(/^\d\d:\d\d–\d\d:\d\d$/);
    }
  });

  it("reads in the order the card is laid out", () => {
    expect(cardText("front").slice(0, 7)).toEqual([
      "Breakfast",
      "For staying guests · included",
      "Served 08:00–10:30",
      "On your plate",
      "2 fried eggs, salad, baguette and fruit,",
      "with a hot Americano, a hot espresso or a hot Lipton tea.",
      "If you prefer your eggs well-done, tell the team when you order.",
    ]);
    expect(cardText("front").slice(-6)).toEqual([
      "One more coffee or tea",
      "The normal price, on the other side.",
      "Add",
      "Egg +6,000",
      "You are welcome to relax or work in the café after breakfast.",
      "Prices in Lao kip (LAK). Cash only.",
    ]);
    expect(cardText("back").slice(0, 6)).toEqual([
      "Café",
      "Coffee, tea and breakfast",
      "Breakfast 08:00–10:30 · Coffee and tea 08:00–19:00",
      "Coffee and tea",
      "Hot Iced",
      "Espresso single 26,000 –",
    ]);
    expect(cardText("back").slice(-3)).toEqual([
      "If you prefer your eggs well-done, tell the team when you order.",
      "Staying guests: your breakfast is included, on the other side.",
      "Prices in Lao kip (LAK). Cash only.",
    ]);
  });

  it("writes each line once, trimmed, with single spaces", () => {
    for (const side of sides) {
      for (const line of cardText(side)) expect(line).toMatch(/^\S(?:.*\S)?$/);
      for (const line of cardText(side)) expect(line).not.toMatch(/\s{2}/);
    }
  });

  it("is in sentence case: no capitals but LAK, and 24-hour times", () => {
    for (const side of sides) {
      const words = cardText(side).join(" ");
      expect([...words.matchAll(/\b[A-Z]{2,}\b/g)].map(([word]) => word)).toEqual(["LAK"]);
      expect(words).not.toMatch(/\d\s*(?:[AaPp]\.?[Mm]\.?)(?![\p{L}])/u);
    }
  });

  it("uses only characters the static Figtree files draw, and none of the kip sign, a thin or narrow space, a tick or an arrow", () => {
    const characters = new Set([...cardText("front"), ...cardText("back"), ...spoken].join(""));
    // Written as escapes, so the sign the card never prints isn't in its sources either.
    for (const forbidden of ["\u20ad", "\u2009", "\u202f", "\u2713", "\u2192"]) expect(characters.has(forbidden)).toBe(false);
    for (const weight of [400, 500, 600, 700]) {
      const file = readFileSync(join(process.cwd(), `node_modules/@fontsource/figtree/files/figtree-latin-${weight}-normal.woff2`));
      const mapped = mappedCharacters(woff2Tables(file).get("cmap")!);
      const missing = [...characters].filter((character) => !mapped.has(character.codePointAt(0)!));
      expect(missing, `Figtree ${weight} has no glyph for these`).toEqual([]);
    }
  });

  it("dates the card's prices by the day they were read", () => {
    expect(menu.asOf.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(`${menu.asOf.value}T00:00:00Z`))).toBe(false);
  });
});
