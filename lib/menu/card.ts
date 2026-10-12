import { kip, menu, type Kip, type MenuItem } from "@/content/menu";
import { breakfast, building } from "@/content/stay";
import { joinList, orList } from "@/content/text";

/*
 * The café's menu card, both sides, as words and prices: the one place its
 * wording is put together (kip(), joinList(), orList(), and the "+" before
 * what an extra adds), from content/menu.ts and content/stay.ts. MenuFace
 * (components/menu/MenuFaces.tsx) draws it on the menu page and on the two
 * printed PDFs; cardText() and cardPrices() are what the tests and the print
 * engine (npm run menu:pdf) hold the drawn card and the PDFs to.
 */

/** The card's two sides: the front (staying guests' breakfast, on jar orange) and the back (the café, on white). */
export type Side = "front" | "back";

/** Something on the card with its small print: "Espresso" and "single". */
export interface CardName {
  readonly name: string;
  /** The menu's small print after the name, set smaller: "single", "250 ml, cold". */
  readonly detail?: string;
}

/** A price as the card prints it. */
export interface CardPrice {
  /** In kip: what the drawn price carries as data-price. */
  readonly kip: Kip;
  /** "+" before what an extra adds to the breakfast (the front's board); "" for a price of its own. */
  readonly sign: "+" | "";
  /** The number as the menu prints it: "10,000". */
  readonly amount: string;
}

/** A line of a price list: the name, a leader of dots, then the price. */
export interface PriceRow extends CardName {
  readonly price: CardPrice;
}

/** A row of the drinks table. null where the card has no hot or no iced price: it prints a dash. */
export interface DrinkRow extends CardName {
  readonly hot: CardPrice | null;
  readonly iced: CardPrice | null;
}

/** Words that send the guest to the other side of the card. On screen the phrase is a link to it. */
export interface OtherSide {
  readonly before: string;
  readonly phrase: string;
  readonly after: string;
  /** The side the phrase leads to. */
  readonly to: Side;
}

export interface FrontFace {
  readonly side: "front";
  readonly title: string;
  readonly kicker: string;
  /** The hours, a time with its label in each part: shown joined by " · " (HOURS_JOIN), each part kept on one line. */
  readonly hours: readonly string[];
  /** What a staying guest's breakfast is: one paragraph set as two lines, then the eggs note. */
  readonly plate: { readonly title: string; readonly lines: readonly [string, string]; readonly note: string };
  /** The white board: everything that costs extra. */
  readonly board: {
    readonly change: { readonly title: string; readonly note: string; readonly rows: readonly PriceRow[] };
    readonly another: { readonly title: string; readonly text: OtherSide };
    readonly add: { readonly title: string; readonly rows: readonly PriceRow[] };
  };
  readonly foot: { readonly welcome: string; readonly footnote: string };
}

export interface BackFace {
  readonly side: "back";
  readonly title: string;
  readonly kicker: string;
  /** As on the front: "Breakfast 08:00–10:30" and "Coffee and tea 08:00–19:00". */
  readonly hours: readonly string[];
  readonly drinks: {
    readonly title: string;
    /** The column heads. The first is read out but not shown: the names need no heading on the card. */
    readonly columns: { readonly drink: string; readonly hot: string; readonly iced: string };
    /** Read out where a dash is shown. */
    readonly missing: { readonly hot: string; readonly iced: string };
    readonly rows: readonly DrinkRow[];
  };
  readonly breakfast: { readonly title: string; readonly rows: readonly PriceRow[]; readonly note: string };
  readonly foot: { readonly included: OtherSide; readonly footnote: string };
}

export interface MenuCard {
  readonly front: FrontFace;
  readonly back: BackFace;
}

/** What the card prints where it has no price, hot or iced: an en dash. */
export const NO_PRICE = "–";

/** What a screen reader is given for the "+" before an extra, which some read as nothing at all. */
export const PLUS_WORD = "plus";

/** Between the parts of the hours: "Breakfast 08:00–10:30 · Coffee and tea 08:00–19:00". */
export const HOURS_JOIN = " · ";

const price = (value: Kip, sign: CardPrice["sign"] = ""): CardPrice => ({ kip: value, sign, amount: kip(value) });

const row = (item: MenuItem, sign: CardPrice["sign"] = ""): PriceRow => ({
  name: item.name,
  ...(item.detail ? { detail: item.detail } : {}),
  price: price(item.price, sign),
});

const { stayingGuests } = menu;

// The menu prints bare numbers; the house's room rate sign names the currency (LAK). Both sides end on it.
const footnote = `Prices in Lao kip (LAK).${menu.cashOnly.value ? " Cash only." : ""}`;

const card: MenuCard = {
  front: {
    side: "front",
    title: "Breakfast",
    kicker: "For staying guests · included",
    hours: [`Served ${breakfast.hours.value}`],
    plate: {
      title: "On your plate",
      lines: [`${joinList(stayingGuests.plate.value)},`, `with ${orList(stayingGuests.drink.value.map((drink) => `a ${drink}`))}.`],
      note: menu.eggs.value,
    },
    board: {
      change: {
        title: "Change your coffee or tea",
        note: "Pay the extra",
        rows: stayingGuests.change.value.map((item) => row(item, "+")),
      },
      another: {
        title: "One more coffee or tea",
        text: { before: "The normal price, ", phrase: "on the other side", after: ".", to: "back" },
      },
      add: { title: "Add", rows: stayingGuests.add.value.map((item) => row(item, "+")) },
    },
    foot: { welcome: menu.after.value, footnote },
  },
  back: {
    side: "back",
    title: "Café",
    kicker: "Coffee, tea and breakfast",
    hours: [`Breakfast ${breakfast.hours.value}`, `Coffee and tea ${building.cafeDrinks.value}`],
    drinks: {
      title: "Coffee and tea",
      columns: { drink: "Drink", hot: "Hot", iced: "Iced" },
      missing: { hot: "no hot price", iced: "no iced price" },
      rows: menu.drinks.value.map((drink) => ({
        name: drink.name,
        ...(drink.detail ? { detail: drink.detail } : {}),
        hot: drink.hot === null ? null : price(drink.hot),
        iced: drink.iced === null ? null : price(drink.iced),
      })),
    },
    breakfast: { title: "Breakfast", rows: menu.breakfast.value.map((item) => row(item)), note: menu.eggs.value },
    foot: {
      included: { before: "Staying guests: your breakfast is included, ", phrase: "on the other side", after: ".", to: "front" },
      footnote,
    },
  },
};

/** The card, both sides. */
export function menuCard(): MenuCard {
  return card;
}

/** "Espresso single": a name and its small print, as they read. */
export function nameText(item: CardName): string {
  return item.detail ? `${item.name} ${item.detail}` : item.name;
}

/** "+10,000", or "26,000". */
export function priceText(value: CardPrice): string {
  return `${value.sign}${value.amount}`;
}

/** "The normal price, on the other side." */
export function otherSideText(text: OtherSide): string {
  return `${text.before}${text.phrase}${text.after}`;
}

const rowText = (line: PriceRow) => `${nameText(line)} ${priceText(line.price)}`;
const cellText = (cell: CardPrice | null) => (cell ? priceText(cell) : NO_PRICE);

/**
 * The words a side shows, line by line in reading order: each heading,
 * paragraph line, list row and table row is a line, a row's parts joined by
 * single spaces ("Latte 42,000 45,000", "Fresh milk 250 ml, cold – 25,000").
 * Words only read out (the hidden column head, "plus", "no iced price") are
 * not shown, so they are not here.
 */
export function cardText(side: Side): string[] {
  if (side === "front") {
    const { front } = card;
    const { plate, board, foot } = front;
    return [
      front.title,
      front.kicker,
      front.hours.join(HOURS_JOIN),
      plate.title,
      ...plate.lines,
      plate.note,
      board.change.title,
      board.change.note,
      ...board.change.rows.map(rowText),
      board.another.title,
      otherSideText(board.another.text),
      board.add.title,
      ...board.add.rows.map(rowText),
      foot.welcome,
      foot.footnote,
    ];
  }
  const { back } = card;
  const { drinks, foot } = back;
  return [
    back.title,
    back.kicker,
    back.hours.join(HOURS_JOIN),
    drinks.title,
    `${drinks.columns.hot} ${drinks.columns.iced}`,
    ...drinks.rows.map((drink) => `${nameText(drink)} ${cellText(drink.hot)} ${cellText(drink.iced)}`),
    back.breakfast.title,
    ...back.breakfast.rows.map(rowText),
    back.breakfast.note,
    otherSideText(foot.included),
    foot.footnote,
  ];
}

/** Every price on a side, in kip, in reading order (hot before iced along each row): what the drawn card's data-price values must be. */
export function cardPrices(side: Side): Kip[] {
  if (side === "front") {
    const { board } = card.front;
    return [...board.change.rows, ...board.add.rows].map((line) => line.price.kip);
  }
  const { drinks, breakfast: food } = card.back;
  return [
    ...drinks.rows.flatMap((drink) => [drink.hot, drink.iced].flatMap((cell) => (cell ? [cell.kip] : []))),
    ...food.rows.map((line) => line.price.kip),
  ];
}
