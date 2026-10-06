import { FilmPlayer } from "./FilmPlayer";
import { filmFiles, findFilm, type FilmEntry } from "./films";
import styles from "./Film.module.css";

/**
 * One of the house's short films (components/film/films.ts), or nothing until it is listed there. It never
 * plays by itself. Until a visitor presses Play it is only its poster, the film's rest frame, loaded lazily as
 * it nears the screen (FilmPlayer); the player, the film and its English captions, which carry the steps in
 * words as the film has no sound, come only with the press.
 */
export function Film({ id, className, list }: { id: string; className?: string; list?: readonly FilmEntry[] }) {
  const film = findFilm(id, list);
  if (!film) return null;
  return (
    <figure className={[styles.film, className].filter(Boolean).join(" ")}>
      <FilmPlayer title={film.title} width={film.width} height={film.height} files={filmFiles(film.id)} />
      <figcaption className={styles.caption}>{film.title}</figcaption>
    </figure>
  );
}
