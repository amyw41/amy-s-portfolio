"use client";

import { useMemo, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./WorkGrid.module.css";
import AutoplayVideo from "@/components/sections/Projects/AutoplayVideo";
import { PROJECTS } from "@/lib/projects";
import { content } from "@/lib/content";
import { buildWobblyLinePath } from "@/lib/wobbly";
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
const footerCopy = content.en.footer;
const copyFooterLinksLabel = content.en.sidebar.social.label;
const FOOTER_LINKS = [footerCopy.links.linkedin, footerCopy.links.email, footerCopy.links.twitter];

// The footer's tiny hand-drawn ↑ before "jump to jar": a shaft and an open
// head, low wobble, in the strip's white.
const UP_ARROW_W = 8;
const UP_ARROW_H = 10;
const UP_ARROW = [
  buildWobblyLinePath(140, [UP_ARROW_W / 2, UP_ARROW_H - 0.5], [UP_ARROW_W / 2, 1], 0.15),
  buildWobblyLinePath(141, [1, UP_ARROW_W / 2 - 0.5], [UP_ARROW_W / 2, 1], 0.1) +
    " " +
    buildWobblyLinePath(142, [UP_ARROW_W / 2, 1], [UP_ARROW_W - 1, UP_ARROW_W / 2 - 0.5], 0.1),
];

function UpArrow() {
  return (
    <svg
      className={styles.upArrow}
      width={UP_ARROW_W}
      height={UP_ARROW_H}
      viewBox={`0 0 ${UP_ARROW_W} ${UP_ARROW_H}`}
      fill="none"
      aria-hidden="true"
    >
      {UP_ARROW.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

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

const projectTile = (p: (typeof PROJECTS)[number]): Tile => ({
  id: p.slug,
  href: `/${p.slug}`,
  title: p.title,
  year: p.year,
  cover: p.cover,
  // Plays over the cover once the card's on screen (AutoplayVideo).
  video: p.video ?? null,
  aspect: null,
});

// The case studies shown big (left column), in lib/projects.ts's authoring
// order. Which ones are small instead is the `small` flag on each project's
// seed there.
const BIG_TILES: Tile[] = PROJECTS.filter((p) => !p.small).map(projectTile);

// The right column, small: the smaller case studies first (SkinSprout,
// `small: true` in lib/projects.ts), then the teaser extra(s) — the ones
// flagged `teaser` in lib/extras.ts (just the Birthday website for now),
// each linking to its own spot on the Play page, no year, shaped to its
// media. The rest of the extras are on the Play page only.
const SMALL_TILES: Tile[] = [
  ...PROJECTS.filter((p) => p.small).map(projectTile),
  ...EXTRAS_PHOTOS.filter((photo) => photo.teaser).map((photo) => ({
    id: `extra-${photo.id}`,
    href: `/playground#extra-${photo.id}`,
    title: photo.caption,
    year: null,
    cover: photo.isVideo ? null : photo.src,
    video: photo.isVideo ? photo.src : null,
    aspect: photo.width / photo.height,
  })),
];

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
 * screen), and the smaller ones (SkinSprout) small on the right, above a
 * teaser extra (the Birthday website) shaped to its media (the rest of the
 * extras are on the Play page). It scrolls inside the stage; at the bottom,
 * a thin black footer strip has the credit, "jump to jar" and the links.
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
  /** "jump to jar" in the footer strip was clicked. */
  onJumpToJar?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  // A case study hovered in the sidebar: its card lifts, the others dim.
  // "Extras" lifts the teaser extra(s).
  const isolating =
    focusedId !== null && (focusedId === EXTRAS_ID || [...BIG_TILES, ...SMALL_TILES].some((t) => t.id === focusedId));
  const isLifted = (tile: Tile) =>
    isolating && (tile.id === focusedId || (focusedId === EXTRAS_ID && tile.id.startsWith("extra-")));


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
    const lifted = isLifted(tile);
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

      {/* Two columns: the bigger case studies on the left (2/3), the smaller
       * ones and the teaser extra(s) small on the right (1/3), each stacked. */}
      <div className={styles.columns}>
        <ul className={styles.bigList}>{BIG_TILES.map((tile) => card(tile, false))}</ul>
        {/* The rest of the extras are on the Play page. */}
        <ul className={styles.smallList}>{SMALL_TILES.map((tile) => card(tile, true))}</ul>
      </div>

      {/* The end of the list: a thin black footer strip — the credit, a way
       * back to the jar, and the links. */}
      <footer className={styles.footer}>
        <span className={styles.credit}>{footerCopy.credit}</span>
        <button
          type="button"
          className={styles.footerLink}
          aria-label={content.en.sidebar.modes.toJarLabel}
          onClick={() => onJumpToJar?.()}
        >
          <UpArrow />
          {content.en.sidebar.modes.jumpToJar}
        </button>
        <nav className={styles.footerLinks} aria-label={copyFooterLinksLabel}>
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.href}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a
                className={styles.footerLink}
                href={link.href}
                {...(link.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {link.label}
              </a>
            </span>
          ))}
        </nav>
      </footer>
    </motion.div>
  );
}
