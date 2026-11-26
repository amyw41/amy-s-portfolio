"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import type { AnimationPlaybackControls, MotionValue } from "framer-motion";
import styles from "./FooterStrip.module.css";
import BuzzPath from "@/components/ui/BuzzPath";
import { WHATS_INSIDE_ITEMS } from "@/lib/whatsInsideItems";
import { content } from "@/lib/content";
import { ITEM_BBOXES } from "@/lib/itemBBoxes";
import { FOOTER_CAROUSEL_COAST_MS, FOOTER_CAROUSEL_SLIDE_S, slowMs } from "@/lib/motion";
import { buildWobblyLinePath, buildWobblyOvalPath, LINE_STROKE_WIDTH, VIEW_BOX } from "@/lib/wobbly";

const copy = content.en.footer;
const captions: Record<string, string> = copy.itemCaptions;

// The jar's own favourite items (the same list as the About page's), each
// with its caption: Amy's own words where she's written them
// (content.footer.itemCaptions), otherwise the item's name in lowercase.
const ITEMS = WHATS_INSIDE_ITEMS.map((item) => ({
  ...item,
  caption: captions[item.id] ?? item.name.toLowerCase(),
}));

// Every item shown at the same visual size, whatever its file: each is
// trimmed to its artwork (the alpha bounding box, as the jar does) and
// sized so its area matches (√(w·h) = ITEM_SIZE), within the window
// (ITEM_MAX_W × ITEM_MAX_H). ITEM_SIZE is the skullpanda's size.
const ITEM_SIZE = 150;
const ITEM_MAX_W = 320;
const ITEM_MAX_H = 180;
// Per-item touches, by jar id: `scale` on top of the shared size, and
// `rotate` (degrees, clockwise) to lay an item at an angle (sized by its
// turned shape).
const ITEM_TWEAKS: Record<string, { scale?: number; rotate?: number }> = {
  laneige: { scale: 0.85 },
  rabbit: { rotate: 85 },
};
/** An item's artwork bounds within its file (the trim). */
interface AlphaBBox {
  naturalWidth: number;
  naturalHeight: number;
  bboxX: number;
  bboxY: number;
  bboxW: number;
  bboxH: number;
}
/** Found on a small copy of the image (at most TRIM_SCAN_PX across), not
 * the full file: scanning every pixel of the full-size files was the
 * footer's biggest cost (hundreds of ms on the main thread as it mounted,
 * i.e. as the work view opened). A pixel or two of error at that scale is
 * invisible. */
const TRIM_SCAN_PX = 96;
function scanBBox(img: HTMLImageElement): AlphaBBox {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const full = { naturalWidth: nw, naturalHeight: nh, bboxX: 0, bboxY: 0, bboxW: nw, bboxH: nh };
  const k = Math.min(1, TRIM_SCAN_PX / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * k));
  const h = Math.max(1, Math.round(nh * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return full;
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return full;
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return full;
  return { naturalWidth: nw, naturalHeight: nh, bboxX: x0 / k, bboxY: y0 / k, bboxW: (x1 - x0 + 1) / k, bboxH: (y1 - y0 + 1) / k };
}
const bboxCache = new Map<string, Promise<AlphaBBox>>();
/** An item's trim: worked out ahead of time from the files where it can be
 * (lib/itemBBoxes.ts, scripts/item-bboxes.mjs), so the browser only loads
 * the image; otherwise scanned here. */
function loadBBox(src: string): Promise<AlphaBBox> {
  let p = bboxCache.get(src);
  const known = ITEM_BBOXES[src];
  if (!p && known) {
    p = Promise.resolve(known);
    bboxCache.set(src, p);
  }
  if (!p) {
    p = new Promise<AlphaBBox>((resolve, reject) => {
      const img = new window.Image();
      img.src = src;
      // Decoded off the main thread first, so the scan doesn't decode it.
      img
        .decode()
        .then(() => resolve(scanBBox(img)))
        .catch(reject);
    });
    bboxCache.set(src, p);
  }
  return p;
}

/** One item, trimmed to its artwork and sized like the others. */
function ItemArt({ id, src, alt }: { id: string; src: string; alt: string }) {
  const [box, setBox] = useState<AlphaBBox | null>(null);
  useEffect(() => {
    let live = true;
    loadBBox(src).then((b) => live && setBox(b), () => undefined);
    return () => {
      live = false;
    };
  }, [src]);
  if (!box) return null;
  const tweak = ITEM_TWEAKS[id] ?? {};
  const turn = ((tweak.rotate ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(turn));
  const sin = Math.abs(Math.sin(turn));
  // The artwork's own (unturned) size, from its area and shape...
  const aspect = box.bboxW / box.bboxH;
  let w = ITEM_SIZE * (tweak.scale ?? 1) * Math.sqrt(aspect);
  let h = (ITEM_SIZE * (tweak.scale ?? 1)) / Math.sqrt(aspect);
  // ...fitted so its turned footprint stays inside the window.
  const fit = Math.min(1, ITEM_MAX_W / (w * cos + h * sin), ITEM_MAX_H / (w * sin + h * cos));
  w *= fit;
  h *= fit;
  const scale = w / box.bboxW;
  return (
    <div
      className={styles.itemArt}
      style={{ width: w, height: h, transform: tweak.rotate ? `rotate(${tweak.rotate}deg)` : undefined }}
    >
      {/* A plain img: it's placed by its own pixels (the trim), which the
       * optimised next/image box doesn't allow. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          position: "absolute",
          width: box.naturalWidth * scale,
          height: box.naturalHeight * scale,
          left: -box.bboxX * scale,
          top: -box.bboxY * scale,
          maxWidth: "none",
        }}
      />
    </div>
  );
}

// Load (and trim) the items only once the footer is getting close (`near`),
// then when the page is idle, so stepping never waits. Not at mount: the
// footer is part of every page, and doing this as a page opened (during the
// zoom into a case study, or the switch to the work view) was a stall.
function usePreloadItems(near: boolean) {
  useEffect(() => {
    if (!near) return;
    // One item per idle moment, not all ten in one go: each scan is a few
    // tens of ms, and ten in a row was a stall of its own.
    let i = 0;
    let id = 0;
    const idle = typeof window.requestIdleCallback === "function";
    const next = () => {
      const item = ITEMS[i++];
      if (!item) return;
      loadBBox(item.image)
        .catch(() => undefined)
        .then(() => {
          // Safari has no requestIdleCallback: a short gap there instead.
          id = idle ? window.requestIdleCallback(next, { timeout: 2000 }) : (globalThis.setTimeout(next, 120) as unknown as number);
        });
    };
    id = idle ? window.requestIdleCallback(next, { timeout: 2000 }) : (globalThis.setTimeout(next, 300) as unknown as number);
    return () => {
      i = ITEMS.length;
      if (idle) window.cancelIdleCallback(id);
      else globalThis.clearTimeout(id);
    };
  }, [near]);
}

// The arrow buttons: a hand-drawn circle with a little chevron in it, in a
// CHEVRON_BOX × CHEVRON_BOX box. Low wobble, like the jar's ink.
const CHEVRON_BOX = 20;
const CHEVRON = {
  prev: [buildWobblyLinePath(211, [12, 5], [7, 10], 0.12), buildWobblyLinePath(212, [7, 10], [12, 15], 0.12)],
  next: [buildWobblyLinePath(213, [8, 5], [13, 10], 0.12), buildWobblyLinePath(214, [13, 10], [8, 15], 0.12)],
};

function ArrowButton({ dir, seed, label, onClick }: { dir: "prev" | "next"; seed: number; label: string; onClick: () => void }) {
  // The hand-drawn oval, squeezed into the square button: a wobbly circle.
  const circle = useMemo(() => [0, 1, 2].map((v) => buildWobblyOvalPath(seed, 1, v)), [seed]);
  return (
    <button type="button" className={styles.arrowButton} aria-label={label} onClick={onClick}>
      <BuzzPath
        className={styles.arrowCircle}
        variants={circle}
        viewBox={VIEW_BOX}
        preserveAspectRatio="none"
        strokeWidth={LINE_STROKE_WIDTH * 1.6}
      />
      <svg className={styles.arrowChevron} viewBox={`0 0 ${CHEVRON_BOX} ${CHEVRON_BOX}`} fill="none" aria-hidden="true">
        {CHEVRON[dir].map((d, i) => (
          <path key={i} d={d} stroke="currentColor" strokeWidth={1} strokeLinecap="round" />
        ))}
      </svg>
    </button>
  );
}

/** How far apart the items sit on the strip (px): more than the widest
 * item (ITEM_MAX_W) plus the window's fade, so a neighbour only shows while
 * it's sliding through. */
const SLOT = 380;
const N = ITEMS.length;
const wrap = (n: number) => ((n % N) + N) % N;
/** Where item `i` sits relative to strip position `p`, in items, taken the
 * short way round the loop (−N/2 … N/2). Every item is always mounted and
 * just placed by this, so the loop has no seam and nothing pops in. */
const offsetOf = (i: number, p: number) => {
  const d = (((i - p) % N) + N) % N;
  return d > N / 2 ? d - N : d;
};

/** A drag is a drag (not a tap) once it's moved this far (px). */
const DRAG_SLOP = 4;
/** A flick this fast (px/ms) always moves at least one item, however short. */
const FLICK_VELOCITY = 0.3;
/** A single drag or flick moves at most this many items. */
const MAX_FLING = 3;

/** One item on the strip, placed every frame from the strip's position. */
function Slot({ index, pos, active }: { index: number; pos: MotionValue<number>; active: boolean }) {
  const it = ITEMS[index];
  const x = useTransform(pos, (p) => offsetOf(index, p) * SLOT);
  return (
    <motion.div className={styles.slideImageInner} style={{ x }} aria-hidden={!active}>
      <ItemArt id={it.id} src={it.image} alt={active ? it.name : ""} />
    </motion.div>
  );
}

/**
 * The footer's middle: the jar's items on a strip, one in view at a time,
 * its caption under it, and a hand-drawn circle arrow either side.
 *
 * It moves like a physical strip rather than a slideshow:
 * - The strip's position (`pos`, in items, unbounded) is the one source of
 *   truth; every item and the caption are read straight off it.
 * - The arrows (and ← / → keys) send it to the next item on a spring with
 *   no bounce. A spring picks up the speed it already has, so clicking again
 *   mid-slide just carries it on smoothly to the new item: no restart, no
 *   jolt. (The old fixed 450ms ease-out restarted from full speed on every
 *   click and covered most of the distance in its first 100ms, which read as
 *   a snap.)
 * - It can be dragged or swiped: the item follows the finger 1:1, and on
 *   release it coasts by the release speed and settles on the nearest item,
 *   a quick flick always moving on at least one.
 * - The caption fades out as an item leaves the middle and back in as the
 *   next arrives, tied to the position, so it never jumps ahead of the
 *   picture.
 * Reduced motion: arrows jump straight there; a drag still follows the
 * finger, then lands without the glide.
 */
export default function FooterCarousel() {
  const reduced = useReducedMotion() ?? false;
  // Whether the footer is within a screen or so of being seen.
  const rootRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || near) return;
    // Measured against the scroll box it's in (home: the page frame on
    // desktop, the work view on a phone), or the window (case studies), so
    // the 800px lead applies either way. Looked up once, on mount.
    let root: HTMLElement | null = el.parentElement;
    while (root && root !== document.body && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) {
      root = root.parentElement;
    }
    if (root === document.body) root = null;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), {
      root,
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  usePreloadItems(near);

  const start = Math.max(0, ITEMS.findIndex((item) => item.id === "skullpanda"));
  const pos = useMotionValue(start);
  // Where it's heading (unbounded), so quick clicks add up.
  const target = useRef(start);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  // The item nearest the middle: its caption shows, and it's the one
  // announced.
  const [at, setAt] = useState(start);
  useMotionValueEvent(pos, "change", (p) => setAt(wrap(Math.round(p))));
  // The caption is fully there on an item and gone halfway between two.
  const captionOpacity = useTransform(pos, (p) => Math.max(0, 1 - Math.abs(p - Math.round(p)) * 3));
  useEffect(() => () => anim.current?.stop(), []);

  const settle = (to: number, velocity?: number) => {
    target.current = to;
    anim.current?.stop();
    if (reduced) {
      pos.set(to);
      return;
    }
    anim.current = animate(pos, to, {
      type: "spring",
      visualDuration: slowMs(FOOTER_CAROUSEL_SLIDE_S * 1000) / 1000,
      bounce: 0,
      // Left out, it carries on at the speed it already has.
      ...(velocity !== undefined && { velocity }),
    });
  };
  const step = (by: number) => settle(target.current + by);

  // Drag / swipe.
  const drag = useRef<{ id: number; x0: number; p0: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || drag.current) return;
    anim.current?.stop();
    drag.current = { id: e.pointerId, x0: e.clientX, p0: pos.get(), moved: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.moved) {
      if (Math.abs(dx) < DRAG_SLOP) return;
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) {
      // Smoothed, so one jittery event doesn't decide the flick.
      const v = (e.clientX - d.lastX) / dt;
      d.v = d.v * 0.4 + v * 0.6;
    }
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    pos.set(d.p0 - dx / SLOT);
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      // A tap: carry on to where it was going.
      settle(target.current);
      return;
    }
    // Held still before letting go: no fling.
    const v = e.timeStamp - d.lastT > 80 ? 0 : d.v;
    const p = pos.get();
    let to = Math.round(p - (v * FOOTER_CAROUSEL_COAST_MS) / SLOT);
    const from = Math.round(d.p0);
    if (Math.abs(v) > FLICK_VELOCITY && to === from) to = from - Math.sign(v);
    to = Math.max(from - MAX_FLING, Math.min(from + MAX_FLING, to));
    // The strip's speed at release, in items per second.
    settle(to, (-v * 1000) / SLOT);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else return;
    e.preventDefault();
  };

  const item = ITEMS[at];
  if (!item) return null;
  return (
    <div
      ref={rootRef}
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={copy.carouselLabel}
      onKeyDown={onKeyDown}
    >
      <ArrowButton dir="prev" seed={221} label={copy.carouselPrev} onClick={() => step(-1)} />
      <figure className={styles.slide}>
        <div
          className={styles.slideImage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {near && ITEMS.map((it, i) => <Slot key={it.id} index={i} pos={pos} active={i === at} />)}
        </div>
        <motion.figcaption className={styles.caption} style={{ opacity: captionOpacity }} aria-live="polite">
          {item.caption}
        </motion.figcaption>
      </figure>
      <ArrowButton dir="next" seed={222} label={copy.carouselNext} onClick={() => step(1)} />
    </div>
  );
}
