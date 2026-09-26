import { findPage } from "@/lib/pages";
import { pageJsonLd } from "@/lib/structured-data";
import { JsonLd } from "./JsonLd";

/** The page's structured data for search engines and assistants (lib/structured-data.ts). */
export function PageJsonLd({ path }: { path: string }) {
  return <JsonLd data={pageJsonLd(findPage(path))} />;
}
