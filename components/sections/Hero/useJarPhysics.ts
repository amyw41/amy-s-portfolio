"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Matter from "matter-js";
import { JAR_INTERIOR_POINTS, JAR_WALL_THICKNESS, computeJarWallRects, createJarWallBodies, type JarWallRect } from "./jar-shape";
import { computeAlphaBBox, type AlphaBBox } from "./alpha-bbox";
import { getOutlineMask } from "@/lib/outline";
import { PLACEMENT_ORDER, LAYER_ORDER, TARGET_X_FRACTION } from "./jar-layout";
import type { JarItemDef } from "./items.manifest";
import { JAR_PHYSICS_DELAY_MS } from "./motion-timing";

const { Engine, Bodies, Body, Composite, Mouse, Constraint, Events, Sleeping } = Matter;

/** The jar container's own width at the reference viewport — every size
 * derived below (item sizes, body sizes, spawn heights, rustle radius,
 * speed caps, wall thickness) multiplies by (actual container width /
 * this value). Deliberately uncapped — unlike the old `Math.min(scale, 1)`,
 * this lets the jar keep growing on screens wider than the reference
 * instead of topping out at a fixed pixel size. */
const REFERENCE_WIDTH = 480;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Debounce for the resize rebuild, in ms. Rebuilding walls + every body is
 * real work — coalescing a burst of ResizeObserver callbacks (e.g. a drag-
 * resized window) into one rebuild avoids doing it dozens of times a
 * second. */
const RESIZE_DEBOUNCE_MS = 150;

/** Fixed physics timestep, in ms — always exactly 1000/60 per
 * Engine.update call, however many (or few) of them a given real frame
 * needs to catch up. A variable delta would make the sim non-deterministic:
 * the same load could settle into a different pile depending on frame
 * timing jitter alone. */
const STEP_MS = 1000 / 60;
/** Caps how many fixed steps a single real frame can run to catch up.
 * Was 5 (~83ms) — this turned out to be the actual cause of the settled
 * pile coming out slightly different every load: the very first few
 * frames are also when item images are decoding and alpha-bbox masks are
 * being computed, real work that can easily make a frame take well past
 * 83ms. Any elapsed time beyond the cap was just silently dropped rather
 * than simulated, so a load with a bit more incidental jank ran fewer
 * total physics steps than a smoother one — same wall-clock fall
 * duration, less actual simulated time, different resting spot. (The
 * backgrounded-tab case this was originally written to guard against
 * doesn't actually hit this cap at all — see updateRunning below, which
 * resets the accumulator to 0 on resume instead of ever asking for a
 * multi-second catch-up.) Raised generously so ordinary load jank always
 * gets fully simulated rather than truncated; only a genuinely pathological
 * multi-second main-thread stall would still hit this and visibly skip
 * ahead, which is an acceptable trade for a consistent pile every time. */
const MAX_STEPS_PER_FRAME = 600;

const RUSTLE_RADIUS = 80;
const RUSTLE_FORCE = 0.0009;
/** The pointer-velocity term: a fast mouse swipe imparts a little of its
 * own motion into nearby items, on top of the plain proximity push above —
 * makes a quick swipe read as a swat rather than every rustle feeling the
 * same regardless of how fast the cursor is moving. */
const RUSTLE_FOLLOW = 0.00004;
/** Caps a single tick's cursor delta so a sudden pointer teleport (cursor
 * re-entering the stage far from where it left) can't be read as an
 * enormous instantaneous swipe. */
const MAX_POINTER_SPEED = 25;

/** Safety net, in px/step (scaled by the container's own scale factor): caps
 * how fast any item can move. A body momentarily pinched between two wall
 * segments (e.g. at a concave joint) can otherwise pick up an enormous
 * solver-correction velocity in a single step and rocket out of the jar —
 * this keeps things "thudding" even if that happens, instead of launching
 * off-screen. Scaled down alongside gravity below (was 40 at gravity 3.0)
 * so this cap still isn't what's actually limiting ordinary fall speed. */
const MAX_BODY_SPEED = 24;

/** Caps angular velocity, in rad/step — not scaled by container size
 * (rotation rate is unitless, unlike a px/step speed). Without this a
 * lightweight, off-centre-impacted body can pick up enough spin from a
 * collision to pinwheel indefinitely; frictionAir bleeds off spin over
 * time but doesn't stop a single frame's solver impulse from being huge. */
const MAX_ANGULAR = 0.35;

/** How hard a still-pinned body is nudged back toward its lane each tick —
 * see the pin block in stepPhysics for why this replaced a hard teleport.
 * GAIN is the proportional term (fraction of the remaining x distance
 * converted to velocity per tick). SPEED is in px/step at REFERENCE_WIDTH
 * (scaled by the container's own `scale` at the call site, like every
 * other px constant here) and caps the result so a body that's drifted far
 * from its lane doesn't get flung back at an unrealistic speed in one
 * tick. At 60 ticks/s, GAIN 0.3 clears a typical few-tens-of-px drift in
 * well under a second while still losing a tug-of-war with the collision
 * solver instead of overpowering it every frame.
 *
 * SMOOTHING addresses a different failure mode than GAIN/SPEED do: two
 * *neighbouring* pinned lanes close enough together that both items'
 * actual footprints overlap while both are still falling (e.g. laneige/
 * skullpanda at one point). GAIN alone is a pure proportional response —
 * every tick it recomputes a fresh correction velocity from position error
 * only, with no memory of anything — so a neighbour shoving the body away
 * gets met with the exact same full-strength snap back next tick, over and
 * over, reading as a visible side-to-side shake.
 *
 * First tried subtracting a fraction of the body's own post-solver
 * velocity from the correction, on the idea that "the solver just pushed
 * back, so soften the response" — that turned out to be the wrong lever:
 * since this is a per-tick setVelocity, not a force integrated over
 * existing momentum, feeding the *adversarial* solver's own output back
 * into the next command can flip its sign tick to tick and made the shake
 * worse, not better. SMOOTHING instead low-pass-filters our own outgoing
 * command against what *we* commanded last tick (see pinVxById above) —
 * blending a fraction of the fresh target in each tick rather than jumping
 * straight to it. That has no feedback path through the solver at all, so
 * it can only ever shrink the commanded velocity's tick-to-tick swing,
 * never amplify it — a contested lane settles into a much smaller, slower
 * back-and-forth instead of a full-amplitude fight. */
const PIN_CORRECT_GAIN = 0.3;
const PIN_CORRECT_SPEED = 10;
const PIN_CORRECT_SMOOTHING = 0.18;

/** Matter's own enableSleeping (on below) puts a body to sleep once its
 * rolling "motion" (~ speed² + angularSpeed²) has stayed under
 * Sleeping._motionSleepThreshold for ~60 ticks in a row. A screen recording
 * of the real (non-instant) load showed several bodies in the most crowded
 * lane cluster (skullpanda/kitty-mirror/cybersea/cam) still visibly
 * creeping a full 6+ seconds after the fall looked finished — every
 * consecutive-frame pixel diff kept finding real movement, not just
 * compression noise. That's this: two chamfered rectangles resting
 * against each other rarely reach a perfectly static contact — the solver
 * keeps making tiny sub-pixel corrections every tick to resolve a hair of
 * residual overlap, and each of those corrections is enough real motion to
 * reset Matter's default threshold (0.08) before the 60-tick counter ever
 * completes. The body never sleeps, so the live rAF loop (see
 * startLiveLoop below) keeps genuinely re-simulating it forever — which is
 * why this could look perfectly still in a quick check (a fast, idle
 * machine's real-time timing happened to damp out sooner) but keep
 * visibly creeping on a real device. Raised well above Matter's default so
 * that kind of small persistent settle-jitter actually counts as "still"
 * and the body is allowed to fall asleep — a genuinely moving body (an
 * actual fall, a drag, a rustle push) has motion far above even this
 * raised threshold, so this doesn't dull real movement, only the
 * never-quite-zero residual contact noise. Was 0.4 — measurably helped
 * (a follow-up recording's frame-diff actually converged to ~0 by the end,
 * where the previous one never did) but the tail before it finally
 * crossed under 0.4 for a full 60-tick stretch was still long enough to
 * read as ongoing shaking, not settling. Raised further on that evidence.
 *
 * Both 0.4 and 1 were still too timid — a third recording showed the same
 * shape again: converges toward 0 but with a visible ~0.8s tail of real,
 * decreasing-but-still-there motion after the pile already looks done.
 * Went back to the actual units instead of nudging by feel: Matter's
 * `motion` is speed² + angularSpeed², and a body legitimately falling or
 * tumbling (MAX_BODY_SPEED = 24 px/step) has speed alone contributing up
 * to 24² = 576 — even a modest real tumble is comfortably in the tens.
 * Settle-jitter, by contrast, is sub-pixel-per-tick — under ~1–2 in this
 * same unit. There's a wide gap between "resting, still nudging a hair"
 * and "actually moving" that 0.4/1 weren't anywhere near exploiting. Jumped
 * to 4: still a small fraction of what real motion looks like, so an
 * actual fall/tumble/drag/rustle is nowhere close to being mistaken for
 * settle-noise, but comfortably past whatever the lingering contact jitter
 * has been topping out at. Also turned out a chunk of the visible "jump"
 * this was chasing was actually a mislabeled item's free rotation (see
 * bear-hirono's lockRotation, items.manifest.ts) — not this threshold at
 * all. With that fixed too, nudged once more (4 -> 8) for the small
 * remaining tail, still nowhere near real fall/tumble motion (tens to
 * hundreds). Still not quite there: a later recording (frame-diffed at
 * 25fps over the fall/settle window) found the pixel-diff between
 * consecutive frames never actually reached 0 before the clip ended —
 * 1889, then 582, then 340 changed px in the last three frame-pairs,
 * against a ~325,000px crop, i.e. a real but tiny (~0.1%) residual right
 * up to the last frame. A diff mask isolating exactly what moved in that
 * final window showed two regions: the skullpanda/kitty-mirror cluster and
 * bear-hirono — both already lockRotation (items.manifest.ts), so this
 * isn't rotational; it's the same kind of sub-pixel contact correction
 * this threshold already targets, just still narrowly surviving under 8.
 * Nudged once more (8 -> 16): still under 3% of a real tumble's minimum
 * (576), so nowhere near dulling an actual fall. */
const SETTLE_MOTION_THRESHOLD = 16;

/** An item's alpha-bbox longest edge renders at BASE_SIZE * item.sizeScale,
 * at the REFERENCE_WIDTH container width — sizing is driven entirely by the
 * alpha bbox (see alpha-bbox.ts), never by the source file's pixel
 * dimensions. Was 236, then 165 (settled pile still overflowed the jar's
 * drawn walls — measured live at ~102% of the container width vs. the
 * walls' own ~90%, and ~51% of its height), then 100 (measured ~85% width /
 * ~27% height at settle — comfortably inside the walls, but read a little
 * too small), then 130, then 145 (after the items.manifest.ts sizeScale
 * rework, which read a little small again) — still didn't fill the jar,
 * so nudged up again to 160. This is independent of (and stacks with) the
 * jar-plus-items 0.8x entity scale in Hero.module.css's .jarWrapper: that
 * one shrinks the whole container (jar art + every item together), this
 * one additionally shrinks items relative to the jar art itself. */
const BASE_SIZE = 160;

/** Collision hitbox as a fraction of the (alpha-bbox-derived) rendered
 * size — lower means items can overlap much more heavily (sit ~a quarter
 * behind whatever's in front of them, per the original design) before
 * their (much smaller) rigid bodies actually touch. One global constant,
 * not per-item: the per-item character lives entirely in density / friction
 * / restitution / frictionAir instead.
 *
 * Was 0.38 — with the current 13-item roster that let items sink deep
 * enough into the pile that whatever landed in front of them could hide
 * most of their silhouette, not just "a quarter". Raised to 0.55, which
 * fixed the burial complaint but — combined with several items being sized
 * up afterward (bottle 1.3x, skullpanda/chips ~1.3x, bear-hirono/rabbit
 * 1.5x) — made collision hitboxes big enough that a landing item visibly
 * shoves its already-settled neighbours, reading as constant bouncing.
 * Pulled back to 0.48, then nudged up a small step to 0.54 — still reading
 * as slightly too much overlap/burial at 0.48. If the pile now reads as
 * too loose/spread out or starts bouncing again, bring this back down; if
 * things are still overlapping too much, push it up further (toward ~0.7
 * before it starts looking like items barely touch at all) — but the
 * oversized items (bottle/skullpanda/chips/bear-hirono/rabbit) are the
 * more likely lever if burial complaints come back hard, not this
 * constant alone. */
const BODY_SCALE = 0.54;

/** Report (once, per item) when a PNG carries more than 15% untrimmed
 * transparent padding, so it can be cleaned up at the source file. */
const PADDING_WARNING_THRESHOLD = 0.15;

/** Fallback only, used if --outline-thickness (lib/tokens.css) can't be read
 * for some reason (e.g. getComputedStyle returning an empty string) — the
 * real value always comes from that CSS custom property (see
 * getOutlineThicknessPx below), which is the single source of truth shared
 * with the 'box' items' own box-shadow border. Kept numerically equal to
 * tokens.css's own default so the fallback is never visibly different. */
const FALLBACK_OUTLINE_THICKNESS_PX = 4;

/** Ring sample count passed to getOutlineMask (lib/outline.ts) — raised from
 * the alpha-bbox-era flat-radius design's 16. Per-item dilation radius (see
 * getOutlineThicknessPx / computeDilationRadius below) can now be noticeably
 * larger for a heavily-scaled-down item than
 * the old flat 3px source-space radius ever was, and a larger radius needs
 * denser sampling to avoid gaps at thin protrusions (ballet's straps,
 * kitty-mirror's handle/stand) — 16 samples at a bigger radius left visible
 * facets/gaps that 16 at the old small radius never showed. */
const OUTLINE_SAMPLES = 24;

/** Reads --outline-thickness (lib/tokens.css) off :root, in px — the single
 * source of truth for both border techniques (see JarItem.tsx): 'box' items
 * read it live via CSS; this is how 'blob' items read the same number to
 * size the dilation radius baked into each item's generated ring. Falls
 * back to FALLBACK_OUTLINE_THICKNESS_PX if the property is somehow missing
 * or unparsable, rather than throwing. */
function getOutlineThicknessPx(): number {
  if (typeof window === "undefined") return FALLBACK_OUTLINE_THICKNESS_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--outline-thickness").trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_OUTLINE_THICKNESS_PX;
}

/** Base gap, in px at REFERENCE_WIDTH (scales with the container like
 * everything else), between the bottom of one item's spawn position and
 * the top of the next one's, in fall order — see the spawnYById cursor
 * below. Ported directly from the old Jar.js reference's own spawnCursor
 * logic: guaranteed vertical gaps at spawn (sized to each item's own
 * actual height, not a flat fraction of the container) instead of letting
 * Matter's overlap-resolution untangle already-interpenetrating bodies on
 * frame 1 — that reference found deep initial overlaps could launch bodies
 * clean through the walls on the very first few steps. */
const SPAWN_GAP = 30;
/** How far above the very top of the frame the *first* item's spawn cursor
 * starts, same units as SPAWN_GAP. Was 40 — far too small relative to the
 * stage's own reference height (~680px): the first item spawned barely
 * above the jar drawing itself, well inside the already-visible column, so
 * nothing was ever actually hidden by .columns's overflow:clip (Hero.module
 * .css) — items just popped into an already-visible spot and fell a short
 * distance, instead of genuinely falling in from off-screen. Raised to be
 * comparable to the stage's own height so the first item's spawn point sits
 * at or above .columns's clip boundary on typical viewports, making the
 * clip line do its actual job (item is truly hidden, then reveals as it
 * crosses the boundary) rather than being irrelevant. */
const SPAWN_LEAD = 480;

interface RenderInfo {
  /** The div's size — i.e. the alpha bbox at display scale. This IS the
   * item's visible/collision footprint; the body is centred on it. */
  divW: number;
  divH: number;
  /** The full (padded) source image's size at the same display scale. */
  imgW: number;
  imgH: number;
  /** Where to position that full image inside the div so the alpha bbox
   * — not the file's own centre — lines up with the div's bounds. */
  imgLeft: number;
  imgTop: number;
  /** Geometry for the 'blob' border ring (see JarItem.tsx / lib/outline.ts),
   * in the same div-relative coordinate space as imgLeft/imgTop — the ring
   * raster covers the alpha bbox plus that item's own dilation radius (see
   * computeDilationRadius's own comment) of padding on every side, at
   * display scale. Unused (left at 0) for 'box' items, which use
   * the box-shadow border technique instead and need no ring geometry. */
  ringLeft: number;
  ringTop: number;
  ringWidth: number;
  ringHeight: number;
}

interface PhysicsItem {
  id: string;
  body: Matter.Body;
  halfWidth: number;
  halfHeight: number;
}

/** dilationRadius: the native-source-pixel dilation radius used to generate
 * a 'blob' item's outlineMask (null for 'box' items, which border via
 * box-shadow instead and never need a ring). This is cheap pure arithmetic
 * (computeDilationRadius below) computed synchronously for every item right
 * after its bbox resolves — computeRenderInfo reuses this EXACT value (not
 * a recomputation) to size the ring's on-screen geometry, so the raster and
 * its displayed geometry can never drift out of sync with each other (see
 * RenderInfo's own comment on ringLeft/Top/Width/Height). outlineMask
 * itself — the actual ring raster — is real canvas work and generated
 * separately, deferred until after the fall has already started (see the
 * preloadBBox split's own comments below). */

/**
 * itemDisplayScale is this item's rendered on-screen longest edge ÷ its own
 * alpha-bbox longest edge, in native file pixels — computed at REFERENCE_WIDTH
 * (i.e. container scale s=1), from the SAME bbox computeRenderInfo itself
 * derives pixelScale from (never the file's raw naturalWidth/Height — a
 * file with untrimmed transparent padding has a bbox much smaller than its
 * file size, and sizing off the file here would reproduce the exact bug the
 * original alpha-bbox sizing normalisation already had to solve once).
 * dilationRadius (native px) = outlineThicknessPx ÷ itemDisplayScale, so
 * that at ANY container scale s, ringPad = dilationRadius × pixelScale(s)
 * collapses to exactly outlineThicknessPx × s — the same on-screen
 * thickness for every item, independent of how small its own bbox is
 * relative to BASE_SIZE.
 */
function computeDilationRadius(item: JarItemDef, bbox: AlphaBBox, outlineThicknessPx: number): number {
  const bboxLongest = Math.max(bbox.bboxW, bbox.bboxH);
  if (bboxLongest <= 0) return outlineThicknessPx; // degenerate (fully transparent) file — arbitrary but harmless
  const itemDisplayScale = (BASE_SIZE * item.sizeScale) / bboxLongest;
  return outlineThicknessPx / itemDisplayScale;
}

interface BBoxPreloadResult {
  bbox: AlphaBBox;
  /** Kept around (not just the bbox) so the deferred outline-mask pass
   * below can reuse this exact already-decoded element instead of loading
   * the same src a second time. */
  img: HTMLImageElement;
}

/** Fast half of what used to be one combined preloadImage: decode + alpha
 * bbox only — no canvas dilation, no PNG encoding. This is the ONLY preload
 * work the fall itself actually needs (bbox drives every item's sizing and
 * physics geometry) — see the split's own reasoning at this function's call
 * site below. */
function preloadBBox(item: JarItemDef): Promise<BBoxPreloadResult> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        resolve({ bbox: computeAlphaBBox(img, item.cropRegion), img });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load ${item.src}`));
    img.src = item.src;
  });
}

/** Deep safety-valve fallback only — NOT the normal release path anymore
 * (see landedIds/collisionStart in the hook below, which is what actually
 * lets go of a column pin now: the moment an item's body touches the jar
 * floor or an already-landed item). This fraction-of-height line exists
 * purely so a body can never get physically stuck pinned forever if a
 * collision is somehow missed (two static bodies briefly overlapping
 * without generating a Matter collision event is rare, but not provably
 * impossible) — set close to the floor, so in the normal case landedIds
 * always fires first and this never engages.
 *
 * Used to be the *only* release condition, at 0.36 (just past the neck's
 * shoulder, jar-shape.ts's y:0.38) — releasing there reliably got items
 * clear of the narrow neck, but still handed them to free physics while
 * they could easily be well above the actual pile in a mostly-empty jar.
 * Whatever they grazed on the remaining unpinned drop could still nudge
 * them sideways before they ever touched down, which is what kept reading
 * as "items rolling toward center" for the first few arrivals. */
const PIN_RELEASE_Y_FRACTION = 0.92;

export function useJarPhysics(containerRef: RefObject<HTMLDivElement | null>, items: JarItemDef[]) {
  const [ready, setReady] = useState(false);
  const [renderInfo, setRenderInfo] = useState<Record<string, RenderInfo>>({});
  // Set once after the initial preload pass and never touched again (not
  // even by rebuildForResize) — a ring's raster is resolution-independent
  // of the container's own scale; only its display geometry (ringLeft/Top/
  // Width/Height, inside renderInfo) needs recomputing on resize.
  const [outlineMasks, setOutlineMasks] = useState<Record<string, string | null>>({});
  const [debugWalls, setDebugWalls] = useState<JarWallRect[]>([]);
  const [debugPhysicsEnabled, setDebugPhysicsEnabled] = useState(false);

  const itemElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const refCallbacksRef = useRef<Map<string, (el: HTMLDivElement | null) => void>>(new Map());
  const zIndexRef = useRef<Map<string, number>>(new Map());
  const maxZRef = useRef(0);

  useEffect(() => {
    // Reading location.search must happen post-mount (SSR has no URL to
    // read), so this genuinely can't be derived during render.
    const debug = new URLSearchParams(window.location.search).get("debug");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDebugPhysicsEnabled(debug === "physics");
  }, []);

  // Stable per-id ref callbacks so JarStage can pass `ref={registerItemEl(id)}`
  // without recreating a new function (and re-triggering the ref) every render.
  const registerItemEl = useMemo(() => {
    return (id: string) => {
      let cb = refCallbacksRef.current.get(id);
      if (!cb) {
        cb = (el) => {
          if (el) {
            itemElsRef.current.set(id, el);
            // The div doesn't exist yet when LAYER_ORDER's z-index stack is
            // first computed in setup() (that runs before `ready` flips true
            // and JarItem divs mount) — apply it here, the moment each div
            // actually attaches, instead of relying on a stale itemElsRef
            // lookup that always missed.
            const z = zIndexRef.current.get(id);
            if (z !== undefined) el.style.zIndex = String(z);
          } else {
            itemElsRef.current.delete(id);
          }
        };
        refCallbacksRef.current.set(id, cb);
      }
      return cb;
    };
  }, []);

  const bringToFront = useMemo(() => {
    return (id: string) => {
      maxZRef.current += 1;
      zIndexRef.current.set(id, maxZRef.current);
      const el = itemElsRef.current.get(id);
      if (el) el.style.zIndex = String(maxZRef.current);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    async function setup() {
      if (!container) return;

      // Reference point for the entrance delay below — captured here, at
      // the very start of the effect, since this is as close as JS gets to
      // "the same moment the hero's shared CSS load-in (Hero.module.css's
      // heroLoadIn) begins": both are driven by the same initial mount/
      // commit.
      const setupStartTime = performance.now();

      // Preload every sprite before starting the sim, and compute each
      // one's alpha bounding box — sizing and physics geometry come from
      // that bbox, not the file's own pixel dimensions (see alpha-bbox.ts).
      // This bbox decode is the ONLY preload work the fall itself actually
      // needs to wait on. Border-ring generation (getOutlineMask, real
      // canvas work — 24 drawImage calls plus 2 more full-canvas composites
      // plus a toDataURL PNG encode, PER 'blob' item) used to run in this
      // same blocking pass too, and measured out as the actual ~2s+ of the
      // "why does it take so long to start falling" complaint (see the
      // [jar-timing] console line below) — nothing about it is needed
      // before a single body can spawn or the fall can start, only before a
      // ring can be *drawn*, so it's deferred below instead (see that
      // block's own comment) and no longer blocks this await at all.
      const outlineThicknessPx = getOutlineThicknessPx();
      const preloadEntries = await Promise.all(items.map(async (item) => [item.id, await preloadBBox(item)] as const));
      if (cancelled) return;
      const bboxes = Object.fromEntries(
        preloadEntries.map(([id, r]) => [id, r.bbox]),
      ) as Record<string, AlphaBBox>;
      const imgsById = new Map(preloadEntries.map(([id, r]) => [id, r.img]));
      // Cheap pure arithmetic (see computeDilationRadius), not canvas work —
      // computed synchronously right away so ring GEOMETRY (ringLeft/Top/
      // Width/Height in computeRenderInfo below) is correct from the very
      // first render, even though the ring RASTER itself (outlineMask,
      // below) arrives later.
      const dilationRadii = Object.fromEntries(
        items.map((item) => [
          item.id,
          item.shape === "blob" ? computeDilationRadius(item, bboxes[item.id], outlineThicknessPx) : null,
        ]),
      ) as Record<string, number | null>;

      for (const item of items) {
        const b = bboxes[item.id];
        const fileArea = b.naturalWidth * b.naturalHeight;
        const bboxArea = b.bboxW * b.bboxH;
        if (fileArea > 0 && bboxArea < fileArea * (1 - PADDING_WARNING_THRESHOLD)) {
          const pct = Math.round((1 - bboxArea / fileArea) * 100);
          console.warn(
            `[jar] ${item.id}.png has ~${pct}% untrimmed transparent padding ` +
              `(alpha bbox ${b.bboxW}×${b.bboxH} vs file ${b.naturalWidth}×${b.naturalHeight}) — consider trimming at source.`,
          );
        }
      }

      const reducedMotion = window.matchMedia(REDUCED_MOTION).matches;

      // See SETTLE_MOTION_THRESHOLD's own comment above — raises how much
      // residual motion Matter will tolerate before actually letting a body
      // sleep, so persistent tiny settle-jitter between resting neighbours
      // stops resetting the sleep counter forever. This is a mutable field
      // on the Sleeping module itself (not per-engine), so it only needs
      // setting once — safe to reassign on every mount.
      // Cast: _motionSleepThreshold is an internal Matter field (undocumented
      // in @types/matter-js), reassigned intentionally — not a typo/mistake.
      (Sleeping as unknown as { _motionSleepThreshold: number })._motionSleepThreshold = SETTLE_MOTION_THRESHOLD;

      const engine = Engine.create({
        enableSleeping: true,
        // Matches the old Jar.js reference's own gravity exactly (2.6) —
        // this had drifted to 1.5 at some point this session, which reads
        // noticeably floatier/slower than the reference's snappier drop.
        gravity: { x: 0, y: 2.6 },
        // Higher gravity + a higher speed cap means a body can cross more
        // distance in a single step — more solver iterations keep contacts
        // (the floor, the walls) properly resolved instead of tunnelling
        // through at the new speed. Matter's defaults are 6/4.
        positionIterations: 10,
        velocityIterations: 8,
      });
      const world = engine.world;

      // z-index comes entirely from LAYER_ORDER (back to front) — fully
      // independent of physics and of PLACEMENT_ORDER.
      LAYER_ORDER.forEach((id, i) => zIndexRef.current.set(id, i + 1));
      maxZRef.current = LAYER_ORDER.length;

      const itemsById = new Map(items.map((item) => [item.id, item]));
      const orderedIds = PLACEMENT_ORDER.filter((id) => itemsById.has(id));

      // --- mutable, resize-surviving state -----------------------------
      let width = 0;
      let height = 0;
      let scale = 1;
      /** How far the stage's own top sits below the actual viewport top,
       * in real px (container.getBoundingClientRect().top at spawn time).
       * SPAWN_LEAD alone is measured in the stage's own local coordinate
       * space, which floats depending on how .columns's vertical centring
       * (Hero.module.css) happens to size that gap on a given viewport —
       * on a tall screen there's easily more headroom above the stage than
       * SPAWN_LEAD accounts for, so the "spawn point" sits well inside the
       * already-visible area instead of truly off past the top of the
       * page. Folding this measured offset into computeSpawnYById (below)
       * makes the spawn point track the real viewport top instead, so
       * items always start genuinely above the browser window itself. */
      let containerTop = 0;
      let wallBodies: Matter.Body[] = [];
      let pinReleaseYPx = 0;

      const physicsItems: PhysicsItem[] = [];
      const bodyIdToItemId = new Map<number, string>();
      // True once an item's centre has crossed below the mouth line —
      // a one-way latch (see stepPhysics): once true, never re-pinned,
      // even if it later bounces back above that y for a moment.
      const hasEnteredJar = new Map<string, boolean>(items.map((item) => [item.id, false]));
      // Set the instant a still-pinned item's body actually touches the
      // jar's floor or an already-landed item — see the collisionStart
      // listener below. This, not a height threshold, is what stepPhysics
      // now checks before letting go of a column pin. Ported from the old
      // Jar.js reference's own `landed` flag (there tracked by array index
      // off a single floor body; here by id off the jar-floor segments —
      // see jar-shape.ts's FLOOR_SEGMENT_INDICES).
      //
      // The previous approach released the pin once a body's centre simply
      // crossed a fixed y line (PIN_RELEASE_Y_FRACTION) partway down the
      // jar — which reliably got items clear of the neck, but still handed
      // them to free physics while they could easily be well above the
      // actual pile in a mostly-empty jar. Whatever they grazed on that
      // remaining unpinned drop — the curved lower wall, another item
      // mid-fall — could still nudge them sideways before they ever
      // touched down, which is what kept reading as "items rolling toward
      // center" for the first few arrivals even after the neck-taper fix.
      // Collision-gating removes that gap entirely: a pinned item now
      // free-falls straight down its lane for the *entire* drop and only
      // ever leaves pure column control at the exact moment it has
      // something solid under it.
      const landedIds = new Set<string>();
      // Previous tick's *commanded* pin-correction x-velocity, per item —
      // see PIN_CORRECT_SMOOTHING's own comment (the constant above) for
      // why this replaced subtracting the body's own post-solver velocity.
      const pinVxById = new Map<string, number>();
      const fallIndexById = new Map<string, number>(orderedIds.map((id, i) => [id, i]));

      // Marks landedIds the instant a still-pinned body's very first real
      // contact is with the floor or something already landed — mirrors the
      // old Jar.js reference's collisionStart-driven `landed` flag exactly.
      // Reads bodyIdToItemId/hasEnteredJar, so this only needs registering
      // once, after both exist; it doesn't need wallBodies/physicsItems to
      // be populated yet since it only ever fires once real collisions
      // happen, well after setup. The hasEnteredJar checks below are the
      // guard: only a still-falling item can BE marked landed, and only
      // floor/an already-landed item can DO the marking.
      function handleLandingPair(body: Matter.Body, other: Matter.Body) {
        const id = bodyIdToItemId.get(body.id);
        if (!id || hasEnteredJar.get(id)) return;
        const otherIsFloor = other.label === "jar-floor";
        const otherId = bodyIdToItemId.get(other.id);
        const otherIsLandedItem = otherId !== undefined && hasEnteredJar.get(otherId) === true;
        if (otherIsFloor || otherIsLandedItem) landedIds.add(id);
      }
      const handleCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
        for (const pair of event.pairs) {
          handleLandingPair(pair.bodyA, pair.bodyB);
          handleLandingPair(pair.bodyB, pair.bodyA);
        }
      };
      Events.on(engine, "collisionStart", handleCollisionStart);
      cleanupFns.push(() => Events.off(engine, "collisionStart", handleCollisionStart));

      function buildWalls(w: number, h: number, s: number) {
        wallBodies = createJarWallBodies(JAR_INTERIOR_POINTS, w, h, JAR_WALL_THICKNESS * s);
        Composite.add(world, wallBodies);
        setDebugWalls(computeJarWallRects(JAR_INTERIOR_POINTS, w, h, JAR_WALL_THICKNESS * s));
        pinReleaseYPx = PIN_RELEASE_Y_FRACTION * h;
      }

      function computeRenderInfo(s: number): Record<string, RenderInfo> {
        const info: Record<string, RenderInfo> = {};
        for (const item of items) {
          const bbox = bboxes[item.id];
          const longestNatural = Math.max(bbox.bboxW, bbox.bboxH);
          const targetLongest = BASE_SIZE * item.sizeScale * s;
          const pixelScale = longestNatural > 0 ? targetLongest / longestNatural : 1;
          const imgLeft = -bbox.bboxX * pixelScale;
          const imgTop = -bbox.bboxY * pixelScale;
          // Reuses this exact item's own dilationRadius (computed once at
          // preload from this same bbox — see computeDilationRadius) rather
          // than a flat constant, and multiplies by this item's own
          // pixelScale (also derived from this same bbox) — same bbox, same
          // scale source as both the image and the mask raster itself, so
          // geometry can't drift out of sync with what was actually baked
          // into the ring (see computeDilationRadius's own comment).
          const ringPad = (dilationRadii[item.id] ?? 0) * pixelScale;
          info[item.id] = {
            divW: bbox.bboxW * pixelScale,
            divH: bbox.bboxH * pixelScale,
            imgW: bbox.naturalWidth * pixelScale,
            imgH: bbox.naturalHeight * pixelScale,
            imgLeft,
            imgTop,
            // Encloses the full (padded) image plus this item's own ring
            // padding on every side — matching what generateOutlineMask
            // actually baked into the ring raster (lib/outline.ts) — in the
            // same div-relative coordinate frame as imgLeft/imgTop.
            ringLeft: imgLeft - ringPad,
            ringTop: imgTop - ringPad,
            ringWidth: bbox.naturalWidth * pixelScale + ringPad * 2,
            ringHeight: bbox.naturalHeight * pixelScale + ringPad * 2,
          };
        }
        return info;
      }

      // Populated for real once the container's first measured (right after
      // buildWalls, below) — a placeholder computeRenderInfo(1) call used to
      // sit here instead, but nothing ever reads it before that real call
      // overwrites it: spawnBody (the only reader) doesn't run until after
      // the container's measured too. That was a full bbox-math pass over
      // every item, thrown away unread every single mount.
      let currentRenderInfo: Record<string, RenderInfo> = {};

      function createBodyForItem(item: JarItemDef, info: RenderInfo, x: number, y: number, angle: number) {
        // A rectangle matching the alpha bbox's own aspect ratio, lightly
        // chamfered — not a circle, and not a heavily-chamfered near-circle
        // square either. A long/thin bbox (a ballet shoe) then genuinely
        // behaves like a bar that can topple; a roughly-square bbox (a
        // round tin) behaves close to something that can roll. The
        // distinction comes entirely from each item's own bbox shape, not
        // from a per-item circle-vs-box flag.
        const bodyW = info.divW * BODY_SCALE;
        const bodyH = info.divH * BODY_SCALE;
        const options: Matter.IChamferableBodyDefinition = {
          density: item.density,
          friction: item.friction,
          restitution: item.restitution,
          frictionAir: item.frictionAir,
          angle,
          label: item.id,
          // Matches the old Jar.js reference's own chamfer proportion
          // (radius = 0.4 × its hitbox size) — was 0.12 here, which reads
          // much more sharp-edged/rectangular. The rounder hitbox lets
          // things roll and settle more smoothly, closer to how the
          // reference's pile actually moved.
          chamfer: { radius: Math.min(bodyW, bodyH) * 0.4 },
        };
        const body = Bodies.rectangle(x, y, bodyW, bodyH, options);
        // Heavily scaled-up (not infinite) inertia: collisions can still
        // torque the body, just a lot less easily, so it can settle at a
        // small natural tilt from however it landed instead of holding
        // exactly the upright angle it spawned at. Ported from the old
        // Jar.js reference (see items.manifest.ts's lockRotation comment):
        // items rigid enough that tumbling would look wrong (a bottle, a
        // tube, a flat card) get this; soft/loose ones (a chip bag, ballet
        // shoes, a patch) rotate normally on the way down and after
        // landing. Infinite inertia was tried first and made these read as
        // perfectly, unnaturally level — this keeps the "doesn't tumble"
        // character without looking rigid.
        if (item.lockRotation) Body.setInertia(body, body.inertia * 40);
        return body;
      }

      // instant === reduced motion: the whole sim is fast-forwarded
      // synchronously (see below) before anything is ever painted, so it
      // reads as "already settled", not as a skipped animation. Every body
      // is dynamic and actually falling from the moment it's spawned
      // either way — there's no separate release step to skip.
      const instant = reducedMotion;

      // Guaranteed vertical gaps at spawn, in fall order — see SPAWN_GAP's
      // own doc comment. Populated just before the spawn loop below (needs
      // currentRenderInfo/scale, both only real after the container's
      // measured — see computeSpawnYById's call site), keyed by id since
      // spawnBody is called in `items` (manifest) order, not fall order.
      const spawnYById = new Map<string, number>();
      /** How far above the actual top of the browser window (not the
       * stage) the very first item's spawn point sits, real px, regardless
       * of viewport height or how .columns's vertical centring happens to
       * place the stage. Guarantees a genuinely off-page start — see
       * containerTop's own comment above. */
      const OFF_VIEWPORT_LEAD = 80;
      function computeSpawnYById() {
        spawnYById.clear();
        // Whichever is larger: SPAWN_LEAD's own scaled distance above the
        // stage, or enough to clear containerTop (how far the stage sits
        // below the viewport's top edge) plus OFF_VIEWPORT_LEAD. On a short
        // viewport where the stage sits right under the nav, SPAWN_LEAD
        // alone is probably already past the viewport top and wins; on a
        // tall one where .columns centres the stage well down the page,
        // containerTop dominates instead.
        let cursor = Math.max(SPAWN_LEAD * scale, containerTop + OFF_VIEWPORT_LEAD);
        for (const id of orderedIds) {
          const info = currentRenderInfo[id];
          const size = Math.max(info?.divW ?? 0, info?.divH ?? 0) * BODY_SCALE;
          spawnYById.set(id, -(cursor + size / 2));
          cursor += size + SPAWN_GAP * scale;
        }
      }

      function spawnBody(item: JarItemDef) {
        const info = currentRenderInfo[item.id];
        const targetX = (TARGET_X_FRACTION[item.id] ?? 0.5) * width;
        const spawnY = spawnYById.get(item.id) ?? -height;
        // item.rotate (degrees) is the angle it falls in at — see its own
        // doc comment in items.manifest.ts. 0/undefined keeps the old
        // upright spawn.
        const spawnAngle = ((item.rotate ?? 0) * Math.PI) / 180;
        const body = createBodyForItem(item, info, targetX, spawnY, spawnAngle);
        bodyIdToItemId.set(body.id, item.id);
        physicsItems.push({ id: item.id, body, halfWidth: info.divW / 2, halfHeight: info.divH / 2 });
        Composite.add(world, body);
      }

      // Mouse / touch drag. Matter.Mouse (not the higher-level
      // MouseConstraint) hit-tests physics bodies directly (not DOM
      // elements), so item divs stay pointer-events:none and this one
      // listener set on the stage container is all drag needs. Because item
      // divs are pointer-events:none, a mousedown inside the jar's
      // silhouette actually lands on the plain <img> underneath (jar.png,
      // or an item's own <img> once painted) — both already have
      // draggable={false} (see JarStage.tsx / JarItem.tsx), but that alone
      // doesn't reliably stop every browser from still starting a native
      // image drag-ghost on a fast/diagonal drag gesture. When that native
      // drag wins the race against Matter.Mouse's own listener, the OS
      // takes over the gesture: the item visibly "drags the image" instead
      // of the physics body (bug 1), and because the browser is now
      // driving a native drag-and-drop instead of firing ordinary
      // mouse/touch events, the mouseup that would normally end the drag
      // can go missing entirely, leaving the item glued to the cursor
      // forever (bug 2 — release does nothing). Blocking dragstart here
      // stops the native gesture from ever starting, so Matter.Mouse's own
      // mousedown/mousemove/mouseup always wins.
      container.addEventListener("dragstart", (e) => e.preventDefault());

      // Only Matter.Mouse, not MouseConstraint — Mouse still gives us
      // robust, already-battle-tested mouse *and* touch position/button
      // tracking (mouse.position, mouse.button) relative to `container`,
      // pixelRatio-corrected. What we don't want is MouseConstraint's own
      // *picking*: it hit-tests against a body's actual collision geometry,
      // which for every item here is BODY_SCALE (0.38) of the rendered
      // image — deliberately small so the pile can overlap and pack down
      // tightly (see BODY_SCALE's own comment). That's great for physics,
      // but it means only the small dead-centre of an item was ever
      // grabbable, which read as "the drag is only centered on a tiny spot"
      // rather than the whole visible object. pickBodyAt below hit-tests
      // against each item's full *visual* footprint (its alpha-bbox size,
      // the same size the div actually renders at) instead, so grabbing
      // anywhere on the object works — while the collision body driving the
      // pile stays exactly as small as it was.
      const mouse = Mouse.create(container);
      mouse.pixelRatio = window.devicePixelRatio || 1;

      // Finds the front-most (highest z-index) item whose full rendered
      // rectangle — not its small collision body — contains world point
      // (x, y), accounting for the body's current rotation. dx/dy is the
      // click point relative to the body's centre in world space; rotating
      // that by -body.angle gives the same offset in the body's own
      // unrotated local frame, which is what both the rectangle test and
      // the drag constraint's pointB (below) need.
      function pickBodyAt(x: number, y: number): PhysicsItem | null {
        let best: PhysicsItem | null = null;
        let bestZ = -Infinity;
        for (const pi of physicsItems) {
          const info = currentRenderInfo[pi.id];
          if (!info) continue;
          const { body } = pi;
          const dx = x - body.position.x;
          const dy = y - body.position.y;
          const cosA = Math.cos(body.angle);
          const sinA = Math.sin(body.angle);
          const localX = dx * cosA + dy * sinA;
          const localY = -dx * sinA + dy * cosA;
          if (Math.abs(localX) > info.divW / 2 || Math.abs(localY) > info.divH / 2) continue;
          const z = zIndexRef.current.get(pi.id) ?? 0;
          if (z > bestZ) {
            bestZ = z;
            best = pi;
          }
        }
        return best;
      }

      // Cursor: "grab" (open hand) over any draggable item, "grabbing"
      // (closed hand) for the duration of an actual drag, the plain
      // pointer otherwise — makes the mouse itself read as the hand doing
      // the grabbing instead of just being an arrow that happens to move
      // things. Deduped against the container's current inline style so a
      // fast mousemove burst isn't writing to the DOM every single event.
      let currentCursorStyle = "";
      const setCursor = (style: string) => {
        if (currentCursorStyle === style) return;
        currentCursorStyle = style;
        container.style.cursor = style;
      };
      const updateHoverCursor = (x: number, y: number) => {
        if (dragConstraint) return; // already dragging — "grabbing" owns the cursor until release
        setCursor(pickBodyAt(x, y) ? "grab" : "");
      };

      // The drag constraint grabs a body wherever the cursor actually
      // clicked, not necessarily its centre — the constraint then pulls
      // that exact point toward the cursor, and a stiff pull from an
      // off-centre point is a torque. A fast or jerky drag could apply
      // enough of that torque to spin an item wildly, independent of
      // MAX_ANGULAR (that clamp runs once per physics tick, but a single
      // tick's constraint force could already be large). Infinite inertia
      // for the duration of the drag only — restored the instant it ends —
      // sidesteps the torque entirely: the item still translates wherever
      // it's dragged, it just can't be spun while being held, matching how
      // picking something up by one corner doesn't actually spin it in
      // your hand.
      let dragConstraint: Matter.Constraint | null = null;
      let dragBody: Matter.Body | null = null;
      let dragOriginalInertia = 0;
      // Tracks mouse.button across ticks so the pick below only fires on
      // the up-> down edge (see stepPhysics) — read/written there.
      let wasMouseDown = false;

      function beginDrag(x: number, y: number) {
        const target = pickBodyAt(x, y);
        if (!target) return;
        const { body } = target;
        const dx = x - body.position.x;
        const dy = y - body.position.y;
        const cosA = Math.cos(body.angle);
        const sinA = Math.sin(body.angle);
        bringToFront(target.id);
        dragOriginalInertia = body.inertia;
        Body.setInertia(body, Infinity);
        dragBody = body;
        dragConstraint = Constraint.create({
          pointA: { x, y },
          bodyB: body,
          pointB: { x: dx * cosA + dy * sinA, y: -dx * sinA + dy * cosA },
          stiffness: 0.2,
          damping: 0.1,
          length: 0,
          render: { visible: false },
        });
        Composite.add(world, dragConstraint);
        setCursor("grabbing");
      }

      function endDrag() {
        if (!dragConstraint) return;
        Composite.remove(world, dragConstraint);
        if (dragBody) Body.setInertia(dragBody, dragOriginalInertia);
        dragConstraint = null;
        dragBody = null;
        setCursor("");
        const c = cursorRef.current;
        if (c) updateHoverCursor(c.x, c.y);
      }

      // Belt-and-braces for the "doesn't drop" half of the drag-ghost bug
      // above (and for the ordinary case of releasing the mouse/finger past
      // the stage's own edge while dragging an item near the jar's rim):
      // Matter.Mouse's own mouseup/touchend listener is scoped to
      // `container`, so a release that lands outside it (native drag-ghost
      // swallowing the event, or the cursor having genuinely left the
      // element first) never reaches it, and mouse.button would stay stuck
      // at "down" — the item would stay glued to wherever the mouse last
      // was. A window-level listener catches every release regardless of
      // where it lands and force-clears both the button state and our own
      // drag constraint.
      const forceReleaseDrag = () => {
        mouse.button = -1;
        endDrag();
      };
      window.addEventListener("mouseup", forceReleaseDrag);
      window.addEventListener("touchend", forceReleaseDrag);
      window.addEventListener("touchcancel", forceReleaseDrag);
      cleanupFns.push(() => {
        window.removeEventListener("mouseup", forceReleaseDrag);
        window.removeEventListener("touchend", forceReleaseDrag);
        window.removeEventListener("touchcancel", forceReleaseDrag);
      });

      // Rustle: mousemove only records the cursor position (cheap); the
      // actual repulsion + pointer-velocity force is computed once per
      // physics tick below.
      const cursorRef = { current: null as { x: number; y: number; prevX: number; prevY: number } | null };
      const handleMouseMove = (e: MouseEvent) => {
        const r = container.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const prev = cursorRef.current;
        cursorRef.current = { x, y, prevX: prev ? prev.x : x, prevY: prev ? prev.y : y };
        updateHoverCursor(x, y);
      };
      const handleMouseLeave = () => {
        cursorRef.current = null;
        setCursor("");
      };
      if (!reducedMotion) {
        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseleave", handleMouseLeave);
        cleanupFns.push(() => {
          container.removeEventListener("mousemove", handleMouseMove);
          container.removeEventListener("mouseleave", handleMouseLeave);
        });
      }

      // One fixed-timestep physics tick: release-on-schedule, the actual
      // Engine.update, column pinning, speed clamp, hard containment,
      // rustle, and the DOM transform writes. Called both by the real-time
      // rAF loop below and — for reduced motion — synchronously in a tight
      // loop before the first paint, so both paths share identical,
      // deterministic behaviour.
      function stepPhysics() {
        // Edge-triggered: pick (mouse.button transitioning up -> down) only
        // fires beginDrag once per press, not every tick it's held — so
        // holding the button down over empty space and then drifting over
        // an item afterward doesn't retroactively start dragging it, same
        // as a normal click-and-drag gesture would only ever grab whatever
        // was directly under the cursor at the moment of the press.
        const isMouseDown = mouse.button === 0;
        if (isMouseDown && !wasMouseDown && !dragConstraint) {
          beginDrag(mouse.position.x, mouse.position.y);
        } else if (!isMouseDown && dragConstraint) {
          endDrag();
        }
        if (dragConstraint) dragConstraint.pointA = { x: mouse.position.x, y: mouse.position.y };
        wasMouseDown = isMouseDown;

        Engine.update(engine, STEP_MS);

        for (const { id, body } of physicsItems) {
          // Column pinning: while an item hasn't yet touched down (see
          // landedIds above), force its x back to its own lane and zero out
          // any sideways velocity every tick. This is what guarantees every
          // item actually enters the jar rather than converging on wherever
          // it first grazes something, or drifting off to the side before
          // it's actually landed. The instant it touches the floor or an
          // already-landed item, the pin drops for good (never re-checked)
          // and the item falls under pure physics from then on — free to
          // tip, roll and collide with whatever's already in the jar.
          if (!hasEnteredJar.get(id)) {
            const targetX = (TARGET_X_FRACTION[id] ?? 0.5) * width;
            // A hard teleport straight to targetX every tick (this used to
            // be a plain Body.setPosition, matching the old Jar.js
            // reference exactly) fights the collision solver whenever a
            // still-pinned body is touching something — an already-landed
            // neighbour, or another pinned item packed into a nearby lane.
            // The solver pushes it sideways that same tick to resolve the
            // overlap; the very next tick this teleports it straight back
            // to targetX, undoing that; the tick after, the solver pushes
            // it away again — repeating every frame reads as visible
            // shaking. The old reference didn't hit this because its
            // collision boxes were much smaller (BODY_SCALE 0.36 there vs.
            // this roster's larger, more crowded ones) — contact between
            // two still-pinned bodies was rare enough not to matter. Nudge
            // toward targetX with a capped velocity instead of teleporting:
            // it still reliably reaches its lane (see PIN_CORRECT_SPEED's
            // own comment), but converges instead of snapping, so it can
            // actually lose a tug-of-war with the solver instead of re-
            // starting it every frame.
            const dx = targetX - body.position.x;
            const pinSpeedCap = PIN_CORRECT_SPEED * scale;
            const rawTargetPinVx = Math.max(-pinSpeedCap, Math.min(pinSpeedCap, dx * PIN_CORRECT_GAIN));
            // See PIN_CORRECT_SMOOTHING's own comment above — blend toward
            // the fresh target instead of jumping straight to it, so a
            // neighbour contesting this lane produces a small, decaying
            // wobble instead of a full-strength fight every tick.
            const prevPinVx = pinVxById.get(id) ?? 0;
            const pinVx = prevPinVx + (rawTargetPinVx - prevPinVx) * PIN_CORRECT_SMOOTHING;
            pinVxById.set(id, pinVx);
            Body.setVelocity(body, { x: pinVx, y: body.velocity.y });
            // Keep it upright while still pinned, too. The neck opening
            // (see jar-shape.ts) has margin for every column's item at its
            // authored, axis-aligned footprint — but a body that's picked
            // up spin from even a glancing graze off the wall on the way
            // down presents a wider diagonal footprint than that margin
            // accounts for, and can wedge against the wall at an angle
            // (pinned, so it can't slide sideways to work itself free
            // either). Tumbling is meant to start once something's
            // actually inside the jar, not during the controlled approach.
            if (body.angularVelocity !== 0) Body.setAngularVelocity(body, 0);
            // Matter's sleeping system tracks speed² + angularSpeed², and
            // puts a body to sleep — silently skipping gravity for it from
            // then on — once that's stayed below a small threshold for
            // ~60 ticks. A body released from rest and spawned far above
            // the frame spends a while at low speed before gravity has
            // built up real velocity, so without this it can fall asleep
            // mid-drop and just hang there. Force it awake every tick while
            // still pinned; once it enters the jar, this stops and Matter's
            // normal sleeping behaviour takes over (enableSleeping is about
            // idle CPU once the pile is genuinely at rest, not about
            // interrupting something still falling).
            if (body.isSleeping) Sleeping.set(body, false);

            if (landedIds.has(id) || body.position.y >= pinReleaseYPx) {
              hasEnteredJar.set(id, true);
            }
          }

          const angularSpeed = body.angularVelocity;
          if (Math.abs(angularSpeed) > MAX_ANGULAR) {
            Body.setAngularVelocity(body, Math.sign(angularSpeed) * MAX_ANGULAR);
          }

          const speed = Math.hypot(body.velocity.x, body.velocity.y);
          const maxSpeed = MAX_BODY_SPEED * scale;
          if (speed > maxSpeed) {
            const factor = maxSpeed / speed;
            Body.setVelocity(body, { x: body.velocity.x * factor, y: body.velocity.y * factor });
          }
        }

        // Hard containment: belt-and-braces on top of the wall bodies
        // above. Rare fast-impact solver frames can still push a body
        // through a wall — this clamps every body back inside the walls'
        // own combined bounding envelope no matter what the solver did.
        // Left/right/bottom are clamped for every body; the mouth (top) is
        // clamped too, but ONLY for bodies that have already entered the
        // jar (hasEnteredJar) — a body still on its way in has to be able
        // to pass through the mouth's y in the first place, or it could
        // never fall in at all. Without this, a body an already-settled
        // item bumps hard enough could sail straight up through the open
        // mouth with nothing to stop it short of the CSS clip way off the
        // top of the page (Hero.module.css's .columns) — visually it would
        // launch clean out of the jar instead of hitting the rim and
        // dropping back in, which is the whole point of a lid.
        if (wallBodies.length > 0) {
          let leftBound = Infinity;
          let rightBound = -Infinity;
          let floorBound = -Infinity;
          for (const w of wallBodies) {
            leftBound = Math.min(leftBound, w.bounds.min.x);
            rightBound = Math.max(rightBound, w.bounds.max.x);
            floorBound = Math.max(floorBound, w.bounds.max.y);
          }
          // Same y the mouth's own two edge points sit at (JAR_INTERIOR_
          // POINTS[0]/[16], jar-shape.ts) — i.e. exactly where the drawn
          // rim is, not some separate invented boundary.
          const mouthY = JAR_INTERIOR_POINTS[0].y * height;
          for (const { id, body, halfWidth, halfHeight } of physicsItems) {
            const hw = halfWidth * BODY_SCALE;
            const hh = halfHeight * BODY_SCALE;
            let { x, y } = body.position;
            let vx = body.velocity.x;
            let vy = body.velocity.y;
            let clamped = false;
            if (x - hw < leftBound) {
              x = leftBound + hw;
              vx = Math.max(vx, 0);
              clamped = true;
            }
            if (x + hw > rightBound) {
              x = rightBound - hw;
              vx = Math.min(vx, 0);
              clamped = true;
            }
            if (y + hh > floorBound) {
              y = floorBound - hh;
              vy = Math.min(vy, 0);
              clamped = true;
            }
            if (hasEnteredJar.get(id) && y - hh < mouthY) {
              y = mouthY + hh;
              // Cancel the upward velocity rather than reflecting it into a
              // bounce — reads as "bumped into the underside of the lid and
              // dropped", not a springy ricochet, matching the rest of this
              // jar's soft/heavy feel (see BODY_SCALE, restitution values).
              vy = Math.max(vy, 0);
              clamped = true;
            }
            if (clamped) {
              Body.setPosition(body, { x, y });
              Body.setVelocity(body, { x: vx, y: vy });
            }
          }
        }

        const cursor = cursorRef.current;
        if (cursor) {
          const radius = RUSTLE_RADIUS * scale;
          let vx = cursor.x - cursor.prevX;
          let vy = cursor.y - cursor.prevY;
          const pointerSpeed = Math.hypot(vx, vy);
          const maxPointerSpeed = MAX_POINTER_SPEED * scale;
          if (pointerSpeed > maxPointerSpeed) {
            const f = maxPointerSpeed / pointerSpeed;
            vx *= f;
            vy *= f;
          }
          for (const { id, body } of physicsItems) {
            // Only items that have already entered the jar rustle sideways
            // — one still pinned to its column would just have the push
            // cancelled out by the pin on the very next line anyway.
            if (!hasEnteredJar.get(id) || body.isSleeping) continue;
            const dx = body.position.x - cursor.x;
            const dy = body.position.y - cursor.y;
            const dist = Math.hypot(dx, dy);
            if (dist < radius && dist > 0.01) {
              const falloff = 1 - dist / radius;
              const mag = RUSTLE_FORCE * falloff * scale;
              Body.applyForce(body, body.position, {
                x: (dx / dist) * mag + vx * RUSTLE_FOLLOW,
                y: (dy / dist) * mag + vy * RUSTLE_FOLLOW,
              });
            }
          }
          cursor.prevX = cursor.x;
          cursor.prevY = cursor.y;
        }

        // DOM transform writes used to happen right here, every tick. Moved
        // out to each caller instead (see renderPhysicsItems below): this
        // function now only ever advances physics state. The precompute
        // loop below calls this 1200x back-to-back with nothing painted in
        // between anyway (the writes here were pure waste there), and the
        // live loop needs to call this a variable number of times per
        // frame (0, 1, or several, depending on real elapsed time) without
        // painting after every single one of them — see rafTick's own
        // comment for why that "paint after every step" was the actual
        // cause of the choppy/stutter report on higher-refresh-rate
        // displays: a fixed 60Hz physics tick was being used AS the paint
        // cadence, so on a 90/120/144Hz screen the vast majority of real
        // frames landed between two ticks and simply repainted the exact
        // same transform as the frame before (a run of duplicate frames),
        // then one frame would jump a full tick's worth of motion at once
        // — visually that reads as judder, not smooth motion, even though
        // the underlying simulation itself was never actually running slow.
      }

      function measure() {
        const rect = container!.getBoundingClientRect();
        return { w: rect.width, h: rect.height, top: rect.top };
      }

      // Bodies are only ever created once the container has actually been
      // measured — building them at some placeholder scale first and
      // rescaling in place afterward would leave their geometry (not just
      // their position) wrong, since a body's size is fixed at construction.
      const initial = measure();
      width = initial.w;
      height = initial.h;
      containerTop = initial.top;
      scale = width / REFERENCE_WIDTH;
      buildWalls(width, height, scale);
      currentRenderInfo = computeRenderInfo(scale);
      computeSpawnYById();
      // Every body is created dynamic and immediately falling — no static-
      // then-released staging. Real vertical gaps at spawn (spawnYById)
      // stand in for the old artificial release timer: the arrival stagger
      // now falls naturally out of gravity + each item's own starting
      // height/frictionAir, the same way the old Jar.js reference did it.
      for (const item of items) spawnBody(item);

      // --- deterministic settle: always precompute synchronously --------
      // Driving Matter.js live off requestAnimationFrame's real elapsed
      // time — even though Engine.update itself always runs at the fixed
      // STEP_MS timestep (see STEP_MS's own comment) — turned out not to
      // be fully reproducible in practice: sub-STEP_MS *phase* differences
      // in exactly when the first rAF callback lands relative to when
      // bodies were spawned (itself downstream of real image-decode/layout
      // timing) shift which tick two bodies first make contact on. With
      // this many colliding rigid bodies, that's enough to occasionally
      // cascade into a visibly different final pile — a genuine chaotic-
      // sensitivity issue, not something the MAX_STEPS_PER_FRAME fix above
      // solves on its own, since that was about dropped total simulated
      // time, not this kind of phase alignment.
      //
      // The fix: remove real time from the physics entirely. Run the whole
      // fall-and-settle synchronously, back-to-back Engine.update calls
      // with nothing in between and nothing painted — the exact same
      // fixed-STEP_MS sequence runs in the exact same order on every load,
      // deterministically, same as the old reduced-motion fast-forward
      // below already did (that path stays as-is). Reduced motion still
      // just shows the finished pile immediately; everyone else gets this
      // recorded as `history` (one frame per physicsItems entry per tick)
      // and played back afterward as a real-time-driven animation instead
      // of ever stepping the live engine during the visible fall — see
      // replayTick below. 1200 ticks (20 sim-seconds) is more headroom
      // than the entrance needs even for the furthest (deepest-spawned)
      // item, but the loop bails out early the moment every body is
      // actually asleep, so it essentially never runs anywhere near that
      // long in practice.
      const history: { x: number; y: number; angle: number }[][] = [];
      for (let i = 0; i < 1200; i++) {
        stepPhysics();
        if (!instant) {
          history.push(physicsItems.map(({ body }) => ({ x: body.position.x, y: body.position.y, angle: body.angle })));
        }
        if (physicsItems.every(({ body }) => body.isSleeping)) break;
      }
      // Belt-and-braces: force every item marked entered even if one never
      // actually crossed the mouth line in the precompute window, so it
      // doesn't stay pinned to its lane forever.
      for (const { id } of physicsItems) {
        hasEnteredJar.set(id, true);
      }
      // Reduced-motion has no replay/fall animation to paint first (see
      // `instant` above and the replay/startLiveLoop branch below) — paint
      // the already-precomputed final settled positions right now, once,
      // so there isn't a blank/default-position frame between `setReady`
      // below and the live loop's own first rAF tick actually running.
      // Every other path leaves the first paint to replay's own first
      // frame (history[0], i.e. spawn position) instead — painting the
      // finished pile here too would just be an extra frame replay's own
      // first tick immediately overwrites anyway.
      if (instant) {
        for (const { id, body, halfWidth, halfHeight } of physicsItems) {
          const el = itemElsRef.current.get(id);
          if (!el) continue;
          el.style.transform = `translate3d(${body.position.x - halfWidth}px, ${body.position.y - halfHeight}px, 0) rotate(${body.angle}rad)`;
        }
      }

      // --- resize: rebuild walls + every body at the new scale ----------
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      function rebuildForResize() {
        if (!container) return;
        const r = measure();
        if (r.w <= 0 || r.h <= 0) return;
        // ResizeObserver fires once immediately on the very first observe()
        // call, per spec, even though nothing has actually resized — this
        // guards against acting on that spurious initial callback (or any
        // other sub-pixel no-op) doing a full destroy-and-recreate of every
        // body for literally no reason. That was visible as a pop shortly
        // after mount — skullpanda (and, since every body gets rebuilt
        // from a fresh fractional snapshot at once, everything touching
        // it) shifting slightly — landing close to the end of the settle
        // once that only takes a second or so (see the deterministic
        // replay above), rather than mid-fall where it used to go
        // unnoticed. A real resize is easily bigger than this.
        if (Math.abs(r.w - width) < 1 && Math.abs(r.h - height) < 1) return;

        // Every body gets destroyed and recreated below — a drag in
        // progress would otherwise leave dragConstraint/dragBody pointing
        // at a body that's no longer in the world (harmless, but the item
        // would silently stop following the cursor mid-drag with no visible
        // release). Cleanly end it first so a resize during a drag just
        // drops the item where it was, same as letting go of the mouse.
        endDrag();

        // Capture every body's position as a fraction of the *old* box
        // (works fine for still-off-screen bodies above the jar too — a
        // negative y fraction scales proportionally just like a positive
        // one), plus its angle and static state.
        const snapshot = physicsItems.map(({ id, body }) => ({
          id,
          xFrac: body.position.x / width,
          yFrac: body.position.y / height,
          angle: body.angle,
          wasStatic: body.isStatic,
        }));

        Composite.remove(world, wallBodies);
        for (const { body } of physicsItems) Composite.remove(world, body);
        bodyIdToItemId.clear();
        physicsItems.length = 0;

        width = r.w;
        height = r.h;
        scale = width / REFERENCE_WIDTH;
        buildWalls(width, height, scale);
        currentRenderInfo = computeRenderInfo(scale);
        setRenderInfo({ ...currentRenderInfo });

        for (const snap of snapshot) {
          const item = itemsById.get(snap.id);
          const info = currentRenderInfo[snap.id];
          if (!item || !info) continue;
          const body = createBodyForItem(item, info, snap.xFrac * width, snap.yFrac * height, snap.angle);
          if (snap.wasStatic) Body.setStatic(body, true);
          bodyIdToItemId.set(body.id, snap.id);
          physicsItems.push({ id: snap.id, body, halfWidth: info.divW / 2, halfHeight: info.divH / 2 });
          Composite.add(world, body);
        }
        // `hasEnteredJar` (keyed by item id, untouched above) survives as-is
        // — nothing that already entered the jar gets re-pinned to its
        // column after a resize.
      }
      const handleResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(rebuildForResize, RESIZE_DEBOUNCE_MS);
      };
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      cleanupFns.push(() => {
        resizeObserver.disconnect();
        if (resizeTimer) clearTimeout(resizeTimer);
      });

      // --- real-time loop, gated by visibility -------------------------
      // Wrapped in a function, not run unconditionally, because it's now
      // started from two different places: immediately for reduced motion
      // (nothing to replay), or once the recorded history above has
      // finished playing back (see replayTick below) for everyone else.
      // Either way, by the time this runs the live Matter world is already
      // sitting at the fully-settled state — the precompute above actually
      // advanced the real engine, `history` was only ever a recording of
      // it for display — so there's no state to hand off, just the visible
      // rAF loop to start.
      let rafId = 0;
      function startLiveLoop() {
        let accumulator = 0;
        let lastTime = performance.now();
        // Fixes the choppy/stutter report: this loop's physics still only
        // ever advances in fixed STEP_MS (60Hz-equivalent) increments —
        // that's deliberate, see STEP_MS's own comment — but painting used
        // to happen inside stepPhysics itself, i.e. only on ticks when the
        // physics actually advanced. rAF fires at the *display's* refresh
        // rate, not 60Hz — on anything above 60Hz (90/120/144Hz screens,
        // now common) most real frames land strictly between two physics
        // ticks, so painting only-on-tick meant those frames just repainted
        // an unchanged transform, then one frame jumped a whole tick's
        // worth of motion at once: a run of duplicate frames followed by a
        // snap, which reads as judder even though the simulation itself
        // was never actually running behind. Standard fix: keep stepping
        // physics at its own fixed cadence, but paint every rAF frame
        // regardless, interpolated between the position from just before
        // the most recent tick (`prev`) and the position that tick landed
        // on (the body's current position) — `alpha` (always in [0,1), the
        // leftover time since that last tick, as a fraction of one tick)
        // says how far between those two to render. On a 60Hz display this
        // converges to alpha≈1 every frame (i.e. same as before); on a
        // 144Hz display it smoothly renders the in-between position instead
        // of holding the last tick's position for ~2.4 frames straight.
        let prev = physicsItems.map(({ body }) => ({ x: body.position.x, y: body.position.y, angle: body.angle }));
        function renderInterpolated(alpha: number) {
          for (let i = 0; i < physicsItems.length; i++) {
            const { id, body, halfWidth, halfHeight } = physicsItems[i];
            const el = itemElsRef.current.get(id);
            if (!el) continue;
            const p = prev[i];
            const x = p.x + (body.position.x - p.x) * alpha;
            const y = p.y + (body.position.y - p.y) * alpha;
            const angle = p.angle + (body.angle - p.angle) * alpha;
            el.style.transform = `translate3d(${x - halfWidth}px, ${y - halfHeight}px, 0) rotate(${angle}rad)`;
          }
        }
        function rafTick(now: number) {
          accumulator += now - lastTime;
          lastTime = now;
          accumulator = Math.min(accumulator, STEP_MS * MAX_STEPS_PER_FRAME);
          while (accumulator >= STEP_MS) {
            // Snapshot BEFORE stepping — this becomes the "just before the
            // most recent tick" endpoint interpolation renders from.
            prev = physicsItems.map(({ body }) => ({ x: body.position.x, y: body.position.y, angle: body.angle }));
            stepPhysics();
            accumulator -= STEP_MS;
          }
          renderInterpolated(accumulator / STEP_MS);
          rafId = requestAnimationFrame(rafTick);
        }

        let isIntersecting = true;
        let isRunning = false;
        const updateRunning = () => {
          const shouldRun = isIntersecting && !document.hidden;
          if (shouldRun && !isRunning) {
            lastTime = performance.now();
            accumulator = 0;
            rafId = requestAnimationFrame(rafTick);
            isRunning = true;
          } else if (!shouldRun && isRunning) {
            cancelAnimationFrame(rafId);
            isRunning = false;
          }
        };

        const intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            isIntersecting = entry.isIntersecting;
            updateRunning();
          },
          { threshold: 0 },
        );
        // TS can't carry the `if (!container) return` narrowing above into
        // this nested function declaration (only arrow functions keep it) —
        // same non-null assertion already used for `container` elsewhere in
        // this file (e.g. measure()'s getBoundingClientRect() call).
        intersectionObserver.observe(container!);
        cleanupFns.push(() => intersectionObserver.disconnect());

        const handleVisibilityChange = () => updateRunning();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        cleanupFns.push(() => document.removeEventListener("visibilitychange", handleVisibilityChange));

        updateRunning();
      }

      cleanupFns.push(() => {
        cancelAnimationFrame(rafId);
        cancelAnimationFrame(replayRafId);
        Composite.clear(world, false);
        Engine.clear(engine);
      });

      // --- entrance delay: don't reveal the fall until the jar's mostly
      // visible ------------------------------------------------------------
      // The jar briefly didn't fade in at all (a request in between this
      // one), which made this delay a no-op for a while — it's back now
      // that the jar is back to fading in with everything else
      // (Hero.module.css's shared heroLoadIn, see motion-timing.ts): items
      // dropping into a still-mostly-transparent jar reads as broken.
      // JAR_PHYSICS_DELAY_MS (motion-timing.ts) is derived from that same
      // fade's own duration, not a bare hardcoded number — see its own
      // comment. Timed against setupStartTime (captured at the top of this
      // function, effectively "the fade's own start"), not a fresh clock
      // read here, so the real work already done above counts against the
      // delay instead of stacking an extra ~300ms on top of it. This is
      // NOT the whole "why does it take a while to start falling" story —
      // most of that was real preload + precompute time; see the
      // [jar-timing]-tagged commits' history for the measurements that led
      // to preloadBBox's split from outline-mask generation, and to
      // downscaling the oversized source PNGs in public/images/items/
      // (several were 2000px+ on a side for content that renders at a
      // couple hundred px — real, measured cost, not guesswork; roughly
      // halved the settle time end to end). Skipped entirely under reduced
      // motion: `instant` has already rendered the settled pile above with
      // no fall to delay, and there's no fade running to wait on either.
      if (!instant) {
        const elapsed = performance.now() - setupStartTime;
        const remaining = JAR_PHYSICS_DELAY_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (cancelled) return;
      }

      // --- replay: play the precomputed history back in real time -------
      // Same accumulator/fixed-STEP_MS pattern as the live loop above, but
      // reading pre-baked positions out of `history` instead of stepping
      // the engine — so a slow frame here just shows a later already-
      // computed frame (like a dropped-frame catch-up), never a different
      // physics outcome. physicsItems' order is stable between recording
      // and playback (nothing rebuilds it in between), so history[n][i]
      // always lines up with physicsItems[i].
      let replayRafId = 0;
      if (instant || history.length === 0) {
        startLiveLoop();
      } else {
        let replayIndex = 0;
        let replayAccumulator = 0;
        let replayLastTime = performance.now();
        function replayTick(now: number) {
          replayAccumulator += now - replayLastTime;
          replayLastTime = now;
          replayAccumulator = Math.min(replayAccumulator, STEP_MS * MAX_STEPS_PER_FRAME);
          while (replayAccumulator >= STEP_MS && replayIndex < history.length - 1) {
            replayIndex++;
            replayAccumulator -= STEP_MS;
          }
          // Same judder fix as the live loop's rafTick (see its own long
          // comment) — but simpler here, since replay has the whole fall
          // precomputed already: rather than only ever painting on a
          // history-index change (a snap on higher-than-60Hz displays, same
          // as the old stepPhysics-paints-inline bug), lerp toward whatever
          // the *next* not-yet-reached frame is by `alpha` (the leftover
          // time since replayIndex last advanced, as a fraction of one
          // tick). No lookahead risk here the way there would be in the
          // live loop — `history[replayIndex + 1]` already exists.
          const alpha = replayAccumulator / STEP_MS;
          const frame = history[replayIndex];
          const nextFrame = history[Math.min(replayIndex + 1, history.length - 1)];
          for (let i = 0; i < physicsItems.length; i++) {
            const { id, halfWidth, halfHeight } = physicsItems[i];
            const el = itemElsRef.current.get(id);
            const rec = frame[i];
            const next = nextFrame[i];
            if (el && rec && next) {
              const x = rec.x + (next.x - rec.x) * alpha;
              const y = rec.y + (next.y - rec.y) * alpha;
              const angle = rec.angle + (next.angle - rec.angle) * alpha;
              el.style.transform = `translate3d(${x - halfWidth}px, ${y - halfHeight}px, 0) rotate(${angle}rad)`;
            }
          }
          if (replayIndex >= history.length - 1) {
            startLiveLoop();
            return;
          }
          replayRafId = requestAnimationFrame(replayTick);
        }
        replayRafId = requestAnimationFrame(replayTick);
      }

      setRenderInfo(currentRenderInfo);
      setReady(true);

      // --- deferred: generate 'blob' ring rasters in the background ------
      // The heavy part of border-ring generation (getOutlineMask -> lib/
      // outline.ts's 24x drawImage + 2 more full-canvas composites + a
      // toDataURL PNG encode, per item) used to block the fall from
      // starting at all — see the big comment above the preload await for
      // the measured cost. None of that is needed to spawn a body or paint
      // an item, only the bbox (already resolved) is — so it runs here
      // instead, after the fall is already underway, fire-and-forget (not
      // awaited by anything). Spread across a setTimeout(0) yield between
      // each item so this heavy synchronous canvas work can't itself cause
      // the fall to stutter — one item's ring finishing a beat behind its
      // own image is already a handled, existing state (JarItem.tsx's
      // useDropShadowFallback), not a new edge case.
      (async () => {
        for (const item of items) {
          if (cancelled || item.shape !== "blob") continue;
          const img = imgsById.get(item.id);
          const bbox = bboxes[item.id];
          if (!img || !bbox) continue;
          const dilationRadius = dilationRadii[item.id] ?? 0;
          const outlineMask = getOutlineMask(item.src, img, dilationRadius, OUTLINE_SAMPLES);
          if (cancelled) return;
          setOutlineMasks((prev) => ({ ...prev, [item.id]: outlineMask }));
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      })();
    }

    setup();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, items]);

  return {
    ready,
    renderInfo,
    outlineMasks,
    registerItemEl,
    debugWalls,
    debugPhysicsEnabled,
  };
}
