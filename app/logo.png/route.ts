import { renderAppleIcon } from "@/lib/og";

export const dynamic = "force-static";

/** The logo search engines show for the house (the structured data's logo): the white arch on jar orange, 512 px square. */
export function GET() {
  return renderAppleIcon(512);
}
