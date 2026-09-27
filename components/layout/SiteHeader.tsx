import Link from "next/link";
import { Wordmark } from "../brand/Wordmark";
import buttons from "../ui/button.module.css";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    // Named inline (a CSS module would scope the name): the header holds still while pages change beneath it.
    <header className={styles.header} style={{ viewTransitionName: "site-header" }} data-site-header="">
      <div className={`container ${styles.inner}`}>
        <Wordmark />
        <nav aria-label="Main" className={styles.desktopNav}>
          <NavLinks className={styles.links} linkClassName={styles.link} />
        </nav>
        <div className={styles.actions}>
          <Link href="/book" className={`${buttons.button} ${buttons.primary} ${buttons.small}`}>
            Book
          </Link>
          <MobileMenu className={styles.mobileMenu} summaryClassName={styles.menuButton}>
            <nav aria-label="Main" className={styles.mobilePanel}>
              <NavLinks className={styles.mobileLinks} linkClassName={styles.mobileLink} />
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
