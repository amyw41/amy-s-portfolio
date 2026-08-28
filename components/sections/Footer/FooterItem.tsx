"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./Footer.module.css";
import type { FooterItemDef } from "./items";

interface FooterItemProps {
  item: FooterItemDef;
  zIndex: number;
  onActivate: () => void;
}

/** Reference viewport width items.ts's own px numbers were authored/sized
 * against — at this width every item renders at exactly its authored size;
 * narrower or wider, every one of an item's six numbers (clipW/clipH/imgW/
 * imgH/imgLeft/imgTop) scales by the SAME fraction, so proportions between
 * the crop box and the full image behind it — the whole point of matching
 * the jar's own geometry — never drift apart from each other. */
const REFERENCE_VW = 1400;
/** How far each value is allowed to shrink/grow from its authored size —
 * matches the ~0.55–1.15x band the rest of this app's own per-item
 * clamp()s already use elsewhere (e.g. Hero.module.css's --hero-load-ms
 * siblings), rather than inventing a new ratio for this file alone. */
const MIN_FRACTION = 0.55;
const MAX_FRACTION = 1.15;

/** clamp(px, vw, px) for one of an item's own authored numbers — vw-based
 * so the whole pile scales together as the viewport does, exactly like the
 * jar's own single container-width-derived `s` scales every item together,
 * just expressed per-field instead of via one shared custom property (CSS
 * clamp() requires its min/max share the same type as its middle value;
 * mixing a raw unitless multiplier with px/vw lengths across a var()
 * boundary risks silently invalid CSS, so each field gets its own clamp
 * instead). Handles negative bases (imgLeft/imgTop) by sorting the two
 * bounds rather than assuming min-fraction gives the smaller value — for a
 * negative base, scaling by the *larger* fraction actually produces the
 * more negative (smaller) number. */
function scaled(base: number): string {
  // 1.2 (the other session's own bump) * 0.8 (shrink everything, per
  // request) = 0.96 — one shared multiplier so every item's clipW/clipH/
  // imgW/imgH/imgLeft/imgTop scales down together in lockstep, same as the
  // 1.2 bump it's layered on top of.
  base = base * 1.2 * 0.8;
  const a = base * MIN_FRACTION;
  const b = base * MAX_FRACTION;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  const vw = (base / REFERENCE_VW) * 100;
  return `clamp(${min}px, ${vw}vw, ${max}px)`;
}

/** How opaque a pixel needs to be (0–255) before a click/hover there counts
 * as "on the item" — a little above 0 rather than exactly 0, so a barely-
 * there anti-aliased edge pixel doesn't register as a hit either. */
const ALPHA_HIT_THRESHOLD = 20;

interface AlphaSource {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/** One decoded-pixels canvas per source file, shared by every FooterItem
 * instance (module-level, not per-component) — module scope in Next.js is
 * already a singleton per bundle, so every item pays for its own image's
 * decode exactly once no matter how many times this component mounts.
 * Getting per-pixel alpha out of an <img> the DOM already painted isn't
 * possible directly (no API for it); drawing that same file into an
 * off-screen canvas and reading it back with getImageData is the standard
 * way to recover it. */
const alphaCache = new Map<string, Promise<AlphaSource>>();

function loadAlphaSource(src: string): Promise<AlphaSource> {
  let entry = alphaCache.get(src);
  if (!entry) {
    entry = new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          reject(new Error("2d context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({ ctx, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error(`failed to load ${src}`));
      img.src = src;
    });
    alphaCache.set(src, entry);
  }
  return entry;
}

interface HitCandidate {
  isOpaqueAt: (clientX: number, clientY: number) => boolean;
  begin: (pointerId: number, clientX: number, clientY: number) => void;
  setHovering: (hovering: boolean) => void;
  /** Apply a drag delta (from the pointer's position at begin()) to this
   * item's own offset. See activeDrag's own comment for why this is driven
   * globally instead of through this item's own onPointerMove. */
  applyDrag: (dx: number, dy: number) => void;
  /** Clear this item's own dragging state. Called once the module-level
   * activeDrag resolves (pointerup/pointercancel), regardless of which
   * element's own onPointerUp/onPointerCancel actually fired. */
  endDrag: () => void;
}

/** Every mounted item's own hit layer <div> registers itself here (keyed by
 * that exact DOM node) the moment it mounts. Module-level, not per-item —
 * this is what lets one item's pointerdown (or pointermove, for hover) reach
 * past ITSELF and resolve to a different item instead; see
 * resolveOpaqueCandidateAt's own comment for why that's needed. */
const hitCandidates = new WeakMap<HTMLDivElement, HitCandidate>();

/** Whichever item's hit layer is currently reporting itself hovered, if
 * any — module-level so handlePointerHoverShared (every item's own
 * pointermove, while not dragging) can tell whether the resolved target
 * changed since the last move and only touch the two candidates' state
 * that actually need to flip, rather than every mounted item on every
 * mouse move. */
let currentHoverEl: HTMLDivElement | null = null;

/** Walks document.elementsFromPoint's full stack at this point — EVERY
 * element under the cursor, in top-to-bottom stacking order, not just
 * whichever one the browser hands a given event to — and returns the
 * first (topmost) registered hit layer whose own pixel is genuinely
 * opaque there. Shared by both the click resolver and the hover resolver
 * below, since they need to answer the exact same question: "of
 * everything stacked at this point, what am I actually looking at?" */
function resolveOpaqueCandidateAt(clientX: number, clientY: number): HTMLDivElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const el of stack) {
    if (!(el instanceof HTMLDivElement)) continue;
    const candidate = hitCandidates.get(el);
    if (!candidate) continue;
    if (candidate.isOpaqueAt(clientX, clientY)) return el;
  }
  return null;
}

/**
 * One pointerdown handler, shared byte-for-byte across every item's hit
 * layer (assigned as the literal same function reference in the JSX
 * below), rather than each item only ever considering its own pixel.
 *
 * Every item's hit layer is a full imgW x imgH rectangle (see .hitLayer's
 * own CSS comment) — mostly transparent padding around whatever the item's
 * artwork actually silhouettes. These rectangles overlap heavily (the pile
 * is deliberately overlapping/scattered — see items.ts's own doc comment),
 * so at any given point on screen there can be several items' rectangles
 * stacked on top of each other, and the DOM/CSS stacking order (z-index)
 * only ever hands a pointerdown to the SINGLE topmost one — regardless of
 * whether that topmost rectangle's own pixel there happens to be
 * transparent. A per-item-only opacity check (this file's first two
 * attempts) correctly refuses to start ITS OWN drag on a transparent
 * pixel, but does nothing further — the event never reaches whatever
 * lower/backmost item's actual artwork was genuinely visible right there,
 * because the topmost rectangle already claimed the event. That's exactly
 * what made laneige/chips/skullpanda (all seated further back in the pile
 * — see FOOTER_ITEMS' own z-order comment) hard to grab: several other
 * items' wide transparent padding sits above their visible pixels.
 *
 * resolveOpaqueCandidateAt (above) is what actually resolves that — it
 * begins the drag for the topmost item whose own pixel is genuinely
 * opaque here, which might not be the element this event actually landed
 * on. */
function handlePointerDownShared(e: React.PointerEvent<HTMLDivElement>) {
  const el = resolveOpaqueCandidateAt(e.clientX, e.clientY);
  if (!el) return;
  hitCandidates.get(el)?.begin(e.pointerId, e.clientX, e.clientY);
}

/**
 * Same idea as handlePointerDownShared, for hover instead of a click — also
 * shared byte-for-byte across every item's hit layer. A plain per-item
 * pointermove (this file's earlier version) only ever sees its OWN pixel,
 * and only ever fires at all when THIS item happens to be the DOM-topmost
 * box at the cursor — so an occluded-but-visible item (laneige sitting
 * under bottle's own wider padding, say) never got a pointermove of its
 * own to react to, and never showed the grab cursor even while hovering
 * artwork you can plainly see. This resolves the same "what's actually
 * under the cursor" question clicks now use, and flips exactly the two
 * items whose hover state actually changed (the previously-resolved one
 * off, the newly-resolved one on) rather than touching every item on
 * every move. */
function handlePointerHoverShared(e: React.PointerEvent<HTMLDivElement>) {
  const el = resolveOpaqueCandidateAt(e.clientX, e.clientY);
  if (el === currentHoverEl) return;
  if (currentHoverEl) hitCandidates.get(currentHoverEl)?.setHovering(false);
  currentHoverEl = el;
  if (el) hitCandidates.get(el)?.setHovering(true);
}

/** Which item's hit layer is currently being dragged, if any, and where the
 * pointer started — module-level, tracked independently of React's own
 * pointer-event dispatch. See the window listeners below for why. */
interface ActiveDrag {
  pointerId: number;
  el: HTMLDivElement;
  startX: number;
  startY: number;
}
let activeDrag: ActiveDrag | null = null;

/**
 * Drag CONTINUATION used to live entirely in each item's own onPointerMove,
 * gated on `setPointerCapture` (called in begin(), below) having actually
 * redirected subsequent native pointermove events to that item's own hit
 * layer regardless of where the cursor physically is. That works fine for
 * an item like bottle, whose hit layer is large and rarely covered by
 * anything else's — but for a small, heavily-occluded item like laneige or
 * skullpanda, the cursor drifts back over some OTHER item's much larger
 * (DOM-topmost, transparent-there) rectangle constantly during an ordinary
 * drag. If capture doesn't stick for any reason (it silently no-ops on a
 * synthetic pointer id — see begin()'s own try/catch — and isn't
 * guaranteed to redirect delivery in every engine either), those move
 * events land on that OTHER item's own onPointerMove instead, which reads
 * ITS OWN (idle) drag state and does nothing — so the item being dragged
 * just stalls until the cursor happens to cross back over its own small
 * box. These two module-level listeners sidestep the whole question of
 * which element's own handler the browser decided to fire: they run once,
 * at window scope, for every pointermove/pointerup/pointercancel in the
 * document, and drive whichever item activeDrag says is actually being
 * dragged directly — so continuation no longer depends on capture, on
 * DOM stacking order, or on the cursor staying over any particular box. */
function handleGlobalPointerMove(e: PointerEvent) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
  hitCandidates.get(activeDrag.el)?.applyDrag(e.clientX - activeDrag.startX, e.clientY - activeDrag.startY);
}

function handleGlobalPointerEnd(e: PointerEvent) {
  if (!activeDrag || e.pointerId !== activeDrag.pointerId) return;
  hitCandidates.get(activeDrag.el)?.endDrag();
  activeDrag = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("pointermove", handleGlobalPointerMove);
  window.addEventListener("pointerup", handleGlobalPointerEnd);
  window.addEventListener("pointercancel", handleGlobalPointerEnd);
}

/**
 * Plain pointer dragging, no physics — position stays at the item's
 * authored percentage coordinates; dragging only ever adds a translate
 * offset on top of that (never touches left/top), so the pile holds its
 * arrangement across viewport widths.
 *
 * Sizing/crop is the same two-layer technique as the jar's own JarItem.tsx
 * (an outer clip box sized to the item's alpha bbox, overflow:hidden, with
 * the full source image behind it offset by imgLeft/imgTop) minus
 * everything JarItem also does that this brief explicitly doesn't need
 * here: no outline ring, no dim overlay, no border/highlight on click —
 * just the crop, so the item reads the same size here as it does in the
 * jar. Every item's own clipW/clipH/imgW/imgH/imgLeft/imgTop already bakes
 * in items.ts's own ITEM_SCALE; --s (set once, up on .panel) is the one
 * remaining shared multiplier every item reads its own numbers through, so
 * the whole pile scales down together on a narrow viewport exactly like
 * the jar's own single `s` scales every item together — never an
 * independent per-item clamp() the way this file used to do it.
 *
 * Hit-testing: the jar's own items get pixel-accurate hover/drag for free
 * — Matter.Mouse there hit-tests the physics body's own polygon, not a DOM
 * box. This one has no physics engine, so it needs its own equivalent, and
 * has gone through a few iterations to get there — CSS masking (twice: once
 * cropping every item's artwork by mistake, then not reliably restricting
 * hit-testing at all), then a real per-pixel alpha check on pointerdown
 * (isOpaqueAt, below) that correctly refused a click on empty padding but
 * — for an item seated further back in the pile — could still get its own
 * transparent padding claimed by another item's larger rectangle sitting
 * on top of it, leaving that item hard to grab at all. handlePointerDownShared
 * (module scope, above) is what actually resolves that: every item's hit
 * layer shares that one literal handler, which walks the FULL stack of
 * overlapping items at the click point (not just whichever one the browser
 * handed the event to) and starts the drag for the first one whose own
 * pixel is genuinely opaque there — so a click always lands on whatever
 * you can actually SEE, even when something else's invisible padding is
 * layered on top of it.
 */
export default function FooterItem({ item, zIndex, onActivate }: FooterItemProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringOpaque, setIsHoveringOpaque] = useState(false);
  // Only the offset this item's own drag started FROM — the pointer's own
  // start position and which pointerId is active now live on the
  // module-level activeDrag (above), not here, so continuation no longer
  // depends on events landing on this particular instance.
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const alphaRef = useRef<AlphaSource | null>(null);
  // Distinguishes "still decoding" from "decode permanently failed" so
  // isOpaqueAt (below) can fail open only for the latter — see its own
  // comment for why conflating the two used to make laneige/skullpanda/
  // chips specifically un-hittable on a fresh page load.
  const alphaFailedRef = useRef(false);
  const hitLayerRef = useRef<HTMLDivElement | null>(null);
  // begin() (registered below) runs from a click that may have been aimed
  // at a DIFFERENT item's own hit layer — see handlePointerDownShared — so
  // it can't just close over `offset`/`onActivate` once at registration
  // time (that'd go stale the moment either changes). These refs keep it
  // reading the latest value at the moment it actually fires instead.
  const offsetRef = useRef(offset);
  const onActivateRef = useRef(onActivate);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    let cancelled = false;
    loadAlphaSource(item.src)
      .then((source) => {
        if (!cancelled) alphaRef.current = source;
      })
      .catch(() => {
        // Decode failed (e.g. the file 404s) — alphaRef stays null, but
        // isOpaqueAt below now knows this is a PERMANENT failure (not just
        // "hasn't finished yet") and fails open, so the item doesn't end
        // up permanently undraggable over a loading hiccup.
        if (!cancelled) alphaFailedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [item.src]);

  /** True if `clientX`/`clientY` lands on an actually-opaque pixel of this
   * item's own artwork, given the hit layer (`el`) it was measured against
   * and the CSS rotation (`rotateDeg`, i.e. this item's own `rotate`) that
   * hit layer is currently drawn under. Fails CLOSED (returns false) while
   * the alpha decode is still in flight, fails OPEN (returns true) only if
   * that decode permanently failed (e.g. a 404), and fails open if the
   * point falls outside the box entirely — the last of those only matters
   * for a drag already in progress, where the cursor can stray past the
   * hit layer's own edges while still legitimately dragging.
   *
   * The still-loading case used to fail open too (treat the whole box as
   * hittable before its own pixels were even known) — harmless for an item
   * sitting alone, but for laneige/skullpanda/chips specifically (all
   * seated under bottle's own much bigger box at their spawn position —
   * see FOOTER_ITEMS' own z-order comment) that meant on a fresh page load,
   * for the brief window before EVERY item's own decode had resolved,
   * bottle's own not-yet-known pixels ALSO counted as "opaque" by default —
   * so resolveOpaqueCandidateAt's walk stopped at bottle (topmost in the
   * stack) before ever reaching whichever of these three was actually
   * visible underneath, and neither hover nor a click ever reached them.
   * Once you'd moved something else (giving every image's decode, which
   * only takes milliseconds, plenty of time to finish), the exact same
   * point started resolving correctly — which is what made this look
   * position-dependent rather than a load-order race.
   *
   * `el.getBoundingClientRect()` gives the hit layer's on-screen
   * axis-aligned bounding box — which, for anything rotated (most items
   * here have a nonzero `rotate`, some as steep as 70deg), is NOT the same
   * rectangle as the artwork itself. The previous version treated it as if
   * it were, mapping clientX/clientY linearly across that AABB — correct
   * only at rotate 0/90/180/270; at every other angle the mapping skews
   * further off the real artwork the closer a point gets to whichever side
   * the rotation swings the AABB widest on, which is exactly what showed
   * up as "hovering the right side doesn't register" (and, before that,
   * presumably slightly-off drag pickup on the same rotated items). The
   * fix undoes the rotation properly: `getBoundingClientRect()`'s CENTER is
   * still exactly right regardless of rotation (rotating a shape around
   * its own center never moves that center), and `offsetWidth`/
   * `offsetHeight` report the hit layer's true, unrotated size (`transform`
   * is a paint-time effect only — it never touches layout), so both are
   * safe to read directly off the live element with no extra bookkeeping.
   * Everything else is just rotating the cursor's offset from that center
   * by -rotateDeg to land back in the hit layer's own unrotated space. */
  function isOpaqueAt(clientX: number, clientY: number, el: HTMLDivElement, rotateDeg: number): boolean {
    const source = alphaRef.current;
    if (!source) return alphaFailedRef.current;
    const rect = el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) return true;
    const cx = (rect.left + rect.right) / 2;
    const cy = (rect.top + rect.bottom) / 2;
    const rad = (rotateDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = clientX - cx;
    const dy = clientY - cy;
    // Inverse of CSS rotate(rotateDeg)'s own [cos -sin; sin cos] matrix.
    const localX = dx * cos + dy * sin;
    const localY = -dx * sin + dy * cos;
    const relX = 0.5 + localX / w;
    const relY = 0.5 + localY / h;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return true;
    const px = Math.min(source.width - 1, Math.max(0, Math.floor(relX * source.width)));
    const py = Math.min(source.height - 1, Math.max(0, Math.floor(relY * source.height)));
    try {
      return source.ctx.getImageData(px, py, 1, 1).data[3] >= ALPHA_HIT_THRESHOLD;
    } catch {
      return true;
    }
  }

  // Registers this item as a candidate handlePointerDownShared can resolve
  // a click to, even when the click physically landed on a different
  // item's own (higher, or just overlapping) hit layer. Runs once per
  // mount — the callbacks close over refs, not state, so they never go
  // stale without needing to re-register on every offset/onActivate
  // change.
  useEffect(() => {
    const el = hitLayerRef.current;
    if (!el) return;
    hitCandidates.set(el, {
      isOpaqueAt: (clientX, clientY) => isOpaqueAt(clientX, clientY, el, item.rotate),
      begin: (pointerId, clientX, clientY) => {
        onActivateRef.current();
        try {
          el.setPointerCapture(pointerId);
        } catch {
          // Same defensive fallback as before — a real pointer always has
          // a capturable id; this only guards synthetic/unusual input. No
          // longer load-bearing for continuation either way — see
          // activeDrag's own comment — but still worth keeping: it stops
          // other elements from picking up spurious hover/leave churn
          // while this drag is in progress.
        }
        setIsDragging(true);
        dragOriginRef.current = { x: offsetRef.current.x, y: offsetRef.current.y };
        activeDrag = { pointerId, el, startX: clientX, startY: clientY };
      },
      setHovering: setIsHoveringOpaque,
      applyDrag: (dx, dy) => {
        const origin = dragOriginRef.current;
        if (!origin) return;
        setOffset({ x: origin.x + dx, y: origin.y + dy });
      },
      endDrag: () => {
        dragOriginRef.current = null;
        setIsDragging(false);
      },
    });
    return () => {
      hitCandidates.delete(el);
      // If this item happened to be the one currently reported as hovered
      // (e.g. it unmounts mid-hover), clear the module-level pointer too —
      // otherwise handlePointerHoverShared would keep comparing future
      // resolutions against a stale, no-longer-registered element. Same
      // idea for a drag in progress — an unmount mid-drag would otherwise
      // leave activeDrag pointing at a hit layer nothing will ever
      // hitCandidates.get() successfully again (harmless — applyDrag/
      // endDrag just become no-ops via the `?.` — but clearing it lets a
      // brand new drag start cleanly instead of a phantom one lingering).
      if (currentHoverEl === el) currentHoverEl = null;
      if (activeDrag?.el === el) activeDrag = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePointerLeave() {
    // Only clear if I'm actually the currently-resolved hover target —
    // the cursor can cross straight from one item's box into another's
    // without a gap, and that other item's own pointerenter/move may well
    // have already resolved hover onto IT before this leave fires; blindly
    // clearing here would wipe out that still-valid hover.
    if (currentHoverEl === hitLayerRef.current) {
      currentHoverEl = null;
      setIsHoveringOpaque(false);
    }
  }

  return (
    <div
      className={styles.item}
      aria-hidden="true"
      style={
        {
          left: `${item.left}%`,
          top: `${item.top}%`,
          width: scaled(item.clipW),
          height: scaled(item.clipH),
          zIndex,
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${item.rotate}deg)`,
        } as CSSProperties
      }
    >
      <img
        src={item.src}
        alt=""
        loading="lazy"
        draggable={false}
        className={styles.image}
        style={
          {
            width: scaled(item.imgW),
            height: scaled(item.imgH),
            left: scaled(item.imgLeft),
            top: scaled(item.imgTop),
          } as CSSProperties
        }
      />
      {/* Same box as .image (imgW/imgH/imgLeft/imgTop) — covers the item's
       * full rectangular footprint for pointer purposes, same as before,
       * but every handler above now gates on the real pixel alpha rather
       * than trusting this whole rectangle. cursor reflects that: grab
       * only over an opaque pixel or an active drag, default everywhere
       * else in the box. onPointerDown is the literal same function on
       * every item (handlePointerDownShared, module scope) — see its own
       * comment for why. */}
      <div
        ref={hitLayerRef}
        className={`${styles.hitLayer} ${isDragging ? styles.hitLayerDragging : ""} ${
          isHoveringOpaque || isDragging ? styles.hitLayerHoverable : ""
        }`}
        style={
          {
            width: scaled(item.imgW),
            height: scaled(item.imgH),
            left: scaled(item.imgLeft),
            top: scaled(item.imgTop),
          } as CSSProperties
        }
        onPointerDown={handlePointerDownShared}
        onPointerMove={handlePointerHoverShared}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}
