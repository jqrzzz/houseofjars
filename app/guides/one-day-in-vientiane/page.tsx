import { GuidePage, guideMetadata } from "@/components/guide/GuidePage";
import { guides } from "@/content/guides";

export const metadata = guideMetadata(guides.oneDay);

export default function Page() {
  return <GuidePage guide={guides.oneDay} />;
}
