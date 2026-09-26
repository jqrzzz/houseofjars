import { addressLines, formatAddress } from "@/content/identity";
import { CopyButton } from "./CopyButton";
import styles from "./DriverAddress.module.css";

/** The address set large, to show a taxi or tuk-tuk driver, with a copy button. Printed, it fills the page's width. */
export function DriverAddress({ label = "The address, to show a driver" }: { label?: string }) {
  return (
    <div className={styles.card}>
      <p className={styles.label}>{label}</p>
      <address className={styles.address}>
        {addressLines().map((line) => (
          <span key={line}>{line}</span>
        ))}
      </address>
      <CopyButton value={formatAddress()} what="address" />
    </div>
  );
}
