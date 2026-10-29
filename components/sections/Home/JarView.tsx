"use client";

import { useEffect, useRef, useState } from "react";
import { useAnimate, usePresence, useReducedMotion, type AnimationPlaybackControls } from "framer-motion";
import styles from "./Home.module.css";
import JarStage from "@/components/sections/Hero/JarStage";
import { JAR_ITEMS } from "@/components/sections/Hero/items.manifest";
import {
  EASE_IN,
  EASE_OUT,
  JAR_ANTICIPATE_PX,
  JAR_ANTICIPATE_S,
  JAR_ANTICIPATE_SCALE_Y,
  JAR_DROP_IN_S,
  JAR_DROP_OUT_S,
  JAR_JOSTLE_STRENGTH,
  JAR_LAND_S,
  JAR_LAND_SCALE_X,
  JAR_LAND_SCALE_Y,
  JAR_MOVES_STOP_MOTION,
  JAR_RETURN_S,
  slowMs,
  stopMotion,
} from "@/lib/motion";

/** The jar's easing: smooth at the display's frame rate, or stepped on the
 * STOP_MOTION_FPS clock when JAR_MOVES_STOP_MOTION is on. */
function jarEase(ease: readonly [number, number, number, number], durationS: number) {
  return JAR_MOVES_STOP_MOTION ? stopMotion(ease, durationS) : ease;
}

/** Seconds, scaled by ?slow. */
const slowS = (s: number) => slowMs(s * 1000) / 1000;

interface JarViewProps {
  /** Arriving from work mode: drop in from above and land before the items
   * fall in. False on first load, where the jar is simply there. */
  entering: boolean;
  /** Case study hovered in the sidebar — see JarStage's isolatedId. */
  isolatedId: string | null;
  /** Told whether the jar has fully arrived (landed, items in). Home uses it
   * to only play the clink when leaving a settled jar. */
  onSettledChange?: (settled: boolean) => void;
}

/** Fully off the stage, above or below: the view is the stage's own height,
 * so translating it by just over 100% clears it either way. */
const OFF_STAGE = "110%";

/**
 * Jar mode's stage, with the jar's cartoon moves (brief Part 2.4). They run
 * smooth; JAR_MOVES_STOP_MOTION puts them back on the stepped
 * STOP_MOTION_FPS clock (jarEase).
 *
 * Arriving (work → jar, once the grid has gone): drops in from above,
 * lands with a squash and springs back, and only then lets the items spawn
 * and fall (JarStage's `start`) — useJarPhysics measures the jar's position
 * on screen, so it mustn't run while the jar is mid-drop.
 *
 * Leaving (jar → work, via AnimatePresence + usePresence):
 * - settled jar (landed, items in): kicks the items up (jostle) so they
 *   knock around inside, lifts and squashes for a beat of anticipation,
 *   then accelerates down out of the stage;
 * - not settled yet (still dropping in, or landed but items not in): every
 *   queued step is cancelled — the item spawn included, so no items ever
 *   appear — and it skips its exit: gone at once, so work comes straight in.
 *
 * Coming back mid-exit (jar clicked again before it's gone): the exit stops
 * and the jar rises back into place from where it is, then carries on as
 * if it had never left.
 *
 * Reduced motion: plain fades, items appear already settled.
 */
export default function JarView({ entering, isolatedId, onSettledChange }: JarViewProps) {
  const reduced = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const jostleRef = useRef<((strength: number) => void) | null>(null);
  const [isPresent, safeToRemove] = usePresence();
  const [start, setStart] = useState(!entering);

  // Every animation still running, so any of them can be stopped mid-way.
  const runningRef = useRef<AnimationPlaybackControls[]>([]);
  // Bumped whenever the current sequence is superseded (leave, return);
  // a sequence checks it after every await and bails if it's stale.
  const sequenceRef = useRef(0);
  const landedRef = useRef(!entering);
  const itemsReadyRef = useRef(false);
  const leavingRef = useRef(false);

  const run = (...args: Parameters<typeof animate>) => {
    const controls = (animate as (...a: Parameters<typeof animate>) => AnimationPlaybackControls)(...args);
    runningRef.current.push(controls);
    return controls;
  };
  const stopAll = () => {
    runningRef.current.forEach((c) => c.stop());
    runningRef.current = [];
  };
  const reportSettled = () => onSettledChange?.(landedRef.current && itemsReadyRef.current && !leavingRef.current);

  // Arriving.
  useEffect(() => {
    if (!entering) return;
    const seq = sequenceRef.current;
    (async () => {
      if (reduced) {
        await run(scope.current, { opacity: [0, 1] }, { duration: 0.2 });
      } else {
        const dropS = slowS(JAR_DROP_IN_S);
        await run(scope.current, { y: [`-${OFF_STAGE}`, "0%"], opacity: [1, 1] }, { duration: dropS, ease: jarEase(EASE_IN, dropS) });
        if (seq !== sequenceRef.current) return;
        const landS = slowS(JAR_LAND_S);
        if (wrapperRef.current) {
          await run(
            wrapperRef.current,
            { scaleX: [1, JAR_LAND_SCALE_X, 1], scaleY: [1, JAR_LAND_SCALE_Y, 1] },
            { duration: landS, times: [0, 0.3, 1], ease: jarEase(EASE_OUT, landS) },
          );
        }
      }
      if (seq !== sequenceRef.current) return;
      landedRef.current = true;
      setStart(true);
      reportSettled();
    })();
    // Runs once, on mount — `entering` is fixed for this view's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving, and coming back mid-exit.
  useEffect(() => {
    if (!isPresent) {
      leavingRef.current = true;
      reportSettled();
      const seq = ++sequenceRef.current;
      stopAll();
      const settled = landedRef.current && itemsReadyRef.current;
      (async () => {
        if (reduced) {
          await run(scope.current, { opacity: 0 }, { duration: 0.2 });
        } else if (!settled) {
          // Interrupted arrival: call off the item spawn and skip ahead —
          // hidden at once, so work mode comes straight in.
          setStart(false);
          await run(scope.current, { opacity: 0 }, { duration: 0 });
        } else {
          jostleRef.current?.(JAR_JOSTLE_STRENGTH);
          const anticipateS = slowS(JAR_ANTICIPATE_S);
          if (wrapperRef.current) {
            await run(
              wrapperRef.current,
              { y: -JAR_ANTICIPATE_PX, scaleY: JAR_ANTICIPATE_SCALE_Y },
              { duration: anticipateS, ease: jarEase(EASE_OUT, anticipateS) },
            );
            if (seq !== sequenceRef.current) return;
            // Un-squash as it starts to fall.
            run(wrapperRef.current, { scaleY: 1 }, { duration: anticipateS, ease: jarEase(EASE_OUT, anticipateS) });
          }
          const dropS = slowS(JAR_DROP_OUT_S);
          await run(scope.current, { y: OFF_STAGE }, { duration: dropS, ease: jarEase(EASE_IN, dropS) });
        }
        // Only let go if nothing superseded the exit (e.g. jar clicked again).
        if (seq === sequenceRef.current) safeToRemove?.();
      })();
      return;
    }

    if (!leavingRef.current) return;
    // Back before the exit finished: rise back into place from wherever the
    // jar is, then carry on — spawning the items if the exit had cancelled
    // them.
    leavingRef.current = false;
    const seq = ++sequenceRef.current;
    stopAll();
    (async () => {
      const returnS = slowS(JAR_RETURN_S);
      if (wrapperRef.current) run(wrapperRef.current, { y: 0, scaleX: 1, scaleY: 1 }, { duration: returnS, ease: EASE_OUT });
      await run(scope.current, { y: "0%", opacity: 1 }, { duration: reduced ? 0 : returnS, ease: EASE_OUT });
      if (seq !== sequenceRef.current) return;
      landedRef.current = true;
      setStart(true);
      reportSettled();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  useEffect(() => () => onSettledChange?.(false), [onSettledChange]);

  return (
    <div
      ref={scope}
      className={styles.jarView}
      // Start where the arrival begins, so there's no flash of the jar in
      // place before the first animation frame.
      style={entering ? (reduced ? { opacity: 0 } : { transform: `translateY(-${OFF_STAGE})` }) : undefined}
    >
      <div ref={wrapperRef} className={styles.jarWrapper}>
        {/* Unmounted (not hidden) in work mode: useJarPhysics sizes
         * everything off this box's measured width, and a hidden
         * (display:none) box measures 0 — remounting rebuilds the world
         * cleanly and the items fall in again. */}
        <JarStage
          items={JAR_ITEMS}
          projectsOn={false}
          favouritesOn={false}
          isolatedId={isolatedId}
          start={start}
          jostleRef={jostleRef}
          // Home never highlights a category, so no item is ever bordered.
          outlines={false}
          onReady={() => {
            itemsReadyRef.current = true;
            reportSettled();
          }}
        />
      </div>
    </div>
  );
}
