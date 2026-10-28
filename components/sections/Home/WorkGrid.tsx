"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./WorkGrid.module.css";
import CircleToggle from "@/components/ui/CircleToggle";
import { PROJECTS, PROJECT_CATEGORY_COLOR, type ProjectCategory } from "@/lib/projects";
import { content } from "@/lib/content";
import {
  EASE_IN,
  EASE_OUT,
  GRID_REORDER_S,
  GRID_STAGGER,
  GRID_TILE_RISE_PX,
  GRID_TILE_S,
  GRID_TILE_SCALE,
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
/** Extras isn't a Project (no category, see ExtrasCard.tsx), so it gets an
 * id of its own outside the slug namespace. */
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

// Every case study, in lib/projects.ts's authoring order, then Extras last.
// Extras has no cover image — its tile plays its thumbnail video instead.
const TILES: Tile[] = [
  ...PROJECTS.map((p) => ({
    id: p.slug,
    href: `/${p.slug}`,
    title: p.title,
    year: p.year,
    category: p.category,
    cover: p.cover,
    video: null,
  })),
  {
    id: EXTRAS_ID,
    href: "/extras",
    title: copy.extras.title,
    year: null,
    category: null,
    cover: null,
    video: "/images/projects/extras/thumbnail.mp4",
  },
];

/**
 * Work mode's stage (brief Part 2.4): "what's inside?", the category
 * filters, and a grid of case-study tiles.
 *
 * Filtering works like the old Projects section: matching tiles move to the
 * front (a stable partition of the default order, so turning every filter
 * off restores it exactly) and the rest dim. Tiles slide to their new
 * places via Framer's `layout`.
 *
 * Arriving, the tiles sweep in one after another from the top left
 * (GRID_STAGGER apart). Leaving (back to jar), the whole view slides up and
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

  const ordered = useMemo(() => {
    const matches = (t: Tile) => active.size === 0 || (t.category !== null && active.has(t.category));
    return TILES.map((tile, index) => ({ tile, index, match: matches(tile) }))
      .sort((a, b) => Number(b.match) - Number(a.match) || a.index - b.index)
      .map(({ tile, match }) => ({ tile, dimmed: !match }));
  }, [active]);

  // A case study hovered in the sidebar: its tile lifts, the others dim.
  const isolating = focusedId !== null && TILES.some((t) => t.id === focusedId);

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

  return (
    <motion.div className={styles.work} variants={variants.view} initial="shown" animate="shown" exit="gone">
      <h2 className={styles.heading}>{copy.heading}</h2>
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

      <ul className={styles.grid}>
        {ordered.map(({ tile, dimmed: filteredOut }) => {
          const lifted = isolating && tile.id === focusedId;
          const dimmed = isolating ? !lifted : filteredOut;
          return (
            <motion.li
              key={tile.id}
              className={styles.tileItem}
              layout={reduced ? false : "position"}
              // Each tile's sweep delay is its place in the default order, so
              // the arrival sweep is always top-left first.
              custom={TILES.indexOf(tile)}
              variants={variants.tile}
              initial="hidden"
              animate="shown"
              transition={{ layout: slowTransition({ duration: GRID_REORDER_S, ease: EASE_OUT }) }}
            >
              <Link
                href={tile.href}
                className={`${styles.tile} ${dimmed ? styles.dimmed : ""} ${lifted ? styles.lifted : ""}`}
                style={LIFT_VARS}
              >
                <span className={styles.cover}>
                  {tile.cover ? (
                    <Image src={tile.cover} alt="" fill sizes="(max-width: 767px) 50vw, 280px" className={styles.media} />
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
        })}
      </ul>
    </motion.div>
  );
}
