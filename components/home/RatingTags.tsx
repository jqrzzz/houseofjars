import { Section } from "@/components/ui/Section";
import { agodaScores, praise, ratings } from "@/content/reviews";
import { formatDate, joinList, lowerFirst } from "@/content/text";
import { RatingTagsView } from "./RatingTagsView";

/**
 * ③ What guests say (docs/DESIGN.md §5.1): the three scores (Booking.com,
 * Agoda, Tripadvisor) hang as paper tags on one drawn thread, each with the
 * date it was read; a ranking (Hostelz's No. 1) and Agoda's scores by
 * category follow as lines. The thread draws itself as it comes into view;
 * the tags and their figures never move. One dok champa petal drifts across
 * behind them, once. (The words come from content/reviews; RatingTagsView
 * draws them.)
 */
export function RatingTags() {
  const scores = ratings.filter(({ value: r }) => r.outOf !== null);
  const rankings = ratings.filter(({ value: r }) => r.outOf === null);
  return (
    <Section labelledBy="ratings-title">
      <RatingTagsView
        notes={[
          ...rankings.map(({ value: r }) => `${r.platform}: ${r.score}, ${r.context} (as of ${formatDate(r.asOf)}).`),
          `On Agoda: ${joinList(agodaScores.value.map(([what, score]) => `${lowerFirst(what)} ${score}`))}.`,
        ]}
        ratings={scores.map(({ value: r }) => ({
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
