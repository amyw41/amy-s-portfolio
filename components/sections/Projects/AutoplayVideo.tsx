"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ProjectCard.module.css";

interface AutoplayVideoProps {
  src: string;
  poster: string;
}

/** How close to the viewport (in px) a card must be before its video's
 * `src` is ever set — before that, preload="none" plus no src means zero
 * bytes fetched, even though the video plays on its own once it's near. */
const LOAD_ROOT_MARGIN = "200px";
/** How much of the card must be on-screen before its video actually plays —
 * deliberately a *different*, stricter condition than the load margin
 * above, hence two separate observers rather than one doing double duty. */
const PLAY_THRESHOLD = 0.5;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Autoplaying, lazy-loaded, poster-first video for a project card.
 *
 * Two IntersectionObservers, deliberately kept apart (see their own
 * constants above): one fires once, ever, to start the fetch; the other
 * fires repeatedly to toggle play/pause as the card scrolls through view.
 * Conflating them would mean either fetching 200px early but not playing
 * until 50% visible (fine) — the actual reason they're separate is that the
 * load condition must only ever act once while the play condition must keep
 * acting forever, and a single observer can't cheaply express "trigger once
 * vs. trigger every time" for two different thresholds at once.
 *
 * The poster <img> is a separate layer, always present, with the video
 * absolutely positioned on top starting at opacity 0 — not just the
 * video's own `poster` attribute — because the video element itself only
 * starts at opacity 0 too; if the poster lived solely on the (invisible)
 * video, there'd be nothing to see until the first real frame decodes.
 * Once real playback begins, the video fades in over it once, permanently
 * (see handlePlaying) — never re-fades on subsequent pause/resume cycles
 * from scrolling.
 */
export default function AutoplayVideo({ src, poster }: AutoplayVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    // Must happen post-mount (matchMedia needs `window`) — this genuinely
    // can't be derived during render/SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(window.matchMedia(REDUCED_MOTION).matches);
  }, []);

  useEffect(() => {
    // Reduced motion: never load, never play — poster only, no <video> at
    // all (see the render below), so this effect has nothing to wire up.
    if (reducedMotion) return;

    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;

    let loaded = false;
    // Last known state from the PLAY observer — re-checked on every
    // visibilitychange too, so backgrounding and re-foregrounding the tab
    // resumes correctly without needing its own visibility bookkeeping.
    let visible = false;

    function syncPlayState() {
      if (visible && !document.hidden) {
        // play() returns a promise that REJECTS when the browser blocks
        // autoplay (iOS low-power mode, some data-saver modes) — caught
        // and silently ignored so the card just keeps showing its poster.
        // Never an unhandled rejection, never a visible error state.
        video!.play().catch(() => {});
      } else {
        video!.pause();
        // Only reset playback position when the card has actually scrolled
        // out of view (per the brief) — a visibilitychange-driven pause
        // (tab backgrounded while the card is still on screen) should
        // resume from where it left off, same as the jar's own physics
        // pause/resume.
        if (!visible) video!.currentTime = 0;
      }
    }

    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          loaded = true;
          video.src = src;
          loadObserver.disconnect();
        }
      },
      { rootMargin: LOAD_ROOT_MARGIN },
    );
    loadObserver.observe(wrapper);

    const playObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        syncPlayState();
      },
      { threshold: PLAY_THRESHOLD },
    );
    playObserver.observe(wrapper);

    const handleVisibilityChange = () => syncPlayState();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Fires the first time real playback actually starts — see this
    // component's own doc comment for why the fade is one-shot.
    const handlePlaying = () => setFaded(true);
    video.addEventListener("playing", handlePlaying);

    return () => {
      loadObserver.disconnect();
      playObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.removeEventListener("playing", handlePlaying);
      video.pause();
    };
  }, [src, reducedMotion]);

  return (
    <div ref={wrapperRef} className={styles.mediaInner}>
      <img src={poster} alt="" className={styles.poster} draggable={false} />
      {!reducedMotion && (
        <video
          ref={videoRef}
          className={`${styles.video} ${faded ? styles.videoVisible : ""}`}
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
        />
      )}
    </div>
  );
}
