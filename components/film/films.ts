/**
 * The films the site shows, recorded with scripts/film.ts (`npm run film`) and committed to public/film/. A film
 * appears on the site only once it is listed here: until then <Film> renders nothing.
 */
export interface FilmEntry {
  /** The recording's name in scripts/film.ts: "arrival". */
  readonly id: string;
  /** Said to screen readers and shown under the film. */
  readonly title: string;
  /** The encoded size, so the page reserves the box before anything loads. */
  readonly width: number;
  readonly height: number;
  readonly seconds: number;
}

export const films: readonly FilmEntry[] = [];

/** Where a film's files are, by the names scripts/film.ts writes. */
export function filmFiles(id: string) {
  return {
    webm: `/film/${id}.webm`,
    mp4: `/film/${id}.mp4`,
    poster: `/film/${id}-poster.webp`,
    captions: `/film/${id}.en.vtt`,
  } as const;
}

export function findFilm(id: string, list: readonly FilmEntry[] = films): FilmEntry | undefined {
  return list.find((film) => film.id === id);
}
