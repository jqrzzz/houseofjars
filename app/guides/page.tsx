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
        lede="Short, plain answers to what guests ask before they arrive: the way from the airport, the Lao immigration form, what’s nearby and how quiet the house is."
      />
      <GuideCards />
      <BookingCard />
      <PageJsonLd path={pages.guides.path} />
    </>
  );
}
