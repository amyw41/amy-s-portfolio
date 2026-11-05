"use client";

import { memo, useEffect, useRef, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import { JAR_ART_H, JAR_ART_W, JAR_LINE_D } from "@/lib/jar-line";
import { LINE_STROKE_WIDTH } from "@/lib/wobbly";
import styles from "./JarStage.module.css";
import JarItem from "./JarItem";
import { useJarPhysics } from "./useJarPhysics";
import { getJarItemVisualState } from "./jar-visual-state";
import type { JarItemDef } from "./items.manifest";
import {
  JAR_LIFT_IN_MS,
  JAR_LIFT_OUT_MS,
  JAR_LIFT_PX,
  JAR_LIFT_SCALE,
} from "@/lib/motion";

// JarItem's lift transition reads these (JarItem.module.css .lift).
const LIFT_VARS = {
  "--lift-px": `${JAR_LIFT_PX}px`,
  "--lift-scale": JAR_LIFT_SCALE,
  "--lift-in-ms": `${JAR_LIFT_IN_MS}ms`,
  "--lift-out-ms": `${JAR_LIFT_OUT_MS}ms`,
} as CSSProperties;

interface JarStageProps {
  items: JarItemDef[];
  projectsOn: boolean;
  favouritesOn: boolean;
  /** Wraps the hero's title/tagline text — see its own comment in
   * Hero/index.tsx. Optional so JarStage stays usable without it (a
   * dragged item just falls straight past where a platform would be). */
  textPlatformsRef?: RefObject<HTMLDivElement | null>;
  /** One item to isolate (brief Part 3.1): it lifts, everything else dims.
   * An id with no item in the jar (e.g. "extras") changes nothing. */
  isolatedId?: string | null;
  /** Passed to useJarPhysics: false holds the items back (nothing spawns
   * or falls) until it turns true. Default true. */
  start?: boolean;
  /** Filled with useJarPhysics's jostle(strength), for whoever moves the
   * jar to knock its items around (Home/JarView.tsx). */
  jostleRef?: MutableRefObject<((strength: number) => void) | null>;
  /** Passed to useJarPhysics: false skips building the outline rings that
   * `bordered` items show. Default true. */
  outlines?: boolean;
  /** Passed to useJarPhysics: how long before the fall shows, and where
   * and how the items start (see JarPhysicsOptions). */
  entranceDelayMs?: number;
  spawnLead?: number;
  spawnGap?: number;
  spawnSpeed?: number;
  /** Passed to useJarPhysics: an item hit the jar's glass (for the clink),
   * and the pile has settled (the clinks stop). */
  onImpact?: (strength: number) => void;
  onImpactsEnd?: () => void;
  /** Passed to useJarPhysics: start the replay where the items come into
   * view. */
  skipOffscreenFall?: boolean;
  /** Called once the items exist and have started falling in. */
  onReady?: () => void;
}

// Memoised: whoever holds the jar (Home's JarView) re-renders as it moves
// between modes, and re-rendering every item then was wasted work.
export default memo(function JarStage({
  items,
  projectsOn,
  favouritesOn,
  textPlatformsRef,
  isolatedId = null,
  start = true,
  jostleRef,
  outlines = true,
  entranceDelayMs,
  spawnLead,
  spawnGap,
  spawnSpeed,
  onImpact,
  onImpactsEnd,
  skipOffscreenFall,
  onReady,
}: JarStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, renderInfo, outlineMasks, registerItemEl, debugWalls, debugPhysicsEnabled, jostle } = useJarPhysics(
    containerRef,
    items,
    textPlatformsRef,
    { start, outlines, entranceDelayMs, spawnLead, spawnGap, spawnSpeed, onImpact, onImpactsEnd, skipOffscreenFall },
  );

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });
  useEffect(() => {
    if (ready) onReadyRef.current?.();
  }, [ready]);

  useEffect(() => {
    if (!jostleRef) return;
    jostleRef.current = jostle;
    return () => {
      jostleRef.current = null;
    };
  }, [jostle, jostleRef]);

  const isolating = isolatedId !== null && items.some((item) => item.id === isolatedId);


  return (
    <div
      ref={containerRef}
      className={styles.stage}
      style={LIFT_VARS}
    >
      {/* The jar: one continuous rough line (lib/jar-line.ts) — the same
       * line the intro traces, at the divider's stroke weight. */}
      <svg
        className={styles.jarImage}
        viewBox={`0 0 ${JAR_ART_W} ${JAR_ART_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        data-jar-line
      >
        <path
          d={JAR_LINE_D}
          fill="none"
          stroke="#000"
          strokeWidth={LINE_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {ready && (
        <div className={styles.itemLayer}>
          {items.map((item) => {
            const info = renderInfo[item.id];
            if (!info) return null;
            const base = getJarItemVisualState(item.category, projectsOn, favouritesOn);
            const lifted = isolating && item.id === isolatedId;
            // Isolating only lifts the item: nothing else changes.
            const dimmed = base.dimmed;
            const bordered = base.bordered;
            return (
              <JarItem
                key={item.id}
                item={item}
                ref={registerItemEl(item.id)}
                width={info.divW}
                height={info.divH}
                imgWidth={info.imgW}
                imgHeight={info.imgH}
                imgLeft={info.imgLeft}
                imgTop={info.imgTop}
                ringLeft={info.ringLeft}
                ringTop={info.ringTop}
                ringWidth={info.ringWidth}
                ringHeight={info.ringHeight}
                outlineMask={outlineMasks[item.id] ?? null}
                dimmed={dimmed}
                bordered={bordered}
                lifted={lifted}
              />
            );
          })}
        </div>
      )}

      {debugPhysicsEnabled && (
        <div className={styles.debugLayer} aria-hidden="true">
          {debugWalls.map((wall, i) => (
            <div
              key={i}
              className={styles.debugWall}
              style={{
                width: wall.width,
                height: wall.height,
                transform: `translate3d(${wall.x - wall.width / 2}px, ${wall.y - wall.height / 2}px, 0) rotate(${wall.angle}rad)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
