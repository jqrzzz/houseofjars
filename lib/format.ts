/** "2026-09-25" -> "25 September 2026". Dates are calendar days, so UTC avoids off-by-one shifts. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

