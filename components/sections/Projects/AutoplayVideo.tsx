"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./ProjectCard.module.css";
import { preloadedVideo } from "./videoPreload";

interface AutoplayVideoProps {
  src: string;
  poster: string;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * A project card's video: muted, looped, playing as soon as it can, over
 * its poster image.
 *
 * Kept deliberately simple, the way rachelchen.tech does it: the video gets
 * its source the moment the card mounts and the browser's own autoplay
 * starts it. (It used to wait for the card to scroll near, then for a second
 * observer to say it was half on screen before calling play(); the two
 * could race, and the videos sat frozen on their first frame, 2026-11-20.)
 * There are only a few small videos, so loading them all up front is cheap,
 * and home has usually fetched them into memory already while the jar sat
 * idle (videoPreload.ts), so they start at once.
 *
 * The poster stays underneath, so there's something to see until the first
 * frame. The video fades in over it when it starts playing, or appears at
 * once when it's playing from memory (the card is still fading in around it
 * then). Reduced motion: the poster only, no video.
 */
export default function AutoplayVideo({ src, poster }: AutoplayVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    // matchMedia needs `window`, so this can't be worked out during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(window.matchMedia(REDUCED_MOTION).matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const video = videoRef.current;
    if (!video) return;
    const memory = preloadedVideo(src);
    setInstant(memory !== null);
    const onPlaying = () => setPlaying(true);
    video.addEventListener("playing", onPlaying);
    video.src = memory ?? src;
    // autoPlay starts it too; this just doesn't wait for the browser to get
    // round to it. A refusal (iOS low-power mode, data saver) leaves the
    // poster showing.
    video.play().catch(() => {});
    return () => {
      video.removeEventListener("playing", onPlaying);
      video.pause();
    };
  }, [src, reducedMotion]);

  return (
    <div className={styles.mediaInner}>
      <Image
        src={poster}
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 624px"
        className={styles.poster}
        draggable={false}
        loading="eager"
      />
      {!reducedMotion && (
        <video
          ref={videoRef}
          className={`${styles.video} ${playing ? styles.videoVisible : ""} ${instant ? styles.videoInstant : ""}`}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
        />
      )}
    </div>
  );
}
