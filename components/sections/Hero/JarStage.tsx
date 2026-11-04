"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import Image from "next/image";
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
  JAR_ISOLATE_DIM,
  JAR_SEE_THROUGH_OPACITY,
} from "@/lib/motion";

// JarItem's lift transition reads these (JarItem.module.css .lift).
const LIFT_VARS = {
  "--lift-px": `${JAR_LIFT_PX}px`,
  "--lift-scale": JAR_LIFT_SCALE,
  "--lift-in-ms": `${JAR_LIFT_IN_MS}ms`,
  "--lift-out-ms": `${JAR_LIFT_OUT_MS}ms`,
  "--see-through": JAR_SEE_THROUGH_OPACITY,
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
  onReady,
}: JarStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, renderInfo, outlineMasks, registerItemEl, debugWalls, debugPhysicsEnabled, jostle } = useJarPhysics(
    containerRef,
    items,
    textPlatformsRef,
    { start, outlines, entranceDelayMs, spawnLead, spawnGap, spawnSpeed, onImpact, onImpactsEnd },
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

  // The see-through copy: drawn for the isolated item, and kept (fading
  // out) for the last one once the hover ends.
  const [ghostId, setGhostId] = useState<string | null>(null);
  if (isolating && isolatedId !== ghostId) setGhostId(isolatedId);
  const ghostRef = useRef<HTMLDivElement>(null);

  // Keeps the copy exactly on the real item: its transform is written by
  // the physics, so mirror every change to it (rare once the pile has
  // settled — no per-frame work while nothing moves). A layout effect, so
  // it's in place before the copy is first painted; it's only "armed"
  // (shown, and allowed to rise — JarItem.module.css) the frame after, so
  // it rises with the item instead of appearing already up.
  useLayoutEffect(() => {
    const ghost = ghostRef.current;
    const real = ghostId ? containerRef.current?.querySelector<HTMLElement>(`[data-jar-item="${ghostId}"]`) : null;
    if (!ghost || !real) return;
    const sync = () => {
      ghost.style.transform = real.style.transform;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(real, { attributes: true, attributeFilter: ["style"] });
    const arm = requestAnimationFrame(() => {
      ghost.dataset.armed = "";
    });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(arm);
    };
  }, [ghostId, ready]);

  return (
    <div
      ref={containerRef}
      className={styles.stage}
      // Isolating dims the other items more lightly than the highlight
      // toggles' --dim-white.
      style={isolating ? { ...LIFT_VARS, "--dim-white": JAR_ISOLATE_DIM } as CSSProperties : LIFT_VARS}
    >
      <Image
        src="/images/drawings/jar.svg"
        alt=""
        aria-hidden="true"
        className={styles.jarImage}
        draggable={false}
        width={1600}
        height={2257}
        priority
        // Traced from the original jar.png to SVG (see
        // public/images/drawings/jar.svg) so this fine hand-drawn linework
        // renders crisply at any zoom/display size instead of pixelating
        // like a raster image does once you exceed its native resolution.
        unoptimized={process.env.NODE_ENV !== "production"}
      />

      {ready && (
        <div className={styles.itemLayer}>
          {items.map((item) => {
            const info = renderInfo[item.id];
            if (!info) return null;
            const base = getJarItemVisualState(item.category, projectsOn, favouritesOn);
            const lifted = isolating && item.id === isolatedId;
            const dimmed = isolating ? !lifted : base.dimmed;
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
          {(() => {
            const item = ghostId ? items.find((i) => i.id === ghostId) : undefined;
            const info = item ? renderInfo[item.id] : undefined;
            if (!item || !info) return null;
            return (
              <JarItem
                key={`ghost-${item.id}`}
                item={item}
                ref={ghostRef}
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
                outlineMask={null}
                dimmed={false}
                bordered={false}
                lifted={isolating && item.id === isolatedId}
                ghost
                ghostVisible={isolating && item.id === isolatedId}
              />
            );
          })()}
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
