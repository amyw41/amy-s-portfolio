"use client";

import { useEffect, useRef, useState } from "react";
import { useAnimate, usePresence, useReducedMotion } from "framer-motion";
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
  slowMs,
  stopMotion,
} from "@/lib/motion";

interface JarViewProps {
  /** Arriving from work mode: drop in from above and land before the items
   * fall in. False on first load, where the jar is simply there. */
  entering: boolean;
  /** Case study hovered in the sidebar — see JarStage's isolatedId. */
  isolatedId: string | null;
}

/** Fully off the stage, above or below: the view is the stage's own height,
 * so translating it by just over 100% clears it either way. */
const OFF_STAGE = "110%";

/**
 * Jar mode's stage, with the jar's cartoon moves (brief Part 2.4). Every
 * move runs on the STOP_MOTION_FPS clock (stopMotion), so it steps like
 * hand-drawn frames.
 *
 * Arriving (work → jar, once the grid has gone): drops in from above,
 * lands with a squash and springs back, and only then lets the items spawn
 * and fall (JarStage's `start`) — useJarPhysics measures the jar's position
 * on screen, so it mustn't run while the jar is mid-drop.
 *
 * Leaving (jar → work, via AnimatePresence + usePresence): kicks the items
 * up (jostle) so they knock around inside, lifts and squashes for a beat of
 * anticipation, then accelerates down out of the stage.
 *
 * Reduced motion: plain fades, items appear already settled.
 */
export default function JarView({ entering, isolatedId }: JarViewProps) {
  const reduced = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const jostleRef = useRef<((strength: number) => void) | null>(null);
  const [isPresent, safeToRemove] = usePresence();
  const [start, setStart] = useState(!entering);

  // Arriving.
  useEffect(() => {
    if (!entering) return;
    let cancelled = false;
    (async () => {
      if (reduced) {
        await animate(scope.current, { opacity: [0, 1] }, { duration: 0.2 });
      } else {
        const dropS = slowMs(JAR_DROP_IN_S * 1000) / 1000;
        await animate(
          scope.current,
          { y: [`-${OFF_STAGE}`, "0%"], opacity: [1, 1] },
          { duration: dropS, ease: stopMotion(EASE_IN, dropS) },
        );
        const landS = slowMs(JAR_LAND_S * 1000) / 1000;
        if (wrapperRef.current) {
          await animate(
            wrapperRef.current,
            { scaleX: [1, JAR_LAND_SCALE_X, 1], scaleY: [1, JAR_LAND_SCALE_Y, 1] },
            { duration: landS, times: [0, 0.3, 1], ease: stopMotion(EASE_OUT, landS) },
          );
        }
      }
      if (!cancelled) setStart(true);
    })();
    return () => {
      cancelled = true;
    };
    // Runs once, on mount — `entering` is fixed for this view's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving.
  useEffect(() => {
    if (isPresent) return;
    (async () => {
      if (reduced) {
        await animate(scope.current, { opacity: 0 }, { duration: 0.2 });
      } else {
        jostleRef.current?.(JAR_JOSTLE_STRENGTH);
        const anticipateS = slowMs(JAR_ANTICIPATE_S * 1000) / 1000;
        if (wrapperRef.current) {
          await animate(
            wrapperRef.current,
            { y: -JAR_ANTICIPATE_PX, scaleY: JAR_ANTICIPATE_SCALE_Y },
            { duration: anticipateS, ease: stopMotion(EASE_OUT, anticipateS) },
          );
          // Un-squash as it starts to fall.
          animate(wrapperRef.current, { scaleY: 1 }, { duration: anticipateS, ease: stopMotion(EASE_OUT, anticipateS) });
        }
        const dropS = slowMs(JAR_DROP_OUT_S * 1000) / 1000;
        await animate(scope.current, { y: OFF_STAGE }, { duration: dropS, ease: stopMotion(EASE_IN, dropS) });
      }
      safeToRemove?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

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
        />
      </div>
    </div>
  );
}
