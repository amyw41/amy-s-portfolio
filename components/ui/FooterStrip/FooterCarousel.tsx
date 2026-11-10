"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import styles from "./FooterStrip.module.css";
import BuzzPath from "@/components/ui/BuzzPath";
import { WHATS_INSIDE_ITEMS } from "@/lib/whatsInsideItems";
import { content } from "@/lib/content";
import { FOOTER_CAROUSEL_SLIDE_S, slowTransition } from "@/lib/motion";
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
function loadBBox(src: string): Promise<AlphaBBox> {
  let p = bboxCache.get(src);
  if (!p) {
    p = new Promise<AlphaBBox>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(scanBBox(img));
      img.onerror = reject;
      img.src = src;
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

// Load (and trim) the rest of the items once the page is idle, so stepping
// never waits but opening the page doesn't pay for it.
function usePreloadItems() {
  useEffect(() => {
    const run = () => ITEMS.forEach((item) => loadBBox(item.image).catch(() => undefined));
    // Safari has no requestIdleCallback: a short delay there instead.
    const idle = typeof window.requestIdleCallback === "function";
    const id: number = idle ? window.requestIdleCallback(run, { timeout: 3000 }) : (globalThis.setTimeout(run, 1500) as unknown as number);
    return () => (idle ? window.cancelIdleCallback(id) : globalThis.clearTimeout(id));
  }, []);
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

/**
 * The footer's middle: one of the jar's items at a time, its caption under
 * it, and a hand-drawn circle arrow either side to step through them
 * (wrapping round). Stepping slides the strip along like a carousel: the
 * item leaves to one side as the next comes in from the other, over
 * FOOTER_CAROUSEL_SLIDE_S; reduced motion: it just swaps.
 */
export default function FooterCarousel() {
  const reduced = useReducedMotion() ?? false;
  usePreloadItems();
  const [index, setIndex] = useState(() => Math.max(0, ITEMS.findIndex((item) => item.id === "skullpanda")));
  // Which way the last step went: 1 next (slides left), -1 previous.
  const [dir, setDir] = useState(1);
  const item = ITEMS[index];
  const step = (by: number) => {
    setDir(by);
    setIndex((i) => (i + by + ITEMS.length) % ITEMS.length);
  };
  const slide = reduced
    ? { duration: 0 }
    : slowTransition({ duration: FOOTER_CAROUSEL_SLIDE_S, ease: [0.65, 0, 0.35, 1] as const });

  if (!item) return null;
  return (
    <div className={styles.carousel} aria-roledescription="carousel" aria-label={copy.carouselLabel}>
      <ArrowButton dir="prev" seed={221} label={copy.carouselPrev} onClick={() => step(-1)} />
      <figure className={styles.slide}>
        <div className={styles.slideImage}>
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={item.id}
              className={styles.slideImageInner}
              custom={dir}
              variants={{
                // Half the window: from just inside one faded edge to the
                // middle (the window's own fade does most of the fading).
                enter: (d: number) => ({ x: `${d * 50}%`, opacity: 0 }),
                center: { x: "0%", opacity: 1 },
                leave: (d: number) => ({ x: `${d * -50}%`, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="leave"
              transition={slide}
            >
              <ItemArt id={item.id} src={item.image} alt={item.name} />
            </motion.div>
          </AnimatePresence>
        </div>
        <figcaption className={styles.caption} aria-live="polite">
          {item.caption}
        </figcaption>
      </figure>
      <ArrowButton dir="next" seed={222} label={copy.carouselNext} onClick={() => step(1)} />
    </div>
  );
}
