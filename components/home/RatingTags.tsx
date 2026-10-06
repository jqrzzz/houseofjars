import { Section } from "@/components/ui/Section";
import { praise, ratings } from "@/content/reviews";
import { formatDate } from "@/content/text";
import { RatingTagsView } from "./RatingTagsView";

/**
 * ③ What guests say (docs/DESIGN.md §5.1): the three ratings hang as paper
 * tags on one drawn thread, each with the date it was read. The thread draws
 * itself as it comes into view; the tags and their figures never move. One dok
 * champa petal drifts across behind them, once. (The words come from
 * content/reviews; RatingTagsView draws them.)
 */
export function RatingTags() {
  return (
    <Section labelledBy="ratings-title">
      <RatingTagsView
        ratings={ratings.map(({ value: r }) => ({
          platform: r.platform,
          score: r.score,
          outOf: r.outOf,
          context: r.context,
          asOf: `As of ${formatDate(r.asOf)}`,
          url: r.url,
        }))}
        praise={praise.value}
      />
    </Section>
  );
}
