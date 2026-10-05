import { filmFiles, findFilm, type FilmEntry } from "./films";
import styles from "./Film.module.css";

/**
 * One of the house's short films (components/film/films.ts), or nothing until it is listed there. It never
 * plays by itself and fetches nothing until a visitor presses play (preload="none"): the poster is the film's
 * rest frame, and English captions carry the steps in words, as the film has no sound.
 */
export function Film({ id, className, list }: { id: string; className?: string; list?: readonly FilmEntry[] }) {
  const film = findFilm(id, list);
  if (!film) return null;
  const files = filmFiles(film.id);
  return (
    <figure className={[styles.film, className].filter(Boolean).join(" ")}>
      <video
        className={styles.video}
        controls
        preload="none"
        playsInline
        width={film.width}
        height={film.height}
        poster={files.poster}
        aria-label={film.title}
      >
        <source src={files.webm} type="video/webm" />
        <source src={files.mp4} type="video/mp4" />
        <track kind="captions" src={files.captions} srcLang="en" label="English" default />
        <a href={files.mp4}>{film.title}</a>
      </video>
      <figcaption className={styles.caption}>{film.title}</figcaption>
    </figure>
  );
}
