import Link from "next/link";
import { addressLines, identity, whatsappUrl } from "@/content/identity";
import { pages, primaryNav, teamSignInUrl } from "@/lib/site";
import { TextileBand } from "../brand/TextileBand";
import { Wordmark } from "../brand/Wordmark";
import styles from "./SiteFooter.module.css";

const elsewhere = [
  { label: "Booking.com", href: identity.links.booking.value },
  { label: "Agoda", href: identity.links.agoda.value },
  { label: "Tripadvisor", href: identity.links.tripadvisor.value },
  { label: "Facebook", href: identity.links.facebook.value },
];

export function SiteFooter() {
  const { phone, email } = identity.contact;
  const signIn = teamSignInUrl();
  return (
    <footer className={styles.footer}>
      <TextileBand pattern="hooks" weave="view" />
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <Wordmark tone="deep" />
          <p className={styles.tagline}>A calm house in the heart of Vientiane.</p>
          <p className={styles.owner}>Owned and run by {identity.owner.name.value}.</p>
        </div>

        <div className={`${styles.column} ${styles.wide}`}>
          <h2 className={styles.heading}>Visit</h2>
          <address className={styles.address}>
            {addressLines().map((line) => (
              <span key={line}>{line}</span>
            ))}
          </address>
        </div>

        <div className={`${styles.column} ${styles.wide}`}>
          <h2 className={styles.heading}>Contact</h2>
          <p className={`${styles.phone} tnum`}>{phone.value.display}</p>
          <ul role="list" className={styles.list}>
            <li>
              <a href={whatsappUrl()} rel="noopener noreferrer" target="_blank">
                WhatsApp
                <span className="visually-hidden"> {phone.value.display} (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`tel:${phone.value.e164}`}>
                Call<span className="visually-hidden"> {phone.value.display}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${email.value}`}>{email.value}</a>
            </li>
          </ul>
        </div>

        <nav aria-label="Footer" className={styles.column}>
          <h2 className={styles.heading}>The house</h2>
          <ul role="list" className={styles.list}>
            {primaryNav.map((page) => (
              <li key={page.path}>
                <Link href={page.path}>{page.nav}</Link>
              </li>
            ))}
            <li>
              <Link href={pages.guides.path}>Guides</Link>
            </li>
            <li>
              <Link href={pages.book.path}>Prices and booking</Link>
            </li>
            <li>
              <Link href={pages.privacy.path}>Privacy</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.column}>
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
      </div>
      <div className="container">
        <div className={styles.base}>
          <p>
            © {new Date().getFullYear()} {identity.fullName.value}
          </p>
          <p>
            Questions answered by Shadow, our AI concierge. <Link href={pages.privacy.path}>How we use your data</Link>
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
