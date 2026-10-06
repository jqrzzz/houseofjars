"use client";

import Link from "next/link";
import { PhotoFrame, type Photo } from "@/components/PhotoFrame";
import { Mark } from "@/components/brand/Mark";
import buttons from "@/components/ui/button.module.css";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./Team.module.css";

/**
 * The view of the team (Team.tsx). It sits on the client side of the
 * boundary only so the page carries its markup once (the HTML is still
 * rendered on the server, with every word in it).
 */
export function TeamView({ photo, caption, text, about }: { photo: Photo; caption: string; text: string; about: string }) {
  return (
    <div className={`container ${styles.team}`}>
      <PhotoFrame
        caption={caption}
        photo={photo}
        drawing="door"
        shape="arch"
        aspect="4 / 5"
        sizes="(min-width: 60rem) 18rem, 12rem"
        className={styles.frame}
      />
      <div className={styles.words}>
        <Mark className={styles.mark} />
        <h2 id="team-title" className={styles.heading}>
          A team on site, day and night.
        </h2>
        <p className={styles.text}>{text}</p>
        <Link href={about} className={buttons.textLink} transitionTypes={["nav-forward"]}>
          <span>About the house</span>
          <ArrowIcon />
        </Link>
      </div>
    </div>
  );
}
