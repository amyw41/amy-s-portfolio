"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import styles from "./WorkGrid.module.css";
import AutoplayVideo from "@/components/sections/Projects/AutoplayVideo";
import ScrollHint from "./ScrollHint";
import FooterStrip from "@/components/ui/FooterStrip";
import { useCaseZoom } from "@/components/ui/CaseZoom";
import { PROJECTS } from "@/lib/projects";
import { content } from "@/lib/content";
import { EXTRAS_PHOTOS } from "@/lib/extras";
import {
  EASE_IN,
  EASE_OUT,
  GRID_COVER_WAIT_MS,
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
  /** The cover's background before its media loads: the project's own
   * light tint. null: the default grey (extras). */
  tint: string | null;
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
  tint: p.tint,
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
    tint: null,
  })),
];

/**
 * Which work-view layout:
 * - "equal": every case study the same size, two equal columns, in
 *   lib/projects.ts's order (= the sidebar's), then any teaser extras; "jump
 *   to jar" small in the bottom-right corner under them. (Current.)
 * - "split": the bigger case studies big on the left (2/3), the `small` ones
 *   and the teaser extras small on the right (1/3), "jump to jar" at the
 *   bottom of the right column. To go back to it: set this to "split", put
 *   `small: true` on the smaller projects (lib/projects.ts) and
 *   `teaser: true` on the extras to show (lib/extras.ts).
 */
const WORK_LAYOUT: "equal" | "split" = "equal";

/** "equal": every card in one grid, in order. */
const EQUAL_TILES: Tile[] = [...PROJECTS.map(projectTile), ...SMALL_TILES.filter((t) => t.id.startsWith("extra-"))];

/** Every card's cover, so they can all be loaded before the cards come in. */
const COVERS = EQUAL_TILES.map((t) => t.cover).filter((src): src is string => !!src);
let coversLoading: Promise<unknown> | null = null;
/** Loads and decodes every card's cover (once per visit). Home calls this
 * while the jar is sitting idle, so by the time you scroll down they're
 * ready and the cards come in at once. */
export function preloadWorkCovers(): Promise<unknown> {
  coversLoading ??= Promise.all(
    COVERS.map((src) => {
      const img = new window.Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    }),
  );
  return coversLoading;
}

/**
 * Work mode's stage (brief Part 2.4): "what's inside?", then two columns of
 * cards: the case studies big on the left (their videos play once on
 * screen), and the smaller ones (SkinSprout) small on the right, above a
 * teaser extra (the Birthday website) shaped to its media (the rest of the
 * extras are on the Play page). It scrolls inside the stage; at the bottom,
 * a thin black footer strip has the credit and the links; "jump to jar"
 * sits at the bottom of the right column.
 *
 * Arriving, the cards all come in together, once their covers have loaded
 * (or after GRID_COVER_WAIT_MS at most), so none pops in on its own. Leaving (back to jar), the whole view
 * slides up and fades out at once — Home/index.tsx waits for that before
 * showing the jar.
 */
export default function WorkGrid({
  focusedId = null,
  onJumpToJar,
}: {
  focusedId?: string | null;
  /** "jump to jar" (bottom of the right column) was clicked. */
  onJumpToJar?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  // A case study hovered in the sidebar: its card lifts, the others dim.
  // "Extras" lifts the teaser extra(s).
  const isolating =
    focusedId !== null && (focusedId === EXTRAS_ID || [...BIG_TILES, ...SMALL_TILES].some((t) => t.id === focusedId));
  const isLifted = (tile: Tile) =>
    isolating && (tile.id === focusedId || (focusedId === EXTRAS_ID && tile.id.startsWith("extra-")));


  // The work view scrolls; "jump to jar" draws on when it's in view there.
  const viewRef = useRef<HTMLDivElement>(null);
  const jumpRef = useRef<HTMLDivElement>(null);
  const jumpInView = useInView(jumpRef, { root: viewRef, amount: 0.6 });

  const zoom = useCaseZoom();

  // The cards wait for every cover to load (up to GRID_COVER_WAIT_MS), then
  // come in at once.
  const [coversReady, setCoversReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setCoversReady(true);
      }
    };
    const timer = window.setTimeout(finish, GRID_COVER_WAIT_MS);
    preloadWorkCovers().then(finish);
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
  }, []);


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
        shown: () => ({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: reduced
            ? { duration: 0 }
            : slowTransition({ duration: GRID_TILE_S, ease: EASE_OUT }),
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

        variants={variants.tile}
        initial="hidden"
        animate={coversReady ? "shown" : "hidden"}
      >
        <Link
          href={tile.href}
          data-work-card={tile.id}
          // Fetch the case study on hover, so the zoom lands without a wait.
          onPointerEnter={() => {
            if (!tile.id.startsWith("extra-")) zoom?.prefetch(tile.href);
          }}
          // A case study zooms in from its cover (components/ui/CaseZoom);
          // extras (to the Play page) just navigate.
          onClick={(e) => {
            const cover = e.currentTarget.querySelector<HTMLElement>(`.${styles.cover}`);
            if (!zoom || !cover || tile.id.startsWith("extra-") || !tile.cover) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            if (zoom.start({ href: tile.href, slug: tile.id, from: cover, src: tile.cover })) e.preventDefault();
          }}
          className={`${styles.tile} ${small ? styles.small : ""} ${dimmed ? styles.dimmed : ""} ${lifted ? styles.lifted : ""}`}
          style={LIFT_VARS}
        >
          <span
            className={styles.cover}
            style={{
              ...(tile.aspect ? { aspectRatio: tile.aspect } : null),
              ...(tile.tint ? { background: tile.tint } : null),
            }}
          >
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
      <div>
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

        {WORK_LAYOUT === "equal" ? (
          // Two equal columns, every case study the same size; "jump to jar"
          // tucked into the bottom-right corner under them, just above the
          // footer. It draws on once it scrolls into view.
          <>
            <ul className={styles.equalGrid}>{EQUAL_TILES.map((tile) => card(tile, false))}</ul>
          </>
        ) : (
          // Two columns: the bigger case studies on the left (2/3), the smaller
          // ones and the teaser extra(s) small on the right (1/3), each stacked.
          <div className={styles.columns}>
            <ul className={styles.bigList}>{BIG_TILES.map((tile) => card(tile, false))}</ul>
            {/* The rest of the extras are on the Play page. */}
            <div className={styles.smallColumn}>
              <ul className={styles.smallList}>{SMALL_TILES.map((tile) => card(tile, true))}</ul>
              {/* The way back to the jar, in the column's empty space at the
               * bottom. It draws on once it scrolls into view. */}
              <div ref={jumpRef} className={styles.jump}>
                <ScrollHint
                  shown={jumpInView}
                  onActivate={() => onJumpToJar?.()}
                  label={content.en.sidebar.modes.jumpToJar}
                  ariaLabel={content.en.sidebar.modes.toJarLabel}
                  up
                  className={styles.jumpToJar}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The end of the list: the footer, scrolling up into view after the
       * cards. */}
      <FooterStrip className={styles.footerPlace} onBackToTop={() => onJumpToJar?.()} />
    </motion.div>
  );
}
