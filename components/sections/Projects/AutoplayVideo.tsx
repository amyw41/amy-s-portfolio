"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import styles from "./ProjectCard.module.css";

interface AutoplayVideoProps {
  src: string;
  poster: string;
}

/** How close to the viewport (in px) a card must be before its video's
 * `src` is ever set — before that, preload="none" plus no src means zero
 * bytes fetched, even though the video plays on its own once it's near.
 * Was 200px — with only a handful of project cards on the page, that lead
 * wasn't enough to finish fetching before a normal scroll speed reached the
 * card, so the video would visibly pop in a beat after the poster (per
 * request: "images and vids don't load in time... it ruins the
 * experience"). Bumped way up so loading effectively starts as soon as the
 * card is anywhere near the page, not just near the viewport. */
const LOAD_ROOT_MARGIN = "1500px";
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
          // `preload="none"` in the JSX below is deliberate — it's what
          // keeps a card that never scrolls near from fetching anything at
          // all. But once this observer decides it's worth loading, that
          // same "none" would otherwise carry forward and block the browser
          // from buffering any actual video data until `play()` is called
          // by the *other*, stricter (50%) observer below — meaning the
          // 200px lead margin this observer exists to provide was being
          // thrown away, and playback started from a cold, empty buffer.
          // That's what read as "random images" flashing before the video
          // settled: the first fraction of a second of playback stuttering
          // across whatever partial frames had decoded so far. Switching to
          // "auto" here, right as loading is actually greenlit, lets the
          // browser start buffering during that 200px lead instead of at
          // the moment playback is requested.
          video.preload = "auto";
          video.src = src;
          video.load();
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
      <Image
        src={poster}
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 624px"
        className={styles.poster}
        draggable={false}
        // Was lazy (the next/image default) — same pop-in-on-scroll issue as
        // the video src above, just for the poster frame itself. There are
        // only a few project cards on this page, so eager-loading every
        // poster costs little and means it's already decoded by the time a
        // normal scroll reaches it.
        loading="eager"
      />
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
