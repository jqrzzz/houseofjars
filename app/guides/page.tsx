import { BookingCard } from "@/components/BookingCard";
import { PageJsonLd } from "@/components/PageJsonLd";
import { GuideCards } from "@/components/guide/GuideCards";
import { PageHeader } from "@/components/page/PageHeader";
import { pageMetadata } from "@/lib/metadata";
import { pages } from "@/lib/site";

export const metadata = pageMetadata(pages.guides);

export default function GuidesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Guides"
        morph="guides"
        title="Guides for your stay"
        lede="Plain answers to what guests ask, so you can plan your days yourself: the way from the airport, the Lao immigration form, train tickets, getting around, a day in Vientiane, crossing to Thailand, what’s nearby and how quiet the house is."
      />
      <GuideCards />
      <BookingCard />
      <PageJsonLd path={pages.guides.path} />
    </>
  );
}
