import { BookingCard } from "@/components/BookingCard";
import { Drawing } from "@/components/art/Drawing";
import { MenuCard } from "@/components/menu/MenuCard";
import { MenuFace } from "@/components/menu/MenuFaces";
import { MenuPrintLinks } from "@/components/menu/MenuPrintLinks";
import { PageHeader } from "@/components/page/PageHeader";
import { PageJsonLd } from "@/components/PageJsonLd";
import { menu } from "@/content/menu";
import { breakfast, building } from "@/content/stay";
import { menuCard } from "@/lib/menu/card";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";
import styles from "./menu.module.css";

export const metadata = pageMetadata(pages.menu);

/*
 * The café's menu card, both sides, as the house prints it (lib/menu/card.ts,
 * drawn by MenuFace): the front for staying guests, their breakfast and what a
 * different drink adds, and the back, the café's prices. On wide screens the
 * sides lie side by side; on a phone the card turns over (MenuCard). Under it,
 * the two PDFs of the card for printing, then booking. Printed from here, the
 * page is the card alone, a side to each A4 page (menu.module.css).
 */
export default function MenuPage() {
  const { front, back } = menuCard();
  return (
    <>
      <PageHeader
        eyebrow="Café menu"
        morph="menu"
        title="Breakfast, coffee and tea."
        lede={`Breakfast is included for staying guests, served ${breakfast.hours.value}. Coffee and tea are served ${building.cafeDrinks.value}.${menu.cashOnly.value ? " The café takes cash only." : ""}`}
        art={<Drawing name="cafe" preload />}
      />

      <div className={`container ${styles.card}`}>
        <MenuCard
          front={<MenuFace side="front" medium="screen" />}
          back={<MenuFace side="back" medium="screen" />}
          plates={{ front: { name: front.title, note: "Staying guests" }, back: { name: back.title, note: back.kicker } }}
        />
      </div>

      <MenuPrintLinks />
      <BookingCard />
      <PageJsonLd path={pages.menu.path} />
    </>
  );
}
