"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./MediaFade.module.css";
import { MEDIA_FADE_BLUR_PX, MEDIA_FADE_MS, MEDIA_PULSE_S } from "@/lib/motion";

/** Gives up waiting on a video that never reports a frame (some browsers
 * hold off loading one until it plays) and shows it anyway. */
const GIVE_UP_MS = 3000;

const VARS = {
  "--media-fade-ms": `${MEDIA_FADE_MS}ms`,
  "--media-fade-blur": `${MEDIA_FADE_BLUR_PX}px`,
  "--media-pulse-s": `${MEDIA_PULSE_S}s`,
} as CSSProperties;

/**
 * Loads an image or video in softly (like rachelchen.tech): its box shows a
 * pulsing grey until the media inside (the first <img> or <video>) has
 * loaded, then the media fades in from a blur to sharp. Media that's
 * already loaded (cached) still plays the fade, a frame after it appears,
 * so every card arrives the same way. Fills its parent (position: absolute,
 * inset 0); the media inside should fill it too. Timings: lib/motion.ts
 * (MEDIA_FADE_*), reduced motion: just the fade.
 */
export default function MediaFade({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const root = ref.current;
    const el = root?.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
    let frame = 0;
    const show = () => {
      // A frame later, so the fade plays even when it's ready at once.
      frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setShown(true))));
    };
    if (!el) {
      show();
      return;
    }
    const ready = el instanceof HTMLImageElement ? el.complete && el.naturalWidth > 0 : el.readyState >= 2;
    if (ready) {
      show();
      return () => cancelAnimationFrame(frame);
    }
    const event = el instanceof HTMLImageElement ? "load" : "loadeddata";
    el.addEventListener(event, show, { once: true });
    el.addEventListener("error", show, { once: true });
    const giveUp = window.setTimeout(show, GIVE_UP_MS);
    return () => {
      el.removeEventListener(event, show);
      el.removeEventListener("error", show);
      window.clearTimeout(giveUp);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span ref={ref} className={`${styles.root} ${className}`} style={VARS} data-shown={shown || undefined}>
      <span className={styles.pulse} aria-hidden="true" />
      <span className={styles.media}>{children}</span>
    </span>
  );
}
