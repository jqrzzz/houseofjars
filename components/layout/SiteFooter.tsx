import { addressLines, identity, whatsappUrl } from "@/content/identity";
import { bookingLabel } from "@/lib/booking/config";
import { pages, primaryNav, teamSignInUrl } from "@/lib/site";
import { SiteFooterView } from "./SiteFooterView";

const elsewhere = [
  { label: "Booking.com", href: identity.links.booking.value },
  { label: "Agoda", href: identity.links.agoda.value },
  { label: "Tripadvisor", href: identity.links.tripadvisor.value },
  { label: "Facebook", href: identity.links.facebook.value },
];

/** The site footer: its words, read here on the server; SiteFooterView draws them. */
export function SiteFooter() {
  const { phone, email } = identity.contact;
  return (
    <SiteFooterView
      address={addressLines()}
      phone={{ display: phone.value.display, e164: phone.value.e164 }}
      email={email.value}
      whatsapp={whatsappUrl()}
      nav={primaryNav.map((page) => ({ path: page.path, nav: page.nav }))}
      paths={{ guides: pages.guides.path, book: pages.book.path, privacy: pages.privacy.path }}
      bookLabel={bookingLabel()}
      elsewhere={elsewhere}
      fullName={identity.fullName.value}
      year={new Date().getFullYear()}
      signIn={teamSignInUrl() ?? null}
    />
  );
}
