"use client";

import { useEffect, useRef, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import Image from "next/image";
import styles from "./JarStage.module.css";
import JarItem from "./JarItem";
import { useJarPhysics } from "./useJarPhysics";
import { getJarItemVisualState } from "./jar-visual-state";
import type { JarItemDef } from "./items.manifest";
import { JAR_LIFT_IN_MS, JAR_LIFT_OUT_MS, JAR_LIFT_PX, JAR_LIFT_SCALE } from "@/lib/motion";

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
}

export default function JarStage({
  items,
  projectsOn,
  favouritesOn,
  textPlatformsRef,
  isolatedId = null,
  start = true,
  jostleRef,
}: JarStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, renderInfo, outlineMasks, registerItemEl, debugWalls, debugPhysicsEnabled, jostle } = useJarPhysics(
    containerRef,
    items,
    textPlatformsRef,
    { start },
  );

  useEffect(() => {
    if (!jostleRef) return;
    jostleRef.current = jostle;
    return () => {
      jostleRef.current = null;
    };
  }, [jostle, jostleRef]);

  const isolating = isolatedId !== null && items.some((item) => item.id === isolatedId);

  return (
    <div ref={containerRef} className={styles.stage} style={LIFT_VARS}>
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
}
