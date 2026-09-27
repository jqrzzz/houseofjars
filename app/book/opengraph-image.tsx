import { ogContentType, ogSize, renderOgImage } from "@/lib/og";
import { bookPage } from "@/lib/pages";

export const alt = `${bookPage().title} · House of Jars`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage(bookPage());
}
