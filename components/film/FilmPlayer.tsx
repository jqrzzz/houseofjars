"use client";

import Image from "next/image";
import { useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import buttons from "@/components/ui/button.module.css";
import type { filmFiles } from "./films";
import styles from "./Film.module.css";

interface FilmProps {
  /** Said to screen readers and named on the Play button. */
  title: string;
  /** The encoded size, so the page reserves the box before anything loads. */
  width: number;
  height: number;
  files: ReturnType<typeof filmFiles>;
}

/**
 * The film once a visitor has asked for it: the player's own controls, the
 * poster as its rest frame, and English captions, which carry the steps in
 * words as the film has no sound. It never plays by itself.
 */
export function FilmVideo({ title, width, height, files, ref }: FilmProps & { ref?: Ref<HTMLVideoElement> }) {
  return (
    <video
      ref={ref}
      className={styles.video}
      controls
      preload="auto"
      playsInline
      width={width}
      height={height}
      poster={files.poster}
      aria-label={title}
    >
      <source src={files.webm} type="video/webm" />
      <source src={files.mp4} type="video/mp4" />
      <track kind="captions" src={files.captions} srcLang="en" label="English" default />
      <a href={files.mp4}>{title}</a>
    </video>
  );
}

/**
 * Until a visitor presses Play, the film is only its poster (its designed
 * still, lazy-loaded) under a Play button: a <video> would fetch its poster
 * and its captions as the page loads, whatever its preload says. Play puts the
 * player in the poster's place and starts it in the same click, so the
 * browser counts it as the visitor's own, and moves focus to it.
 */
export function FilmPlayer(film: FilmProps) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  if (playing) return <FilmVideo {...film} ref={video} />;
  const play = () => {
    flushSync(() => setPlaying(true));
    video.current?.focus();
    // If the browser still won't start it, the player's own controls are there.
    video.current?.play().catch(() => undefined);
  };
  return (
    <div className={styles.facade}>
      <Image className={styles.video} src={film.files.poster} width={film.width} height={film.height} alt="" unoptimized />
      {/* Named in full for screen readers, starting with the words it shows. */}
      <button type="button" className={`${buttons.button} ${styles.play}`} aria-label={`Play the film: ${film.title}`} onClick={play}>
        <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5Z" fill="currentColor" />
        </svg>
        Play the film
      </button>
    </div>
  );
}
