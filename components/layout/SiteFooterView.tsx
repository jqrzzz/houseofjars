"use client";

import Link from "next/link";
import { Wordmark } from "../brand/Wordmark";
import { WovenBand } from "../brand/WovenBand";
import { AskShadowButton } from "../concierge/AskShadowButton";
import { MotionChoice } from "../motion/MotionChoice";
import { ShareButton } from "../ui/ShareButton";
import { ThemeChoices } from "./ThemeSwitch";
import styles from "./SiteFooter.module.css";

/** The footer's words, from content/ and lib/site (SiteFooter.tsx). */
export interface FooterWords {
  readonly address: readonly string[];
  readonly phone: { readonly display: string; readonly e164: string };
  readonly email: string;
  readonly whatsapp: string;
  readonly nav: readonly { readonly path: string; readonly nav: string }[];
  readonly paths: { readonly guides: string; readonly book: string; readonly privacy: string };
  readonly bookLabel: string;
  readonly elsewhere: readonly { readonly label: string; readonly href: string }[];
  readonly fullName: string;
  readonly year: number;
  readonly signIn: string | null;
}

/**
 * The view of the site footer (SiteFooter.tsx): the server reads the words
 * and passes them; this side draws them. It sits on the client side of the
 * boundary only so every page carries the footer's markup once (the HTML is
 * still rendered on the server, with every word in it), as the home page's
 * quieter sections do.
 */
export function SiteFooterView({ address, phone, email, whatsapp, nav, paths, bookLabel, elsewhere, fullName, year, signIn }: FooterWords) {
  return (
    <footer className={styles.footer}>
      <WovenBand pattern="hooks" weave />
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Wordmark tone="deep" />
          <p className={styles.tagline}>A calm house in the heart of Vientiane.</p>
          <p className={styles.team}>A team on site, day and night.</p>
          <ShareButton path="/" label="Share House of Jars" className={styles.share} />
        </div>

        <div className={`${styles.column} ${styles.wide}`}>
          <h2 className={styles.heading}>Visit</h2>
          <address className={styles.address}>
            {address.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
        </div>

        <div className={`${styles.column} ${styles.wide}`}>
          <h2 className={styles.heading}>Contact</h2>
          <p className={`${styles.phone} tnum`}>{phone.display}</p>
          <ul role="list" className={styles.list}>
            <li>
              <a href={whatsapp} rel="noopener noreferrer" target="_blank">
                WhatsApp
                <span className="visually-hidden"> {phone.display} (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`tel:${phone.e164}`}>
                Call<span className="visually-hidden"> {phone.display}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            {/*
              Shadow on every page, for keyboards too: the floating button comes last on the page, and by the time
              focus has passed the footer it has stepped aside, so this one is always there to reach.
            */}
            <li>
              <AskShadowButton className={styles.ask}>
                Ask Shadow<span className="visually-hidden">, our AI concierge</span>
              </AskShadowButton>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer" className={`${styles.column} ${styles.tall}`}>
          <h2 className={styles.heading}>The house</h2>
          <ul role="list" className={styles.list}>
            {nav.map((page) => (
              <li key={page.path}>
                <Link href={page.path}>{page.nav}</Link>
              </li>
            ))}
            <li>
              <Link href={paths.guides}>Guides</Link>
            </li>
            <li>
              <Link href={paths.book}>{bookLabel}</Link>
            </li>
            <li>
              <Link href={paths.privacy}>Privacy</Link>
            </li>
          </ul>
        </nav>

        <div className={`${styles.column} ${styles.tall}`}>
          <h2 className={styles.heading}>Elsewhere</h2>
          <ul role="list" className={styles.list}>
            {elsewhere.map((link) => (
              <li key={link.href}>
                <a href={link.href} rel="noopener noreferrer" target="_blank">
                  {link.label}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/*
          The site's two settings, side by side where they fit: last in reading order, under the first columns on
          wide screens. Shadow's dock steps aside while they are near the bottom of a phone's screen, so they can be tapped.
        */}
        <div className={styles.prefs} data-hides-launcher="">
          <ThemeChoices />
          <MotionChoice />
        </div>
      </div>
      <div className="container">
        {/* Its links run to the right edge: Shadow's floating button steps aside while they are in view. */}
        <div className={styles.base} data-hides-launcher="">
          <p>
            © {year} {fullName}
          </p>
          <p>
            Questions answered by Shadow, our AI concierge. <Link href={paths.privacy}>How we use your data</Link>
          </p>
          {signIn ? (
            <p>
              <a href={signIn} rel="nofollow">
                Team sign in
              </a>
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
