"use client";

import Link from "next/link";
import { Drawing } from "@/components/art/Drawing";
import type { DrawingName } from "@/components/art/drawings";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./RoomNiches.module.css";

/**
 * The view of the rooms (RoomNiches.tsx): the server writes the words from
 * content/ and passes them; this side draws them. It sits on the client side
 * of the boundary only so the page carries its markup once (the HTML is
 * still rendered on the server, with every word in it).
 */
export function RoomNichesView({ rooms, more }: { rooms: readonly (readonly [drawing: DrawingName, title: string, text: string])[]; more: string }) {
  return (
    <div id="after-house-story" className={`container ${styles.block}`}>
      <ul role="list" className={styles.rooms}>
        {rooms.map(([drawing, title, text]) => (
          <li key={title}>
            <div aria-hidden="true">
              <span>
                <Drawing name={drawing} sizes="(min-width: 48rem) 20rem, 6rem" />
              </span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>
      <Link href={more} className={buttons.textLink} transitionTypes={["nav-forward"]}>
        <span>Everything about the house</span>
        <ArrowIcon />
      </Link>
    </div>
  );
}
