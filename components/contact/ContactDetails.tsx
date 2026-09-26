import { identity, whatsappUrl } from "@/content/identity";
import { ExternalIcon, MailIcon, WhatsAppIcon } from "../ui/icons";
import styles from "./ContactDetails.module.css";
import { CopyButton } from "./CopyButton";

/**
 * The team's WhatsApp number and email as plain, selectable text with a
 * copy button and a link each: the fallback wherever a form or Shadow
 * can't get through.
 */
export function ContactDetails({ compact = false }: { compact?: boolean }) {
  const { phone, email } = identity.contact;
  return (
    <ul role="list" className={`${styles.list} ${compact ? styles.compact : ""}`}>
      <li className={styles.item}>
        <WhatsAppIcon className={styles.icon} />
        <div className={styles.text}>
          <span className={styles.label}>WhatsApp or phone</span>
          <span className={`${styles.value} tnum`}>{phone.value.display}</span>
          <span className={styles.actions}>
            <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className={styles.action}>
              Open WhatsApp
              <ExternalIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <a href={`tel:${phone.value.e164}`} className={styles.action}>
              Call
            </a>
            <CopyButton value={phone.value.display} what="phone number" />
          </span>
        </div>
      </li>
      <li className={styles.item}>
        <MailIcon className={styles.icon} />
        <div className={styles.text}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{email.value}</span>
          <span className={styles.actions}>
            <a href={`mailto:${email.value}`} className={styles.action}>
              Write an email
            </a>
            <CopyButton value={email.value} what="email address" />
          </span>
        </div>
      </li>
    </ul>
  );
}
