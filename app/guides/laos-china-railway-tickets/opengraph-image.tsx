import { guidePath, guides } from "@/content/guides";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";
import { findPage } from "@/lib/pages";

const page = findPage(guidePath(guides.trainTickets));

export const alt = `${page.title} · House of Jars`;
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage(page, { eyebrow: "Guide" });
}
