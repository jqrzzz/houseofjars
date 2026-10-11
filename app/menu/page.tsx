import { BookingCard } from "@/components/BookingCard";
import { Drawing } from "@/components/art/Drawing";
import { Mark } from "@/components/brand/Mark";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { kip, menu, type MenuItem } from "@/content/menu";
import { breakfast, building } from "@/content/stay";
import { joinList, orList } from "@/content/text";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./menu.module.css";

export const metadata = pageMetadata(pages.menu);

const { stayingGuests } = menu;

/** "Espresso" with its small print: "single", "180 ml". */
function Name({ item }: { item: { name: string; detail?: string } }) {
  return (
    <>
      {item.name}
      {item.detail ? <span className={styles.detail}> {item.detail}</span> : null}
    </>
  );
}

/** A list of things with their prices, a dotted line between. */
function PriceList({ items, label }: { items: readonly MenuItem[]; label: string }) {
  return (
    <ul className={styles.prices} aria-label={label}>
      {items.map((item) => (
        <li key={`${item.name} ${item.detail ?? ""}`} className={styles.price}>
          <span className={styles.item}>
            <Name item={item} />
          </span>
          <span className={styles.leader} aria-hidden="true" />
          <span className={styles.amount}>{kip(item.price)}</span>
        </li>
      ))}
    </ul>
  );
}

const footnote = `Prices in Lao kip (LAK).${menu.cashOnly.value ? " Cash only." : ""}`;

/*
 * The café's menu card, both sides, as the house prints it: the front for
 * staying guests (their breakfast, and what a different drink adds), the back
 * the café's prices. On screen the two sides sit side by side (stacked on
 * phones); printed on A4, each side is a page of its own, ready to laminate
 * (menu.module.css, @media print).
 */
export default function MenuPage() {
  return (
    <>
      <PageHeader
        eyebrow="Café menu"
        morph="menu"
        title="Breakfast, coffee and tea."
        lede={`Breakfast is included for staying guests, served ${breakfast.hours.value}. Coffee and tea are served ${building.cafeDrinks.value}.${menu.cashOnly.value ? " The café takes cash only." : ""}`}
        art={<Drawing name="cafe" preload />}
      />

      <div className={`container ${styles.sheets}`}>
        <article className={`${styles.sheet} ${styles.front}`} aria-labelledby="menu-front-title">
          <header className={styles.top}>
            <div>
              <h2 id="menu-front-title" className={styles.title}>
                Breakfast
              </h2>
              <p className={styles.kicker}>For staying guests · included</p>
            </div>
            <Mark className={styles.mark} />
          </header>
          <p className={styles.hours}>Served {breakfast.hours.value}</p>

          <section className={styles.part} aria-labelledby="menu-plate">
            <h3 id="menu-plate" className={styles.partTitle}>
              On your plate
            </h3>
            <p className={styles.plate}>{joinList(stayingGuests.plate.value)},</p>
            <p className={styles.plate}>with {orList(stayingGuests.drink.value.map((drink) => `a ${drink}`))}.</p>
            <p className={styles.small}>{menu.eggs.value}</p>
          </section>

          <section className={styles.part} aria-labelledby="menu-change">
            <h3 id="menu-change" className={styles.partTitle}>
              Change your coffee or tea <span className={styles.partNote}>Pay the extra</span>
            </h3>
            <PriceList items={stayingGuests.change.value} label="Change your coffee or tea" />
          </section>

          <section className={styles.part} aria-labelledby="menu-more">
            <h3 id="menu-more" className={styles.partTitle}>
              One more coffee or tea
            </h3>
            <p className={styles.small}>The normal price, on the other side.</p>
          </section>

          <section className={styles.part} aria-labelledby="menu-add">
            <h3 id="menu-add" className={styles.partTitle}>
              Add
            </h3>
            <PriceList items={stayingGuests.add.value} label="Add" />
          </section>

          <footer className={styles.foot}>
            <p>{menu.after.value}</p>
            <p>{footnote}</p>
          </footer>
        </article>

        <article className={`${styles.sheet} ${styles.back}`} aria-labelledby="menu-back-title">
          <header className={styles.top}>
            <div>
              <h2 id="menu-back-title" className={styles.title}>
                Café
              </h2>
              <p className={styles.kicker}>Coffee, tea and breakfast</p>
            </div>
            <Mark className={styles.mark} />
          </header>
          <p className={styles.hours}>
            Breakfast {breakfast.hours.value} · Coffee and tea {building.cafeDrinks.value}
          </p>

          <section className={styles.part} aria-labelledby="menu-drinks">
            <h3 id="menu-drinks" className={styles.partTitle}>
              Coffee and tea
            </h3>
            <table className={styles.drinks}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Drink</span>
                  </th>
                  <th scope="col">Hot</th>
                  <th scope="col">Iced</th>
                </tr>
              </thead>
              <tbody>
                {menu.drinks.value.map((drink) => (
                  <tr key={`${drink.name} ${drink.detail ?? ""}`}>
                    <th scope="row">
                      <Name item={drink} />
                    </th>
                    <td>{drink.hot === null ? <None /> : kip(drink.hot)}</td>
                    <td>{drink.iced === null ? <None /> : kip(drink.iced)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={styles.part} aria-labelledby="menu-breakfast">
            <h3 id="menu-breakfast" className={styles.partTitle}>
              Breakfast
            </h3>
            <PriceList items={menu.breakfast.value} label="Breakfast" />
            <p className={styles.small}>{menu.eggs.value}</p>
          </section>

          <footer className={styles.foot}>
            <p>Staying guests: your breakfast is included, on the other side.</p>
            <p>{footnote}</p>
          </footer>
        </article>
      </div>

      <BookingCard />
      <PageJsonLd path={pages.menu.path} />
    </>
  );
}

/** Not on the menu, hot or iced. */
function None() {
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="visually-hidden">not served</span>
    </>
  );
}
