import { renderAppleIcon } from "@/lib/og";

export const dynamic = "force-static";

/** The logo search engines show for the house (the structured data's logo): the saffron jar on vest brown, 512 px square. */
export function GET() {
  return renderAppleIcon(512);
}
