import { identity, whatsappUrl } from "@/content/identity";
import { reviewSites } from "@/content/reviews";
import { breakfast, policies } from "@/content/stay";
import { onlineBookingConfigured } from "@/lib/booking/config";
import { firstMorningText } from "@/lib/booking/stay-rail";
import { pages } from "@/lib/site";
import { BookingCardView } from "./BookingCardView";
import { hasBrandMark } from "./ui/BrandMark";

const platforms = reviewSites
  .filter((site) => site.bookable)
  .map((site) => ({ platform: site.platform, url: site.url, mark: hasBrandMark(site.mark) ? site.mark : null }));

/**
 * The closing call to action on most pages: a paper ticket standing in a slot
 * in the front desk's teak counter, with the curtains' woven lozenges along
 * its top, against the paper wall behind the desk. As the slot comes into view the ticket slides 1.25rem up out of it
 * (a phrase: its base style is the rest frame, so Still, reduced motion and
 * pages without JavaScript simply show it standing). That is the card's only
 * motion: the form, prices and buttons never move.
 *
 * Booking direct comes first. With online booking (lib/booking/config.ts) the
 * form carries check-in, nights and guests to /book's free beds (a GET form,
 * so it works without JavaScript; with it, next/form follows it inside the
 * site). Without it, the same three fields write the guest's request into
 * WhatsApp or an email for them to send (DirectRequest). The stub offers
 * Booking.com and Agoda second: their date parameters can't be verified from
 * here, so the dates are not passed on.
 *
 * Going to /book from here, the ticket itself glides into the booking panel
 * there (the "booking-ticket" morph; React pairs the two only while both are
 * on screen).
 */
export function BookingCard() {
  const [lead = "", ...rest] = firstMorningText(breakfast.hours.value).split(": ");
  return (
    <BookingCardView
      online={onlineBookingConfigured()}
      directPrice={policies.directPrice.value}
      morning={[lead, rest.join(": ")]}
      bookPath={pages.book.path}
      whatsapp={whatsappUrl()}
      email={identity.contact.email.value}
      platforms={platforms}
    />
  );
}
