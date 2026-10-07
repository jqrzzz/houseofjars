import { type ReviewSite, reviewSites } from "@/content/reviews";
import { SEEN_ON } from "@/content/sources";
import { formatDate } from "@/content/text";
import { RatingStripView, type SiteBadge } from "./RatingStripView";
import { hasBrandMark } from "./ui/BrandMark";

/** What a site's badge offers: to book or read reviews, or only to read them. */
export const siteAction = (site: Pick<ReviewSite, "bookable">): string => (site.bookable ? "Book or read reviews" : "Read reviews");

/** A site as its badge shows it: logo, score, context and what clicking does. */
export function siteBadge(site: ReviewSite): SiteBadge {
  const { rating } = site;
  return {
    platform: site.platform,
    mark: hasBrandMark(site.mark) ? site.mark : null,
    url: site.url,
    score: rating?.score ?? null,
    outOf: rating?.outOf ?? null,
    context: rating?.context ?? "Prices and guest reviews",
    action: siteAction(site),
  };
}

/**
 * The rating strip (docs/DESIGN.md §10.8): each booking and review site as a
 * paper badge with its own logo and the house's score there, and the whole
 * badge a link to the house's page on that site, to book or read the
 * reviews. Under the home page's hero, and on the booking page with only the
 * sites that take bookings (`bookable`). The words come from content/reviews;
 * RatingStripView draws them.
 */
export function RatingStrip({ bookable = false, className }: { bookable?: boolean; className?: string }) {
  const sites = bookable ? reviewSites.filter((site) => site.bookable) : reviewSites;
  return (
    <RatingStripView
      sites={sites.map(siteBadge)}
      asOf={`Scores as shown on ${formatDate(SEEN_ON)}.`}
      {...(className ? { className } : {})}
    />
  );
}
