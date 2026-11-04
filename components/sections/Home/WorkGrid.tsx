"use client";

import { useMemo, useRef, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import styles from "./WorkGrid.module.css";
import AutoplayVideo from "@/components/sections/Projects/AutoplayVideo";
import ScrollHint from "./ScrollHint";
import { PROJECTS } from "@/lib/projects";
import { content } from "@/lib/content";
import { EXTRAS_PHOTOS } from "@/lib/extras";
import {
  EASE_IN,
  EASE_OUT,
  GRID_STAGGER,
  GRID_TILE_RISE_PX,
  GRID_TILE_S,
  GRID_TILE_SCALE,
  EASE_OVERSHOOT,
  HEADING_DROP_PX,
  HEADING_DROP_S,
  slowTransition,
  JAR_LIFT_IN_MS,
  JAR_LIFT_OUT_MS,
  TILE_LIFT_PX,
  WORK_EXIT_RISE_PX,
  WORK_EXIT_S,
} from "@/lib/motion";

const copy = content.en.projects;

// A sidebar-hovered tile's lift (WorkGrid.module.css .lifted) — same timing
// as the jar item's.
const LIFT_VARS = {
  "--tile-lift": `${TILE_LIFT_PX}px`,
  "--lift-in-ms": `${JAR_LIFT_IN_MS}ms`,
  "--lift-out-ms": `${JAR_LIFT_OUT_MS}ms`,
} as CSSProperties;

/** The sidebar's Works list hovers "extras" for the Extras page: that lifts
 * the whole extras column. */
const EXTRAS_ID = "extras";

interface Tile {
  id: string;
  href: string;
  title: string;
  year: number | null;
  cover: string | null;
  video: string | null;
  /** width / height of the media, for a card shaped to it (the extras —
   * portrait posters show whole instead of cropped). null: the standard
   * 3:2 cover. */
  aspect: number | null;
}

// The case studies (big, left column), in lib/projects.ts's authoring order.
const BIG_TILES: Tile[] = PROJECTS.map((p) => ({
  id: p.slug,
  href: `/${p.slug}`,
  title: p.title,
  year: p.year,
  cover: p.cover,
  // Plays over the cover once the card's on screen (AutoplayVideo).
  video: p.video ?? null,
  aspect: null,
}));

// Each extra from the Extras page (small, right column), in lib/extras.ts's
// order. They have no page of their own, so each links to the Extras page;
// no year. Each card takes its media's own shape.
const SMALL_TILES: Tile[] = EXTRAS_PHOTOS.map((photo, i) => ({
  id: `extra-${i}`,
  href: "/extras",
  title: photo.caption,
  year: null,
  cover: photo.isVideo ? null : photo.src,
  video: photo.isVideo ? photo.src : null,
  aspect: photo.width / photo.height,
}));

/** Each card's place in the arrival sweep: top to bottom down the stage,
 * left column first on a tie. A small card is about half a big one's
 * height, so small card j sits level with big card j / 2. */
const SWEEP_ORDER = new Map<string, number>(
  [
    ...BIG_TILES.map((t, i) => ({ id: t.id, y: i * 2 })),
    ...SMALL_TILES.map((t, j) => ({ id: t.id, y: j + 0.5 })),
  ]
    .sort((a, b) => a.y - b.y)
    .map(({ id }, order) => [id, order]),
);

/**
 * Work mode's stage (brief Part 2.4): "what's inside?", then two columns of
 * cards: the case studies big on the left (their videos play once on
 * screen), and each extra (from the Extras page) small on the right, shaped
 * to its media. It scrolls inside the stage; at the bottom, a "jump to jar"
 * doodle goes straight back to the jar.
 *
 * Arriving, the cards sweep in one after another, top to bottom
 * (GRID_STAGGER apart, SWEEP_ORDER). Leaving (back to jar), the whole view
 * slides up and fades out at once — Home/index.tsx waits for that before
 * showing the jar.
 */
export default function WorkGrid({
  focusedId = null,
  onJumpToJar,
}: {
  focusedId?: string | null;
  /** The "jump to jar" doodle at the bottom was clicked. */
  onJumpToJar?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  // A case study hovered in the sidebar: its card lifts, the others dim.
  // "Extras" lifts the whole extras column.
  const isolating = focusedId !== null && (focusedId === EXTRAS_ID || BIG_TILES.some((t) => t.id === focusedId));
  const isLifted = (tile: Tile, small: boolean) => isolating && (small ? focusedId === EXTRAS_ID : tile.id === focusedId);


  // The work view scrolls; the end doodle draws on when it's in view there.
  const viewRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const endInView = useInView(endRef, { root: viewRef, amount: 0.6 });

  const variants = useMemo<{ view: Variants; tile: Variants }>(
    () => ({
      view: {
        shown: { opacity: 1, y: 0 },
        gone: reduced
          ? { opacity: 0, transition: { duration: 0 } }
          : {
              opacity: 0,
              y: -WORK_EXIT_RISE_PX,
              transition: slowTransition({ duration: WORK_EXIT_S, ease: EASE_IN }),
            },
      },
      tile: {
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y: GRID_TILE_RISE_PX, scale: GRID_TILE_SCALE },
        shown: (i: number) => ({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: reduced
            ? { duration: 0 }
            : slowTransition({ duration: GRID_TILE_S, delay: i * GRID_STAGGER, ease: EASE_OUT }),
        }),
      },
    }),
    [reduced],
  );

  function card(tile: Tile, small: boolean) {
    const lifted = isLifted(tile, small);
    const dimmed = isolating && !lifted;
    return (
      <motion.li
        key={tile.id}
        className={styles.tileItem}
        custom={SWEEP_ORDER.get(tile.id) ?? 0}
        variants={variants.tile}
        initial="hidden"
        animate="shown"
      >
        <Link
          href={tile.href}
          className={`${styles.tile} ${small ? styles.small : ""} ${dimmed ? styles.dimmed : ""} ${lifted ? styles.lifted : ""}`}
          style={LIFT_VARS}
        >
          <span className={styles.cover} style={tile.aspect ? { aspectRatio: tile.aspect } : undefined}>
            {tile.cover && tile.video ? (
              <AutoplayVideo src={tile.video} poster={tile.cover} />
            ) : tile.cover ? (
              <Image
                src={tile.cover}
                alt=""
                fill
                sizes={small ? "(max-width: 767px) 50vw, 340px" : "(max-width: 767px) 100vw, 680px"}
                className={styles.media}
              />
            ) : tile.video ? (
              <video
                className={styles.media}
                src={tile.video}
                muted
                loop
                playsInline
                autoPlay={!reduced}
                preload="metadata"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span className={styles.caption}>
            <span className={styles.title}>{tile.title}</span>
            {tile.year !== null && <span className={styles.year}>{tile.year}</span>}
          </span>
        </Link>
      </motion.li>
    );
  }

  return (
    // data-scroll-switch-target: the box useScrollSwitch checks before a key
    // press switches back to the jar (only once it's scrolled to the top).
    <motion.div
      ref={viewRef}
      className={styles.work}
      variants={variants.view}
      initial="shown"
      animate="shown"
      exit="gone"
      data-scroll-switch-target
    >
      {/* Drops in from above with a little overshoot, as the jar leaves
       * (brief Part 2.4: the camera panning down into the jar). */}
      <motion.h2
        className={styles.heading}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -HEADING_DROP_PX }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.2 } : slowTransition({ duration: HEADING_DROP_S, ease: EASE_OVERSHOOT })}
      >
        {copy.heading}
      </motion.h2>

      {/* Two columns: the case studies big on the left (2/3), the extras
       * small on the right (1/3), each stacked. */}
      <div className={styles.columns}>
        <ul className={styles.bigList}>{BIG_TILES.map((tile) => card(tile, false))}</ul>
        <ul className={styles.smallList}>{SMALL_TILES.map((tile) => card(tile, true))}</ul>
      </div>

      {/* The end of the list: a doodle that takes you back to the jar. It
       * draws on once it scrolls into view. */}
      <div ref={endRef} className={styles.end}>
        <ScrollHint
          shown={endInView}
          onActivate={() => onJumpToJar?.()}
          label={content.en.sidebar.modes.jumpToJar}
          ariaLabel={content.en.sidebar.modes.toJarLabel}
          up
          className={styles.jumpToJar}
        />
      </div>
    </motion.div>
  );
}
