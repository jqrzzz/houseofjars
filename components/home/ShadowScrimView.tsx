"use client";

import Image from "next/image";
import { AskShadowButton } from "@/components/concierge/AskShadowButton";
import { shadowFull } from "@/components/concierge/mascot";
import { ShadowFigure } from "@/components/shadow/ShadowFigure";
import { Eyebrow } from "@/components/ui/Section";
import { ArrowIcon } from "@/components/ui/icons";
import styles from "./ShadowScrim.module.css";

const questions = [
  "What time can I check in?",
  "Is breakfast included?",
  "How do I get here from the airport?",
  "Is the house quiet at night?",
];

/**
 * The view of ④ (ShadowScrim.tsx). It sits on the client side of the
 * boundary only so the page carries its markup once (the HTML is still
 * rendered on the server, with every word in it).
 */
export function ShadowScrimView() {
  return (
    <div className={`container ${styles.grid}`}>
      <div className={styles.art} data-phrase="">
        <div className={styles.scrim} aria-hidden="true">
          <ShadowFigure variant="silhouette" className={styles.silhouette} />
        </div>
        <Image
          src={shadowFull.src}
          width={shadowFull.width}
          height={shadowFull.height}
          sizes="(min-width: 60rem) 15rem, 9rem"
          alt="Shadow, a friendly ghost butler in a brown vest, saffron bow tie and bellhop cap, holding a clipboard"
          className={styles.figure}
        />
      </div>
      <div>
        <Eyebrow number={4}>Ask Shadow</Eyebrow>
        <h2 id="shadow-title" className={styles.heading}>
          Questions at any hour? Ask Shadow.
        </h2>
        <p className={styles.lede}>
          Shadow is the house’s AI concierge. He knows the beds, the breakfast, check-in and the way from the airport, and
          he can pass a message to the team. He is an AI, so he can get things wrong: for anything important, the team is
          a message away.
        </p>
        <ul role="list" className={styles.questions}>
          {questions.map((question) => (
            <li key={question}>
              <AskShadowButton question={question}>
                <span>{question}</span>
                <ArrowIcon />
              </AskShadowButton>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
