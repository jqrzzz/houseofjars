"use client";

import Link from "next/link";
import { Diorama } from "@/components/art/Diorama";
import { Ledger } from "@/components/ui/Ledger";
import { Eyebrow } from "@/components/ui/Section";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./Neighbourhood.module.css";

/**
 * The view of ⑤ (Neighbourhood.tsx): the server reads the place and the
 * distances from content/ and passes the words; this side draws them. It
 * sits on the client side of the boundary only so the page carries its
 * markup once (the HTML is still rendered on the server, with every word in it).
 */
export function NeighbourhoodView({
  heading,
  lede,
  places,
  links,
}: {
  heading: string;
  lede: string;
  places: readonly (readonly [place: string, distance: string])[];
  links: readonly (readonly [href: string, label: string])[];
}) {
  return (
    <div className="container">
      <div className={styles.split}>
        <div className={styles.intro}>
          <Eyebrow number={5} morph="vientiane">
            The neighbourhood
          </Eyebrow>
          <h2 id="area-title" className={styles.heading}>
            {heading}
          </h2>
          <p className={styles.lede}>{lede}</p>
          <div className={styles.links}>
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={buttons.textLink} transitionTypes={["nav-forward"]}>
                <span>{label}</span>
                <ArrowIcon />
              </Link>
            ))}
          </div>
        </div>
        <Ledger rows={places.map(([term, value]) => ({ term, value }))} variant="places" />
      </div>
      <Diorama variant="home" className={styles.diorama} />
    </div>
  );
}
