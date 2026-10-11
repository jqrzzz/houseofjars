import { Fragment } from "react";
import { ArchWisp } from "@/components/art/ArchWisp";
import { Mark } from "@/components/brand/Mark";
import { HouseIcon } from "@/components/ui/HouseIcon";
import {
  HOURS_JOIN,
  menuCard,
  nameText,
  NO_PRICE,
  PLUS_WORD,
  type CardName,
  type CardPrice,
  type OtherSide,
  type PriceRow,
  type Side,
} from "@/lib/menu/card";
import styles from "./MenuFaces.module.css";
import sheet from "./MenuSheet.module.css";

export type { Side } from "@/lib/menu/card";

/**
 * Where a face is drawn: on the menu page ("screen", which the page's own
 * print uses too), or in the printed card's PDFs ("print"). The words are the
 * same; only the screen has links and steam.
 */
export type Medium = "screen" | "print";

/** Each side's id (the page's #breakfast and #cafe) and its title's id. */
const IDS = {
  front: { face: "breakfast", title: "menu-front-title" },
  back: { face: "cafe", title: "menu-back-title" },
} as const;

/** The steam's height in pixels: MenuFaces.module.css sets its mouth on the cup's middle steam bar from it. */
const WISP_SIZE = 28;

/*
 * One side of the café's menu card (lib/menu/card.ts), drawn the same for the
 * menu page and for the printed card, so the PDFs show exactly what the page
 * shows. On screen the "on the other side" phrases are links to the other
 * side, and steam rises once from the cup over the Hot column; in print they
 * are plain words and the cup stands alone. Server-safe (no hooks), so the
 * print engine (npm run menu:pdf) renders it outside Next.
 *
 * The page's island (components/menu/MenuCard.tsx) finds the faces by
 * data-face, their titles by id (focusable from script: tabIndex -1) and the
 * in-card links by data-side-link; every price carries data-price for the
 * print engine's checks.
 */
export function MenuFace({ side, medium }: { side: Side; medium: Medium }) {
  return side === "front" ? <Front medium={medium} /> : <Back medium={medium} />;
}

function Front({ medium }: { medium: Medium }) {
  const { front } = menuCard();
  const { plate, board, foot } = front;
  return (
    <article id={IDS.front.face} className={`${styles.face} ${styles.front} ${sheet.sheet}`} data-face="front" aria-labelledby={IDS.front.title}>
      <Top id={IDS.front.title} title={front.title} kicker={front.kicker} mark={styles.markWhite} />
      <Hours parts={front.hours} />

      <section className={styles.part}>
        <h3 className={styles.head}>{plate.title}</h3>
        <p className={styles.plate}>
          {plate.lines[0]}
          <br />
          {plate.lines[1]}
        </p>
        <p className={styles.small}>{plate.note}</p>
      </section>

      {/* Everything that costs extra, on white: long text never sits on the orange. */}
      <div className={styles.board}>
        <section className={styles.part}>
          <div className={styles.head}>
            <h3 id="menu-change" className={styles.headTitle}>
              {board.change.title}
            </h3>
            <p className={styles.note}>{board.change.note}</p>
          </div>
          <PriceList rows={board.change.rows} labelledBy="menu-change" />
        </section>

        <section className={styles.part}>
          <h3 className={styles.head}>{board.another.title}</h3>
          <p className={styles.small}>
            <SideWords text={board.another.text} medium={medium} />
          </p>
        </section>

        <section className={styles.part}>
          <h3 id="menu-add" className={styles.head}>
            {board.add.title}
          </h3>
          <PriceList rows={board.add.rows} labelledBy="menu-add" />
        </section>
      </div>

      <footer className={styles.foot}>
        <p>{foot.welcome}</p>
        <p className={styles.footnote}>{foot.footnote}</p>
      </footer>
    </article>
  );
}

function Back({ medium }: { medium: Medium }) {
  const { back } = menuCard();
  const { drinks, breakfast, foot } = back;
  return (
    <article id={IDS.back.face} className={`${styles.face} ${styles.back} ${sheet.sheet}`} data-face="back" aria-labelledby={IDS.back.title}>
      <Top id={IDS.back.title} title={back.title} kicker={back.kicker} mark={styles.markOrange} />
      <Hours parts={back.hours} />

      <section className={styles.part}>
        <h3 id="menu-drinks" className={styles.head}>
          {drinks.title}
        </h3>
        <table className={styles.drinks} aria-labelledby="menu-drinks">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">{drinks.columns.drink}</span>
              </th>
              {/* On screen the Hot head is a phrase (StageLife): when it is first seen, steam rises from the cup, once. */}
              <th scope="col" data-phrase={medium === "screen" ? "" : undefined}>
                <span className={styles.column}>
                  <span className={styles.cup}>
                    <HouseIcon name="coffee" className={styles.columnIcon} />
                    {medium === "screen" ? <ArchWisp size={WISP_SIZE} onPaper className={styles.wisp} /> : null}
                  </span>
                  {drinks.columns.hot}
                </span>
              </th>
              <th scope="col">
                <span className={styles.column}>
                  <HouseIcon name="glass" className={styles.columnIcon} />
                  {drinks.columns.iced}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {drinks.rows.map((drink) => (
              <tr key={nameText(drink)}>
                <th scope="row" className={styles.name}>
                  <Name item={drink} />
                </th>
                <PriceCell value={drink.hot} missing={drinks.missing.hot} />
                <PriceCell value={drink.iced} missing={drinks.missing.iced} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.part}>
        <h3 id="menu-breakfast" className={styles.head}>
          {breakfast.title}
        </h3>
        <PriceList rows={breakfast.rows} labelledBy="menu-breakfast" />
        <p className={styles.small}>{breakfast.note}</p>
      </section>

      <footer className={styles.foot}>
        <p>
          <SideWords text={foot.included} medium={medium} />
        </p>
        <p className={styles.footnote}>{foot.footnote}</p>
      </footer>
    </article>
  );
}

/** A side's title and the line under it, with the arch mark to the right. */
function Top({ id, title, kicker, mark }: { id: string; title: string; kicker: string; mark: string | undefined }) {
  return (
    <header className={styles.top}>
      <div>
        <h2 id={id} className={styles.title} tabIndex={-1}>
          {title}
        </h2>
        <p className={styles.kicker}>{kicker}</p>
      </div>
      <Mark className={`${styles.mark} ${mark}`} />
    </header>
  );
}

/** The hours, each time kept on one line with its label, so a phone breaks the line only between them. */
function Hours({ parts }: { parts: readonly string[] }) {
  return (
    <p className={styles.hours}>
      {parts.map((part, index) => (
        <Fragment key={part}>
          {index > 0 ? HOURS_JOIN : null}
          <span className={styles.together}>{part}</span>
        </Fragment>
      ))}
    </p>
  );
}

/** "Espresso" with its small print: "single", "250 ml, cold". */
function Name({ item }: { item: CardName }) {
  return (
    <>
      {item.name}
      {item.detail ? (
        <>
          {" "}
          <span className={styles.detail}>{item.detail}</span>
        </>
      ) : null}
    </>
  );
}

/**
 * A list of things with their prices: the name, a leader of round dots, then
 * the price in a column as wide as "+18,000", so the dots line up from row
 * to row. The spaces between the parts are for anything that reads the text;
 * the row's layout ignores them.
 */
function PriceList({ rows, labelledBy }: { rows: readonly PriceRow[]; labelledBy: string }) {
  return (
    <ul className={styles.list} aria-labelledby={labelledBy}>
      {rows.map((row) => (
        <li key={nameText(row)} className={styles.row}>
          <span className={styles.name}>
            <Name item={row} />
          </span>{" "}
          <Leader /> <Price value={row.price} />
        </li>
      ))}
    </ul>
  );
}

/**
 * The dots from a name to its price, where full stops would sit: an SVG line
 * with round caps, drawn from its right end (the price's side), so every
 * row's dots fall in the same columns. CSS dotted borders print as square
 * dots, and in faint colours as transparency. Decorative.
 */
function Leader() {
  return (
    <svg className={styles.leader} aria-hidden="true" focusable="false">
      <line x1="100%" y1="50%" x2="0" y2="50%" />
    </svg>
  );
}

/** A price, "+" and all; a screen reader hears "plus" for the "+". */
function Price({ value }: { value: CardPrice }) {
  return (
    <span className={styles.price} data-price={value.kip}>
      {value.sign ? (
        <>
          <span className="visually-hidden">{PLUS_WORD} </span>
          <span aria-hidden="true">{value.sign}</span>
        </>
      ) : null}
      {value.amount}
    </span>
  );
}

/** A drinks table cell: the price, or a dash that is read out as "no iced price". */
function PriceCell({ value, missing }: { value: CardPrice | null; missing: string }) {
  return (
    <td>
      {value ? (
        <Price value={value} />
      ) : (
        <>
          <span className={styles.none} aria-hidden="true">
            {NO_PRICE}
          </span>
          <span className="visually-hidden">{missing}</span>
        </>
      )}
    </td>
  );
}

/** "The normal price, on the other side.": on screen the phrase is a link that turns the card (components/menu/MenuCard.tsx). */
function SideWords({ text, medium }: { text: OtherSide; medium: Medium }) {
  return (
    <>
      {text.before}
      {medium === "screen" ? (
        <a href={`#${IDS[text.to].face}`} className={styles.sideLink} data-side-link={text.to}>
          <span>{text.phrase}</span>
        </a>
      ) : (
        text.phrase
      )}
      {text.after}
    </>
  );
}
