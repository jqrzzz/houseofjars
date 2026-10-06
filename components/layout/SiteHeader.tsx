import { onlineBookingConfigured } from "@/lib/booking/config";
import { Wordmark } from "../brand/Wordmark";
import buttons from "../ui/button.module.css";
import { MotionChoice } from "../motion/MotionChoice";
import { BookLink } from "./BookLink";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";
import { ThemeChoices, ThemeToggle } from "./ThemeSwitch";
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
          <ThemeToggle className={styles.themeToggle} />
          {/* On /book: the form, online booking's or the dates to send (app/book/page.tsx). */}
          <BookLink form={onlineBookingConfigured() ? "book-online" : "message"} className={`${buttons.button} ${buttons.primary} ${buttons.small}`}>
            Book
          </BookLink>
          <MobileMenu className={styles.mobileMenu} summaryClassName={styles.menuButton}>
            <nav aria-label="Main" className={styles.mobilePanel}>
              <NavLinks className={styles.mobileLinks} linkClassName={styles.mobileLink} />
              <div className={styles.mobilePrefs}>
                <ThemeChoices tone="page" />
                <MotionChoice tone="page" />
              </div>
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
