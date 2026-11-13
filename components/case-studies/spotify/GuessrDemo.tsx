"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import styles from "./GuessrDemo.module.css";
import { CHARACTERS } from "./characters";
import {
  GUESSR_BOB_PX,
  GUESSR_BOB_S,
  GUESSR_BG_BLOOM_MS,
  GUESSR_CHAR_DELAY_MS,
  GUESSR_CHAR_IN_MS,
  GUESSR_CHAR_STAGGER_MS,
  GUESSR_GLOW_DELAY_MS,
  GUESSR_PHONE_DELAY_MS,
  GUESSR_PHONE_IN_MS,
  GUESSR_HOP_MS,
  GUESSR_SCREEN_FADE_MS,
  slowMs,
} from "@/lib/motion";

/** The app's screens (Amy's Figma, "Section 2"), in the order a round
 * plays. Each tap moves on one (nothing plays by itself). */
const FLOW: { src: string; alt: string }[] = [
  { src: "01-home", alt: "Spotify Guessr home: log in with Spotify" },
  { src: "03-room", alt: "A party room with four players" },
  { src: "07-song", alt: "A song plays: This Is TWICE" },
  { src: "08-guess", alt: "Who is it? Pick the player the song belongs to" },
  { src: "09-picked", alt: "A player picked" },
  { src: "10-rock", alt: "You rock! The right answer" },
  { src: "11-drumroll", alt: "Drumroll: the scores" },
  { src: "12-podium", alt: "The podium" },
];
const PODIUM = FLOW.length - 1;
const asset = (name: string) => `/demos/spotify/${name}.webp`;

/**
 * Spotify Guessr's cover, staged like the slide deck's title slide: the
 * deck's own grainy background, a real iPhone mockup (from the deck) with
 * the app in it (tap it to go through a round, a screen a tap: home →
 * party → the song → "Who is it?" → the podium, then round again), and
 * Amy's characters posed on and around the phone: the triangle cheering on
 * its top corner, the star bouncing in front of its bottom left, the blue
 * one peeking out from behind it. They bob a little; on the podium they
 * hop.
 */
export default function GuessrDemo() {
  const [screen, setScreen] = useState(0);
  const [hop, setHop] = useState(false);
  const [reduced, setReduced] = useState(false);
  // The background blooms in once its image has loaded (and the page with it).
  const [bloomed, setBloomed] = useState(false);
  useEffect(() => {
    let live = true;
    const img = new window.Image();
    img.src = asset("deck-bg");
    const go = () => live && requestAnimationFrame(() => live && setBloomed(true));
    img.decode().then(go, go);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const advance = useCallback(() => setScreen((s) => (s + 1) % FLOW.length), []);
  // On the podium, everyone hops.
  useEffect(() => {
    if (screen !== PODIUM || reduced) return;
    const on = window.setTimeout(() => setHop(true), 0);
    const off = window.setTimeout(() => setHop(false), slowMs(GUESSR_HOP_MS));
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, [screen, reduced]);
  // The next screen, fetched ahead so a tap never waits.
  useEffect(() => {
    const img = new window.Image();
    img.src = asset(FLOW[(screen + 1) % FLOW.length].src);
  }, [screen]);

  const vars = useMemo(
    () =>
      ({
        "--bob-px": `${GUESSR_BOB_PX}px`,
        "--bob-s": `${GUESSR_BOB_S}s`,
        "--hop-ms": `${GUESSR_HOP_MS}ms`,
        "--screen-fade-ms": reduced ? "0ms" : `${GUESSR_SCREEN_FADE_MS}ms`,
        "--bloom-ms": `${GUESSR_BG_BLOOM_MS}ms`,
        "--glow-delay": `${GUESSR_GLOW_DELAY_MS}ms`,
        "--phone-delay": `${GUESSR_PHONE_DELAY_MS}ms`,
        "--phone-in-ms": `${GUESSR_PHONE_IN_MS}ms`,
        "--char-delay": `${GUESSR_CHAR_DELAY_MS}ms`,
        "--char-stagger": `${GUESSR_CHAR_STAGGER_MS}ms`,
        "--char-in-ms": `${GUESSR_CHAR_IN_MS}ms`,
      }) as CSSProperties,
    [reduced],
  );
  const bob = (i: number) => `${styles.bob} ${hop ? styles.hop : ""}`.trim() + ` ${styles[`delay${i}`] ?? ""}`;

  return (
    // data-in: everything comes in, staggered, once the background has loaded.
    <div className={styles.demo} style={vars} data-in={bloomed || undefined}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.stage}>
        {/* Behind the phone: the blue one, peeking out. */}
        <div className={`${styles.char} ${styles.circle}`} aria-hidden="true">
          <div className={styles.pop} style={{ "--i": 2 } as CSSProperties}>
            <div className={bob(2)}>
              <svg
                viewBox={CHARACTERS.circle.viewBox}
                overflow="visible"
                fill="none"
                className={styles.art}
                dangerouslySetInnerHTML={{ __html: CHARACTERS.circle.markup }}
              />
            </div>
          </div>
        </div>

        {/* The phone: the deck's iPhone mockup over the live screen. */}
        <button
          type="button"
          className={styles.phone}
          onClick={advance}
          aria-label={`Spotify Guessr: ${FLOW[screen].alt}. Tap to go on.`}
        >
          <span className={styles.screen}>
            {FLOW.map((s, i) =>
              // The screen showing, and the one before it fading out under it.
              i === screen || i === (screen + FLOW.length - 1) % FLOW.length ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s.src}
                  src={asset(s.src)}
                  alt=""
                  draggable={false}
                  className={i === screen ? styles.screenOn : styles.screenOff}
                />
              ) : null,
            )}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.frame} src={asset("iphone-frame")} alt="" draggable={false} />
        </button>

        {/* In front: the triangle cheering on the phone's top corner... */}
        <div className={`${styles.char} ${styles.triangle}`} aria-hidden="true">
          <div className={styles.pop} style={{ "--i": 1 } as CSSProperties}>
            <div className={bob(0)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.art} src={asset("triangle-cheer")} alt="" draggable={false} />
            </div>
          </div>
        </div>
        {/* ...and the star bouncing by its bottom left. */}
        <div className={`${styles.char} ${styles.star}`} aria-hidden="true">
          <div className={styles.pop} style={{ "--i": 0 } as CSSProperties}>
            <div className={bob(1)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.art} src={asset("star")} alt="" draggable={false} />
            </div>
          </div>
        </div>
      </div>

      <p className={styles.hint}>Tap the phone to play a round</p>
    </div>
  );
}
