"use client";

import { useEffect, useRef } from "react";

// Attach the returned ref to a <video>. Instead of `autoPlay` firing the
// instant the element mounts — which fires for every video on the page at
// once, several of them still off-screen — this waits until the video has
// actually scrolled into view, then plays it fresh from the beginning.
// Scrolling back out pauses it, so scrolling back in plays from the start
// again rather than resuming mid-clip.
export function useAutoPlayInView<T extends HTMLVideoElement>(threshold = 0.4) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Set the IDL property directly, not just relying on the `muted`
          // JSX attribute — React applies that attribute slightly after
          // this effect can run, and Chrome's autoplay-policy check reads
          // the live property at the moment play() is called. Attribute vs.
          // property lagging out of sync is a known way muted autoplay
          // silently gets blocked.
          el.muted = true;
          el.currentTime = 0;
          el.play().catch(() => {
            // Autoplay can still be blocked in some browsers even
            // muted/inline (e.g. low-power mode) — nothing to do but let it
            // sit on its poster/first frame rather than throw.
          });
        } else {
          el.pause();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
