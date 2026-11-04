"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./WorkGrid.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import { PROJECTS, PROJECT_CATEGORY_COLOR, type ProjectCategory } from "@/lib/projects";
import { content } from "@/lib/content";
import { EXTRAS_PHOTOS } from "@/lib/extras";
import {
  EASE_IN,
  EASE_OUT,
  GRID_REORDER_S,
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

const CATEGORY_ORDER: ProjectCategory[] = ["work", "personal", "hackathon"];
/** The sidebar's Works list hovers "extras" for the Extras page: that lifts
 * the whole extras column. */
const EXTRAS_ID = "extras";

interface Tile {
  id: string;
  href: string;
  title: string;
  year: number | null;
  category: ProjectCategory | null;
  cover: string | null;
  video: string | null;
}

// The case studies (big, left column), in lib/projects.ts's authoring order.
const BIG_TILES: Tile[] = PROJECTS.map((p) => ({
  id: p.slug,
  href: `/${p.slug}`,
  title: p.title,
  year: p.year,
  category: p.category,
  cover: p.cover,
  video: null,
}));

// Each extra from the Extras page (small, right column), in lib/extras.ts's
// order. They have no page of their own, so each links to the Extras page;
// no year, and none of the work/personal/hackathon categories.
const SMALL_TILES: Tile[] = EXTRAS_PHOTOS.map((photo, i) => ({
  id: `extra-${i}`,
  href: "/extras",
  title: photo.caption,
  year: null,
  category: null,
  cover: photo.isVideo ? null : photo.src,
  video: photo.isVideo ? photo.src : null,
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
 * Work mode's stage (brief Part 2.4): "what's inside?", the category
 * filters, then two columns of cards: the case studies big on the left, and
 * each extra (from the Extras page) small on the right. It scrolls inside
 * the stage when it's taller than the screen.
 *
 * Filtering works like the old Projects section: matching tiles move to the
 * front (a stable partition of the default order, so turning every filter
 * off restores it exactly) and the rest dim. Tiles slide to their new
 * places via Framer's `layout`.
 *
 * Arriving, the tiles sweep in one after another from the top left
 * (GRID_STAGGER apart, SWEEP_ORDER). Leaving (back to jar), the whole view slides up and
 * fades out at once — Home/index.tsx waits for that before showing the jar.
 */
export default function WorkGrid({ focusedId = null }: { focusedId?: string | null }) {
  const reduced = useReducedMotion() ?? false;
  const [active, setActive] = useState<Set<ProjectCategory>>(() => new Set());

  function toggleCategory(category: ProjectCategory) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  // The case studies, matching ones first (filters); the extras never match
  // a filter, so they dim while any is on.
  const ordered = useMemo(() => {
    const matches = (t: Tile) => active.size === 0 || (t.category !== null && active.has(t.category));
    return BIG_TILES.map((tile, index) => ({ tile, index, match: matches(tile) }))
      .sort((a, b) => Number(b.match) - Number(a.match) || a.index - b.index)
      .map(({ tile, match }) => ({ tile, dimmed: !match }));
  }, [active]);

  // A case study hovered in the sidebar: its card lifts, the others dim.
  // "Extras" lifts the whole extras column.
  const isolating = focusedId !== null && (focusedId === EXTRAS_ID || BIG_TILES.some((t) => t.id === focusedId));
  const isLifted = (tile: Tile, small: boolean) => isolating && (small ? focusedId === EXTRAS_ID : tile.id === focusedId);


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

  function card(tile: Tile, small: boolean, filteredOut: boolean) {
    const lifted = isLifted(tile, small);
    const dimmed = isolating ? !lifted : filteredOut;
    return (
      <motion.li
        key={tile.id}
        className={styles.tileItem}
        // Only the case studies reorder (filters).
        layout={reduced || small ? false : "position"}
        custom={SWEEP_ORDER.get(tile.id) ?? 0}
        variants={variants.tile}
        initial="hidden"
        animate="shown"
        transition={{ layout: slowTransition({ duration: GRID_REORDER_S, ease: EASE_OUT }) }}
      >
        <Link
          href={tile.href}
          className={`${styles.tile} ${small ? styles.small : ""} ${dimmed ? styles.dimmed : ""} ${lifted ? styles.lifted : ""}`}
          style={LIFT_VARS}
        >
          <span className={styles.cover}>
            {tile.cover ? (
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
      <div className={styles.filters}>
        {CATEGORY_ORDER.map((category) => (
          <CircleToggle
            key={category}
            label={copy.filters[category]}
            color={PROJECT_CATEGORY_COLOR[category]}
            active={active.has(category)}
            onToggle={() => toggleCategory(category)}
          />
        ))}
      </div>

      {/* Two columns: the case studies big on the left (2/3), the extras
       * small on the right (1/3), each stacked. */}
      <div className={styles.columns}>
        <ul className={styles.bigList}>{ordered.map(({ tile, dimmed }) => card(tile, false, dimmed))}</ul>
        <ul className={styles.smallList}>{SMALL_TILES.map((tile) => card(tile, true, active.size > 0))}</ul>
      </div>
    </motion.div>
  );
}
