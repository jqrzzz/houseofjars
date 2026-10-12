import { fact } from "./fact";
import { sources } from "./sources";

/*
 * The café's menu, as the house prints it: the menu card on the café's
 * tables, photographed by the team (photos/menus/cafe-menu.jpg, the back of
 * the card, and breakfast-menu-staying-guests.jpg, its front). Prices are in
 * Lao kip, as the house's room rate sign writes them (LAK); the menu itself
 * prints the numbers alone. Names are the menu's, in sentence case ("Latte
 * Coffee" is a latte). lib/menu/card.ts sets them out as the card, both
 * sides, which the menu page (app/menu) shows and the two PDFs print.
 */

/** A price in Lao kip, as the menu prints it (20,000). */
export type Kip = number;

export interface MenuDrink {
  readonly name: string;
  /** The menu's small print after the name: "single", "180 ml". */
  readonly detail?: string;
  /** null: the menu has no hot or iced price for it ("-", or left blank for honey ginger tea iced). */
  readonly hot: Kip | null;
  readonly iced: Kip | null;
}

export interface MenuItem {
  readonly name: string;
  readonly detail?: string;
  readonly price: Kip;
}

export const menu = {
  /**
   * The day these prices were read from the cards (YYYY-MM-DD). The PDFs keep it
   * in their properties as their date; the card itself never shows it, since a
   * dated card looks stale.
   */
  asOf: fact("2026-10-04", sources.signs, {
    note: "The day the team photographed both menus; change it with the prices; the PDFs carry it as their date.",
  }),
  /** The café menu's coffee and tea, hot and iced. */
  drinks: fact<readonly MenuDrink[]>(
    [
      { name: "Espresso", detail: "single", hot: 26_000, iced: null },
      { name: "Espresso", detail: "double", hot: 34_000, iced: null },
      { name: "Americano", hot: 30_000, iced: 35_000 },
      { name: "Cappuccino", hot: 42_000, iced: 45_000 },
      { name: "Latte", hot: 42_000, iced: 45_000 },
      { name: "Mocha", hot: 45_000, iced: 55_000 },
      { name: "Chocolate", hot: 42_000, iced: 50_000 },
      { name: "Lipton tea", hot: 10_000, iced: null },
      { name: "Honey ginger tea", hot: 25_000, iced: null },
      { name: "Fresh milk", detail: "180 ml", hot: 25_000, iced: null },
      { name: "Fresh milk", detail: "250 ml, cold", hot: null, iced: 25_000 },
    ],
    sources.signs,
    { note: "Café menu, Coffee & Tea: HOT and ICE columns." },
  ),
  /** Breakfast from the café menu, for anyone (staying guests have theirs included). */
  breakfast: fact<readonly MenuItem[]>(
    [
      { name: "2 fried eggs", price: 20_000 },
      { name: "2 fried eggs, baguette", price: 32_000 },
    ],
    sources.signs,
    { note: "Café menu, Breakfast." },
  ),
  /** Both menus, under breakfast. */
  eggs: fact("If you prefer your eggs well-done, tell the team when you order.", sources.signs, {
    note: 'Both menus: "(If you prefer your eggs well-done, let our staff know when placing your order)".',
  }),
  /** Staying guests' breakfast, included in the room rate. */
  stayingGuests: {
    plate: fact<readonly string[]>(["2 fried eggs", "salad", "baguette", "fruit"], sources.signs, {
      note: 'Breakfast menu, Staying Guest: "2 Fried Eggs, Salad, Baguette, Fruit".',
    }),
    drink: fact<readonly string[]>(["hot Americano", "hot espresso", "hot Lipton tea"], sources.signs, {
      note: 'Breakfast menu, Staying Guest: "Hot Americano or Hot Espresso or Hot Lipton Tea".',
    }),
    /** "Change your coffee or tea: pay additional": what each other drink adds. */
    change: fact<readonly MenuItem[]>(
      [
        { name: "Espresso", detail: "double", price: 10_000 },
        { name: "Americano", detail: "iced", price: 12_000 },
        { name: "Cappuccino", price: 18_000 },
        { name: "Latte", price: 18_000 },
        { name: "Mocha", price: 18_000 },
        { name: "Chocolate", price: 18_000 },
        { name: "Fresh milk", detail: "180 ml, hot", price: 15_000 },
        { name: "Fresh milk", detail: "250 ml, cold", price: 15_000 },
        { name: "Honey ginger tea", price: 15_000 },
      ],
      sources.signs,
      { note: 'Breakfast menu: "Change your coffee or tea. Pay additional".' },
    ),
    another: fact("One more coffee or tea: the normal price, from the café menu.", sources.signs, {
      note: 'Breakfast menu: "One more coffee or tea. Pay the normal price listed on the back page of this menu".',
    }),
    add: fact<readonly MenuItem[]>([{ name: "Egg", price: 6_000 }], sources.signs, { note: 'Breakfast menu: "Add Egg 6,000".' }),
  },
  after: fact("You are welcome to relax or work in the café after breakfast.", sources.signs, {
    note: 'Breakfast menu: "You are welcome to enjoy the cafe for relaxation or work after breakfast hours. Kindly ensure that all guests have had their breakfast before using the space."',
  }),
  cashOnly: fact(true, sources.signs, { note: 'Café menu: "(Kindly note that we only accept cash payments)".' }),
} as const;

/** A price as the menu prints it: 26,000. */
export function kip(price: Kip): string {
  return price.toLocaleString("en-US");
}
