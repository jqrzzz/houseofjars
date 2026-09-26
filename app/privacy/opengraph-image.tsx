import { ogContentType, ogSize, renderOgImage } from "@/lib/og";
import { pages } from "@/lib/site";

export const alt = `${pages.privacy.title} · House of Jars`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage(pages.privacy);
}
