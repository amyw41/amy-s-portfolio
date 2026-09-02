"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Matter from "matter-js";
import { JAR_INTERIOR_POINTS, JAR_WALL_THICKNESS, computeJarWallRects, createJarWallBodies, type JarWallRect } from "./jar-shape";
import { computeAlphaBBox, dilateAlphaMask, ALPHA_THRESHOLD, type AlphaBBox } from "./alpha-bbox";
import { getOutlineMask } from "@/lib/outline";
import { PLACEMENT_ORDER, LAYER_ORDER, TARGET_X_FRACTION } from "./jar-layout";
import type { JarItemDef } from "./items.manifest";
import { JAR_PHYSICS_DELAY_MS } from "./motion-timing";

const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter;

/** Container width the reference viewport assumes. Every px constant below
 * is multiplied by (actual container width / this). Uncapped, so the jar
 * keeps growing on screens wider than the reference. */
const REFERENCE_WIDTH = 480;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/** Coalesces a burst of ResizeObserver callbacks into one rebuild. */
const RESIZE_DEBOUNCE_MS = 150;

/** Fixed physics timestep. A variable delta would make the sim
 * non-deterministic — the same load could settle into a different pile from
 * frame timing jitter alone. */
const STEP_MS = 1000 / 60;
/** Caps catch-up steps per real frame. Keep this generous: time beyond the
 * cap is dropped rather than simulated, so a janky load would run fewer
 * total steps than a smooth one and settle differently. Early frames are
 * exactly when image decode and mask work make frames long. */
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

/** Safety net in px/step (scaled). A body pinched between two wall segments
 * can pick up an enormous solver-correction velocity in one step and rocket
 * out of the jar. Set above ordinary fall speed so it never limits that. */
const MAX_BODY_SPEED = 24;

/** Caps angular velocity in rad/step. Not scaled by container size, since
 * rotation rate is unitless. frictionAir bleeds off spin over time but does
 * not stop one frame's solver impulse from being huge. */
const MAX_ANGULAR = 0.35;

/** How far above the viewport top a respawned item reappears, px at
 * REFERENCE_WIDTH. Same for every item, unlike spawnYById's load-in
 * stagger, so respawns don't take wildly different times. */
const RESPAWN_LEAD_PX = 24;

/** Nudges a still-pinned body back toward its lane each tick. GAIN is the
 * proportional term, SPEED caps the result (px/step at REFERENCE_WIDTH) so a
 * far-drifted body isn't flung back in one tick. GAIN is deliberately weak
 * enough to lose a tug-of-war with the collision solver.
 *
 * SMOOTHING low-pass-filters our own outgoing command against what we
 * commanded last tick, which stops two overlapping pinned lanes from
 * shaking: pure proportional control meets each neighbour shove with a
 * full-strength snap back, forever.
 *
 * Filter our own command, never the body's post-solver velocity. This is a
 * per-tick setVelocity, not a force, so feeding the adversarial solver's
 * output back in can flip sign tick to tick and amplify the shake. */
const PIN_CORRECT_GAIN = 0.3;
const PIN_CORRECT_SPEED = 10;
const PIN_CORRECT_SMOOTHING = 0.18;

/** Overrides Matter's default sleep threshold (0.08), which is too strict
 * here: resting chamfered rectangles never reach a perfectly static
 * contact, and the solver's sub-pixel corrections keep resetting the
 * 60-tick sleep counter, so bodies creep indefinitely.
 *
 * Units are speed² + angularSpeed². A real fall or tumble is in the tens to
 * hundreds (MAX_BODY_SPEED alone contributes 24² = 576), settle-jitter is
 * around 1–2, so there is a wide safe band between them. */
const SETTLE_MOTION_THRESHOLD = 16;

/** An item's alpha-bbox longest edge renders at BASE_SIZE * sizeScale, at
 * REFERENCE_WIDTH. Stacks with the 0.8x entity scale on .jarWrapper
 * (Hero.module.css): that shrinks jar art and items together, this shrinks
 * items relative to the jar art. */
const BASE_SIZE = 160;

/** Collision hitbox as a fraction of the rendered size. Lower lets items
 * overlap more heavily before their bodies touch. Global, not per-item —
 * per-item character lives in density/friction/restitution/frictionAir.
 *
 * Tuning: lower if the pile starts bouncing (landing items shoving settled
 * neighbours), raise toward ~0.7 if items overlap so much they look buried.
 * Individual sizeScale values are usually the better lever for burial. */
const BODY_SCALE = 0.54;

/** Warn (once per item) when a source file carries more than this much
 * untrimmed transparent padding, so it can be cropped at source. */
const PADDING_WARNING_THRESHOLD = 0.15;

/** Fallback if --outline-thickness (lib/tokens.css) can't be read. Keep
 * numerically equal to tokens.css's default so it is never visible. */
const FALLBACK_OUTLINE_THICKNESS_PX = 4;

/** Ring sample count for getOutlineMask (lib/outline.ts). A heavily
 * scaled-down item gets a large dilation radius, and a larger radius needs
 * denser sampling to avoid visible facets at thin protrusions like ballet's
 * straps or kitty-mirror's handle. */
const OUTLINE_SAMPLES = 24;

/** Reads --outline-thickness (lib/tokens.css) off :root, in px. Single
 * source of truth for both border techniques: 'box' items read it live via
 * CSS, 'blob' items use this to size the dilation radius baked into their
 * generated ring. */
function getOutlineThicknessPx(): number {
  if (typeof window === "undefined") return FALLBACK_OUTLINE_THICKNESS_PX;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--outline-thickness").trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : FALLBACK_OUTLINE_THICKNESS_PX;
}

/** Vertical gap between consecutive items' spawn positions, px at
 * REFERENCE_WIDTH. Guaranteeing a gap avoids handing Matter
 * already-interpenetrating bodies on frame 1, which can launch them clean
 * through the walls. */
const SPAWN_GAP = 30;
/** How far above the frame the first item's spawn cursor starts, same units
 * as SPAWN_GAP. Comparable to the stage's own height, so the spawn point
 * sits at or above .columns's overflow:clip boundary and items genuinely
 * fall in from off-screen rather than popping into view. */
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
  /** Geometry for the 'blob' border ring, in the same div-relative space as
   * imgLeft/imgTop: the alpha bbox plus the item's dilation radius on every
   * side. Left at 0 for 'box' items, which border via box-shadow. */
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

/**
 * Dilation radius, in native source pixels, for a 'blob' item's outline
 * ring. Defined so that at any container scale s, ringPad collapses to
 * outlineThicknessPx * s, i.e. every item's ring reads the same thickness
 * on screen however small its bbox is relative to BASE_SIZE.
 *
 * Must be derived from the alpha bbox, never naturalWidth/Height — sizing
 * off the raw file would reintroduce the padding bug alpha-bbox sizing
 * exists to solve. computeRenderInfo reuses this exact value rather than
 * recomputing, so the ring raster and its displayed geometry cannot drift.
 */
function computeDilationRadius(item: JarItemDef, bbox: AlphaBBox, outlineThicknessPx: number): number {
  const bboxLongest = Math.max(bbox.bboxW, bbox.bboxH);
  if (bboxLongest <= 0) return outlineThicknessPx; // degenerate (fully transparent) file — arbitrary but harmless
  const itemDisplayScale = (BASE_SIZE * item.sizeScale) / bboxLongest;
  return outlineThicknessPx / itemDisplayScale;
}

interface BBoxPreloadResult {
  bbox: AlphaBBox;
  /** Kept so the deferred outline-mask pass can reuse this already-decoded
   * element instead of loading the same src twice. */
  img: HTMLImageElement;
}

/** Decode plus alpha bbox only — no canvas dilation, no encoding. This is
 * the only preload work the fall itself has to wait on, since the bbox
 * drives every item's sizing and physics geometry. Ring rasters are
 * generated later; see the call site. */
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

/** Safety valve, not the normal release path — landedIds/collisionStart
 * below releases a column pin on first contact with the floor or a landed
 * item. This only exists so a body can't stay pinned forever if a collision
 * is somehow missed, so it sits close to the floor and normally never
 * fires. Releasing much higher lets items graze each other on the way down
 * and drift toward centre before touching down. */
const PIN_RELEASE_Y_FRACTION = 0.92;

export function useJarPhysics(
  containerRef: RefObject<HTMLDivElement | null>,
  items: JarItemDef[],
  // Wraps the hero's title/tagline (see Hero/index.tsx) — its descendant
  // text elements become static solid bodies a dragged-out item can land
  // and rest on (see buildTextPlatformBodies below). Optional: without it,
  // a dragged item just falls straight past that column.
  textPlatformsRef?: RefObject<HTMLDivElement | null>,
) {
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

      // Matches the moment the hero's CSS load-in begins, since both are
      // driven by the same mount. Used for the entrance delay below.
      const setupStartTime = performance.now();

      // ?debug=perf logs and asserts that the live rAF loop's running state
      // agrees with "should it be running" (in viewport and tab visible).
      const debugPerf = new URLSearchParams(window.location.search).get("debug") === "perf";

      // Only the bbox decode blocks the fall, since the bbox drives sizing
      // and physics geometry. Ring generation is real canvas work (24
      // drawImage calls plus composites plus a PNG encode per 'blob' item)
      // and used to block here too, which was most of the delay before
      // items started falling. It's deferred below.
      const outlineThicknessPx = getOutlineThicknessPx();
      const preloadEntries = await Promise.all(items.map(async (item) => [item.id, await preloadBBox(item)] as const));
      if (cancelled) return;
      const bboxes = Object.fromEntries(
        preloadEntries.map(([id, r]) => [id, r.bbox]),
      ) as Record<string, AlphaBBox>;
      const imgsById = new Map(preloadEntries.map(([id, r]) => [id, r.img]));
      // Pure arithmetic, not canvas work, so ring geometry is correct from
      // the first render even though the raster arrives later.
      const dilationRadii = Object.fromEntries(
        items.map((item) => [
          item.id,
          item.shape === "blob" ? computeDilationRadius(item, bboxes[item.id], outlineThicknessPx) : null,
        ]),
      ) as Record<string, number | null>;
      // Grown by the same radius as the drawn ring, so the clickable area
      // reaches exactly as far as the ring you can see. 'box' items have no
      // ring, so they keep the tight mask.
      //
      // The array itself has to grow by `radius` on every side rather than
      // dilating in place: the ring reaches beyond the tight bbox, and a
      // same-size dilation would clip it right where it starts.
      const clickMasks = Object.fromEntries(
        items.map((item) => {
          const bbox = bboxes[item.id];
          const radius = Math.round(dilationRadii[item.id] ?? 0);
          if (radius <= 0) {
            return [item.id, { mask: bbox.alphaMask, width: bbox.bboxW, height: bbox.bboxH, padR: 0 }];
          }
          const paddedW = bbox.bboxW + radius * 2;
          const paddedH = bbox.bboxH + radius * 2;
          const padded = new Uint8Array(paddedW * paddedH);
          for (let y = 0; y < bbox.bboxH; y++) {
            const srcOffset = y * bbox.bboxW;
            const dstOffset = (y + radius) * paddedW + radius;
            padded.set(bbox.alphaMask.subarray(srcOffset, srcOffset + bbox.bboxW), dstOffset);
          }
          const mask = dilateAlphaMask(padded, paddedW, paddedH, radius);
          return [item.id, { mask, width: paddedW, height: paddedH, padR: radius }];
        }),
      ) as Record<string, { mask: Uint8Array; width: number; height: number; padR: number }>;

      for (const item of items) {
        const b = bboxes[item.id];
        // Measured against the region actually scanned, not the whole file:
        // a cropRegion item's bbox is deliberately restricted, so comparing
        // it to full file area counts the excluded artwork as padding and
        // warns however tightly the file is cropped.
        const region = item.cropRegion;
        const scannedArea = region
          ? (region.right - region.left) * b.naturalWidth * ((region.bottom - region.top) * b.naturalHeight)
          : b.naturalWidth * b.naturalHeight;
        const bboxArea = b.bboxW * b.bboxH;
        if (scannedArea > 0 && bboxArea < scannedArea * (1 - PADDING_WARNING_THRESHOLD)) {
          const pct = Math.round((1 - bboxArea / scannedArea) * 100);
          const filename = item.src.split("/").pop() ?? item.id;
          const against = region
            ? `its cropRegion (file ${b.naturalWidth}×${b.naturalHeight})`
            : `file ${b.naturalWidth}×${b.naturalHeight}`;
          console.warn(
            `[jar] ${filename} has ~${pct}% untrimmed transparent padding ` +
              `(alpha bbox ${b.bboxW}×${b.bboxH} vs ${against}) — consider trimming at source.`,
          );
        }
      }

      const reducedMotion = window.matchMedia(REDUCED_MOTION).matches;

      // Module-level field on Sleeping, not per-engine, so setting it once
      // is enough. The cast is intentional: _motionSleepThreshold is
      // internal and undeclared in @types/matter-js.
      (Sleeping as unknown as { _motionSleepThreshold: number })._motionSleepThreshold = SETTLE_MOTION_THRESHOLD;

      const engine = Engine.create({
        enableSleeping: true,
        gravity: { x: 0, y: 2.6 },
        // Above Matter's 6/4 defaults: this gravity and speed cap let a body
        // cross enough distance per step to tunnel through walls without
        // extra solver iterations.
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
      /** Stage top relative to the viewport, real px. SPAWN_LEAD is in the
       * stage's local space, which floats with .columns's vertical centring,
       * so on a tall screen the spawn point would land inside the visible
       * area. Folding this in makes it track the real viewport top. */
      let containerTop = 0;
      /** Where a dragged-out item respawns, in the same frozen frame as
       * containerTop. Deliberately not recomputed per tick from live scroll
       * position: that made simply scrolling the page move the boundary, so
       * an item could respawn early depending on scroll alone. */
      let respawnY = 0;
      let wallBodies: Matter.Body[] = [];
      let textPlatformBodies: Matter.Body[] = [];
      let pinReleaseYPx = 0;

      const physicsItems: PhysicsItem[] = [];
      // What is actually painted right now, kept in lockstep with every
      // el.style.transform write below. pickBodyAt hit-tests against this,
      // not body.position/angle, which can be a full tick (or, during
      // replay, the entire final pose) ahead of what the user sees. Falls
      // back to the body for anything not yet painted.
      const renderedPose = new Map<string, { x: number; y: number; angle: number }>();
      const bodyIdToItemId = new Map<number, string>();
      // True once an item's centre has crossed below the mouth line —
      // a one-way latch (see stepPhysics): once true, never re-pinned,
      // even if it later bounces back above that y for a moment.
      const hasEnteredJar = new Map<string, boolean>(items.map((item) => [item.id, false]));
      // Set when a still-pinned body first touches the floor or an
      // already-landed item. Gating pin release on contact rather than on a
      // fixed y line means an item free-falls straight down its lane for
      // the entire drop, instead of being handed to free physics while
      // still above the pile where anything it grazes can nudge it toward
      // centre.
      const landedIds = new Set<string>();
      // Previous tick's commanded pin-correction x-velocity, per item.
      // See PIN_CORRECT_SMOOTHING.
      const pinVxById = new Map<string, number>();
      // Ids teleported by the out-of-bounds respawn this tick — rafTick uses
      // this to skip interpolating across the jump (see its own comment).
      const teleportedIds = new Set<string>();
      const fallIndexById = new Map<string, number>(orderedIds.map((id, i) => [id, i]));

      // The hasEnteredJar checks are the guard: only a still-falling item
      // can be marked landed, and only the floor or an already-landed item
      // can do the marking.
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

      // Static bodies for the hero's title and tagline, so a dragged-out
      // item can land on them. Nav links are deliberately excluded.
      //
      // Queried by tag rather than CSS-module class, since those are hashed
      // at build time. Inside textPlatformsRef, h1/p is exactly the title
      // and tagline, not the logo or the nav. Rects are converted into the
      // physics world's frame via stageRect, which holds as long as neither
      // box has moved since stageRect was measured; rebuildTextPlatforms
      // covers the one case where it can, a resize.
      function buildTextPlatformBodies(): Matter.Body[] {
        const root = textPlatformsRef?.current;
        if (!root) return [];
        const bodies: Matter.Body[] = [];
        root.querySelectorAll<HTMLElement>("h1, p").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return;
          bodies.push(
            Bodies.rectangle(
              r.left - stageRect.left + r.width / 2,
              r.top - stageRect.top + r.height / 2,
              r.width,
              r.height,
              // Matches the jar floor (jar-shape.ts) so an item settles here
              // the same way it settles in the pile.
              { isStatic: true, friction: 0.8, restitution: 0.02, label: "text-platform" },
            ),
          );
        });
        return bodies;
      }

      function rebuildTextPlatforms() {
        if (textPlatformBodies.length > 0) Composite.remove(world, textPlatformBodies);
        textPlatformBodies = buildTextPlatformBodies();
        Composite.add(world, textPlatformBodies);
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
          // Same bbox and scale source as both the image and the mask
          // raster, so ring geometry can't drift from what was baked in.
          const ringPad = (dilationRadii[item.id] ?? 0) * pixelScale;
          info[item.id] = {
            divW: bbox.bboxW * pixelScale,
            divH: bbox.bboxH * pixelScale,
            imgW: bbox.naturalWidth * pixelScale,
            imgH: bbox.naturalHeight * pixelScale,
            imgLeft,
            imgTop,
            // Encloses the full image plus ring padding on every side,
            // matching what lib/outline.ts baked into the raster.
            ringLeft: imgLeft - ringPad,
            ringTop: imgTop - ringPad,
            ringWidth: bbox.naturalWidth * pixelScale + ringPad * 2,
            ringHeight: bbox.naturalHeight * pixelScale + ringPad * 2,
          };
        }
        return info;
      }

      // Populated once the container is first measured, right after
      // buildWalls. Nothing reads it before then: spawnBody, the only
      // reader, also waits on that measurement.
      let currentRenderInfo: Record<string, RenderInfo> = {};

      function createBodyForItem(item: JarItemDef, info: RenderInfo, x: number, y: number, angle: number) {
        // A chamfered rectangle matching the bbox's aspect ratio, so a
        // long/thin item topples like a bar and a square-ish one rolls.
        // That distinction comes from the bbox alone, not a per-item flag.
        const bodyW = info.divW * BODY_SCALE;
        const bodyH = info.divH * BODY_SCALE;
        const options: Matter.IChamferableBodyDefinition = {
          density: item.density,
          friction: item.friction,
          restitution: item.restitution,
          frictionAir: item.frictionAir,
          angle,
          label: item.id,
          // A rounder hitbox lets items roll and settle more smoothly; much
          // below this reads as sharp-edged and rectangular.
          chamfer: { radius: Math.min(bodyW, bodyH) * 0.4 },
        };
        const body = Bodies.rectangle(x, y, bodyW, bodyH, options);
        // Scaled up, deliberately not Infinity: collisions can still torque
        // the body a little, so it settles at a small natural tilt. Infinite
        // inertia was tried and read as unnaturally level.
        if (item.lockRotation) Body.setInertia(body, body.inertia * 40);
        return body;
      }

      // Reduced motion: the sim is fast-forwarded synchronously before
      // anything is painted, so it reads as already settled rather than as
      // a skipped animation.
      const instant = reducedMotion;

      // Keyed by id, since spawnBody is called in manifest order but the
      // cursor walks fall order. Populated just before the spawn loop, once
      // currentRenderInfo and scale are real.
      const spawnYById = new Map<string, number>();
      /** Clearance above the browser window's top edge for the first item's
       * spawn point, guaranteeing a genuinely off-page start. */
      const OFF_VIEWPORT_LEAD = 80;
      function computeSpawnYById() {
        spawnYById.clear();
        // On a short viewport SPAWN_LEAD is already past the viewport top
        // and wins; on a tall one, where .columns centres the stage well
        // down the page, containerTop dominates.
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
        const spawnAngle = ((item.rotate ?? 0) * Math.PI) / 180;
        const body = createBodyForItem(item, info, targetX, spawnY, spawnAngle);
        bodyIdToItemId.set(body.id, item.id);
        physicsItems.push({ id: item.id, body, halfWidth: info.divW / 2, halfHeight: info.divH / 2 });
        Composite.add(world, body);
      }

      // Item divs are pointer-events:none, so a press inside the jar lands
      // on the plain <img> underneath. draggable={false} plus this block
      // stop the browser starting a native image drag-ghost, which would
      // hijack the pointer and can leave an item glued to the cursor: a
      // native drag never fires the mouseup that would end ours.
      container.addEventListener("dragstart", (e) => e.preventDefault());

      // Front-most item whose rendered rectangle — not its much smaller
      // collision body — contains (x, y), then a per-pixel alpha check.
      // Rotating dx/dy by -angle gives the offset in the body's unrotated
      // local frame, which both the rectangle test and the drag
      // constraint's pointB need.
      //
      // The rectangle alone isn't enough: for a thin or irregular
      // silhouette, much of it is empty space that visually belongs to
      // whatever is stacked underneath, so a click there should fall
      // through rather than being won by the transparent item on top.
      function pickBodyAt(x: number, y: number): PhysicsItem | null {
        let best: PhysicsItem | null = null;
        let bestZ = -Infinity;
        for (const pi of physicsItems) {
          const info = currentRenderInfo[pi.id];
          if (!info) continue;
          const { body } = pi;
          // Prefer the painted pose over live physics state; see
          // renderedPose.
          const pose = renderedPose.get(pi.id);
          const posX = pose ? pose.x : body.position.x;
          const posY = pose ? pose.y : body.position.y;
          const angle = pose ? pose.angle : body.angle;
          const dx = x - posX;
          const dy = y - posY;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const localX = dx * cosA + dy * sinA;
          const localY = -dx * sinA + dy * cosA;

          const bbox = bboxes[pi.id];
          const click = clickMasks[pi.id];
          if (bbox && click && click.mask.length > 0) {
            // Maps a rendered-space offset back into the mask's pixel-index
            // space. Same ratio computeRenderInfo uses for ringPad.
            const pixelScale = info.divW / bbox.bboxW;
            const padPx = click.padR * pixelScale;
            if (Math.abs(localX) > info.divW / 2 + padPx || Math.abs(localY) > info.divH / 2 + padPx) continue;
            const px = Math.floor((localX + info.divW / 2) / pixelScale) + click.padR;
            const py = Math.floor((localY + info.divH / 2) / pixelScale) + click.padR;
            if (px < 0 || py < 0 || px >= click.width || py >= click.height) continue;
            const alpha = click.mask[py * click.width + px];
            if (alpha <= ALPHA_THRESHOLD) continue;
          } else if (Math.abs(localX) > info.divW / 2 || Math.abs(localY) > info.divH / 2) {
            continue;
          }

          const z = zIndexRef.current.get(pi.id) ?? 0;
          if (z > bestZ) {
            bestZ = z;
            best = pi;
          }
        }
        return best;
      }

      // Set on document.body, not container: CSS cursor only paints for the
      // element the OS considers hovered, and an item can now rest well
      // outside the jar's box. Deduped so a fast mousemove burst isn't
      // writing to the DOM every event.
      let currentCursorStyle = "";
      const setCursor = (style: string) => {
        if (currentCursorStyle === style) return;
        currentCursorStyle = style;
        document.body.style.cursor = style;
      };
      const updateHoverCursor = (x: number, y: number) => {
        if (dragConstraint) return; // already dragging — "grabbing" owns the cursor until release
        setCursor(pickBodyAt(x, y) ? "grab" : "");
      };

      // The constraint grabs the body wherever the cursor clicked, so a
      // stiff pull from an off-centre point is a torque, and a jerky drag
      // can spin an item wildly. MAX_ANGULAR won't catch it, since that
      // clamp runs once per tick and a single tick's constraint force can
      // already be large. Inertia is set to Infinity for the duration of
      // the drag instead, and restored in endDrag.
      let dragConstraint: Matter.Constraint | null = null;
      let dragBody: Matter.Body | null = null;
      let dragOriginalInertia = 0;

      /** Returns whether a body was actually grabbed. Callers use this to
       * decide whether to preventDefault the press, so an empty-handed one
       * leaves links, buttons and text selection alone. */
      function beginDrag(x: number, y: number): boolean {
        const target = pickBodyAt(x, y);
        if (!target) return false;
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
        // A drag can carry the cursor anywhere on the page while held, so
        // suppress selection page-wide for the duration, restored in endDrag.
        document.body.style.userSelect = "none";
        return true;
      }

      function endDrag() {
        if (!dragConstraint) return;
        Composite.remove(world, dragConstraint);
        if (dragBody) Body.setInertia(dragBody, dragOriginalInertia);
        dragConstraint = null;
        dragBody = null;
        setCursor("");
        document.body.style.userSelect = "";
        const c = cursorRef.current;
        if (c) updateHoverCursor(c.x, c.y);
      }

      // Window-scoped so a release is caught wherever it lands: an item can
      // be dragged well outside the jar's box now.
      const forceReleaseDrag = () => endDrag();
      window.addEventListener("mouseup", forceReleaseDrag);
      window.addEventListener("touchend", forceReleaseDrag);
      window.addEventListener("touchcancel", forceReleaseDrag);
      cleanupFns.push(() => {
        window.removeEventListener("mouseup", forceReleaseDrag);
        window.removeEventListener("touchend", forceReleaseDrag);
        window.removeEventListener("touchcancel", forceReleaseDrag);
        // In case the component unmounts mid-drag, so the page isn't left
        // unselectable or stuck showing a grab/grabbing cursor.
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      });

      // Pointer position in container-local px, tracked on window so it
      // stays current wherever the cursor is: needed both to keep dragging
      // an item once it's out of the jar and to pick one up again from
      // where it landed. Also drives the rustle force, which is what
      // reducedMotion suppresses — tracking itself always runs, since
      // dragging still works there.
      const cursorRef = { current: null as { x: number; y: number; prevX: number; prevY: number } | null };
      // Cached rather than measured per mousemove (a layout read on every
      // event); recomputed on scroll/resize instead, when it can change.
      let stageRect = container.getBoundingClientRect();
      const refreshStageRect = () => {
        stageRect = container.getBoundingClientRect();
      };
      window.addEventListener("scroll", refreshStageRect, { passive: true, capture: true });
      window.addEventListener("resize", refreshStageRect);
      cleanupFns.push(() => {
        window.removeEventListener("scroll", refreshStageRect, { capture: true });
        window.removeEventListener("resize", refreshStageRect);
      });

      const trackPointer = (clientX: number, clientY: number) => {
        const x = clientX - stageRect.left;
        const y = clientY - stageRect.top;
        const prev = cursorRef.current;
        cursorRef.current = { x, y, prevX: prev ? prev.x : x, prevY: prev ? prev.y : y };
        // Deliberately not gated on the point being inside the stage box:
        // an item can rest well outside it, and hovering it there should
        // still show the grab cursor.
        updateHoverCursor(x, y);
      };
      const handleWindowMouseMove = (e: MouseEvent) => trackPointer(e.clientX, e.clientY);
      const handleWindowTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (t) trackPointer(t.clientX, t.clientY);
      };
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("touchmove", handleWindowTouchMove, { passive: true });
      cleanupFns.push(() => {
        window.removeEventListener("mousemove", handleWindowMouseMove);
        window.removeEventListener("touchmove", handleWindowTouchMove);
      });

      // Window-scoped, not container-scoped: a dragged-out item can rest
      // anywhere on the page, and a container-scoped listener never sees a
      // press that starts out there, which is what made re-grabbing one
      // impossible.
      const handleWindowMouseDown = (e: MouseEvent) => {
        if (e.button !== 0 || dragConstraint) return;
        trackPointer(e.clientX, e.clientY);
        const p = cursorRef.current;
        if (p && beginDrag(p.x, p.y)) e.preventDefault();
      };
      const handleWindowTouchStart = (e: TouchEvent) => {
        if (dragConstraint) return;
        const t = e.touches[0];
        if (!t) return;
        trackPointer(t.clientX, t.clientY);
        const p = cursorRef.current;
        if (p && beginDrag(p.x, p.y)) e.preventDefault();
      };
      window.addEventListener("mousedown", handleWindowMouseDown);
      // Non-passive: beginDrag's preventDefault above (when it fires) needs
      // to actually stop the touch's default scroll/selection behaviour.
      window.addEventListener("touchstart", handleWindowTouchStart, { passive: false });
      cleanupFns.push(() => {
        window.removeEventListener("mousedown", handleWindowMouseDown);
        window.removeEventListener("touchstart", handleWindowTouchStart);
      });

      // One fixed-timestep tick: Engine.update, column pinning, speed
      // clamps, hard containment and rustle. Called both by the rAF loop and
      // — under reduced motion — synchronously before the first paint, so
      // both paths behave identically. Advances state only; painting is the
      // caller's job (see renderPhysicsItems).
      function stepPhysics() {
        // Drag start/end are event-driven, not polled here. This only keeps
        // the constraint's target current during an active drag.
        if (dragConstraint && cursorRef.current) {
          dragConstraint.pointA = { x: cursorRef.current.x, y: cursorRef.current.y };
        }

        Engine.update(engine, STEP_MS);

        for (const { id, body } of physicsItems) {
          // Column pinning: until an item touches down, hold its x to its
          // own lane every tick, so it enters the jar rather than drifting
          // off wherever it first grazes something. Once landed the pin
          // drops for good and pure physics takes over.
          if (!hasEnteredJar.get(id)) {
            const targetX = (TARGET_X_FRACTION[id] ?? 0.5) * width;
            // Nudge with a capped velocity rather than teleporting to
            // targetX. A hard per-tick setPosition fights the solver
            // whenever a pinned body is touching something: the solver
            // resolves the overlap sideways, the next tick snaps it back,
            // and the loop reads as visible shaking.
            const dx = targetX - body.position.x;
            const pinSpeedCap = PIN_CORRECT_SPEED * scale;
            const rawTargetPinVx = Math.max(-pinSpeedCap, Math.min(pinSpeedCap, dx * PIN_CORRECT_GAIN));
            const prevPinVx = pinVxById.get(id) ?? 0;
            const pinVx = prevPinVx + (rawTargetPinVx - prevPinVx) * PIN_CORRECT_SMOOTHING;
            pinVxById.set(id, pinVx);
            Body.setVelocity(body, { x: pinVx, y: body.velocity.y });
            // Held upright while pinned. The neck has margin for each
            // item's axis-aligned footprint, but a body that picked up spin
            // from a glancing graze presents a wider diagonal one and can
            // wedge at an angle, unable to slide free because it's pinned.
            if (body.angularVelocity !== 0) Body.setAngularVelocity(body, 0);
            // A body spawned far above the frame spends a while at low
            // speed before gravity builds up, which is enough for Matter's
            // sleep counter to complete and leave it hanging mid-drop.
            // Normal sleeping resumes once it enters the jar.
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

        // Hard containment, on top of the wall bodies. The mouth is
        // deliberately not clamped — that clamp was the old lid, and
        // removing it is what lets an item be pulled out. Left/right/floor
        // apply only to a body actually inside the jar; one beside the jar
        // is handled by the respawn below, which shares this same test.
        if (wallBodies.length > 0) {
          let leftBound = Infinity;
          let rightBound = -Infinity;
          let floorBound = -Infinity;
          for (const w of wallBodies) {
            leftBound = Math.min(leftBound, w.bounds.min.x);
            rightBound = Math.max(rightBound, w.bounds.max.x);
            floorBound = Math.max(floorBound, w.bounds.max.y);
          }
          // Exactly where the drawn rim is (jar-shape.ts's mouth edge
          // points), not a separate invented boundary.
          const mouthY = JAR_INTERIOR_POINTS[0].y * height;

          for (const { id, body, halfWidth, halfHeight } of physicsItems) {
            const hw = halfWidth * BODY_SCALE;
            const hh = halfHeight * BODY_SCALE;
            let { x, y } = body.position;

            // Beside the jar, i.e. lifted out and carried off. A body in the
            // pile always has its centre inside these bounds.
            if (x <= leftBound || x >= rightBound) {
              if (y < respawnY) continue;
              // Let go first, or the constraint would haul it back down.
              if (dragBody === body) endDrag();
              const item = itemsById.get(id);
              Body.setPosition(body, {
                x: (TARGET_X_FRACTION[id] ?? 0.5) * width,
                // Above the frozen initial viewport top, not the load-in
                // point or the live scroll position: scrolling shouldn't
                // change where this lands.
                y: -containerTop - hh - RESPAWN_LEAD_PX * scale,
              });
              Body.setAngle(body, ((item?.rotate ?? 0) * Math.PI) / 180);
              Body.setVelocity(body, { x: 0, y: 0 });
              Body.setAngularVelocity(body, 0);
              Sleeping.set(body, false);
              hasEnteredJar.set(id, false);
              landedIds.delete(id);
              pinVxById.set(id, 0);
              teleportedIds.add(id);
              continue;
            }

            // Above the rim: open air, entering or exiting the jar.
            if (y < mouthY) continue;

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
            if (clamped) {
              Body.setPosition(body, { x, y });
              Body.setVelocity(body, { x: vx, y: vy });
            }
          }
        }

        // cursorRef is populated even under reduced motion (dragging needs
        // it), so gate the rustle force itself here instead.
        const cursor = reducedMotion ? null : cursorRef.current;
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
            // A still-pinned item would just have the push cancelled by the
            // pin next tick.
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
      respawnY = window.innerHeight - containerTop;
      scale = width / REFERENCE_WIDTH;
      buildWalls(width, height, scale);
      rebuildTextPlatforms();
      currentRenderInfo = computeRenderInfo(scale);
      computeSpawnYById();
      // Every body is dynamic and falling from the moment it spawns; the
      // arrival stagger comes from the real vertical gaps in spawnYById,
      // not a release timer.
      for (const item of items) spawnBody(item);

      // --- deterministic settle: always precompute synchronously --------
      // Stepping the engine live off rAF isn't reproducible even with a
      // fixed timestep: sub-STEP_MS differences in when the first callback
      // lands (downstream of real decode and layout timing) shift which
      // tick two bodies first touch, and with this many colliding bodies
      // that cascades into a visibly different pile. MAX_STEPS_PER_FRAME
      // doesn't help, since that's about dropped time, not phase.
      //
      // So real time is removed from the physics entirely: the whole fall
      // runs synchronously here, then plays back as a recording (see
      // replayTick). 1200 ticks is 20 sim-seconds of headroom, but the loop
      // bails as soon as every body is asleep.
      const history: { x: number; y: number; angle: number }[][] = [];
      for (let i = 0; i < 1200; i++) {
        stepPhysics();
        if (!instant) {
          history.push(physicsItems.map(({ body }) => ({ x: body.position.x, y: body.position.y, angle: body.angle })));
        }
        if (physicsItems.every(({ body }) => body.isSleeping)) break;
      }
      // Force-mark entered, so anything that never crossed the mouth line
      // during precompute isn't pinned to its lane forever.
      for (const { id } of physicsItems) {
        hasEnteredJar.set(id, true);
      }
      // Reduced motion has no replay to paint the first frame, so paint the
      // settled pile now to avoid a default-position frame before the live
      // loop's first tick. Every other path lets replay's first frame do it.
      if (instant) {
        for (const { id, body, halfWidth, halfHeight } of physicsItems) {
          const el = itemElsRef.current.get(id);
          if (!el) continue;
          el.style.transform = `translate3d(${body.position.x - halfWidth}px, ${body.position.y - halfHeight}px, 0) rotate(${body.angle}rad)`;
          renderedPose.set(id, { x: body.position.x, y: body.position.y, angle: body.angle });
        }
      }

      // --- resize: rebuild walls + every body at the new scale ----------
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      function rebuildForResize() {
        if (!container) return;
        const r = measure();
        if (r.w <= 0 || r.h <= 0) return;
        // ResizeObserver fires once on the first observe() per spec, even
        // though nothing resized. Without this guard that spurious callback
        // destroys and recreates every body, which reads as a visible pop
        // shortly after mount. A real resize is easily bigger than 1px.
        if (Math.abs(r.w - width) < 1 && Math.abs(r.h - height) < 1) return;

        // Every body is recreated below, so end any drag first. Otherwise
        // dragConstraint points at a body no longer in the world and the
        // item silently stops following the cursor with no visible release.
        endDrag();

        // Fractions of the old box, so this works for still-off-screen
        // bodies above the jar too: a negative y fraction scales the same
        // way a positive one does.
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
        // A real resize does change layout, unlike a scroll, so the frozen
        // respawn reference is refreshed here. See respawnY.
        containerTop = r.top;
        respawnY = window.innerHeight - containerTop;
        scale = width / REFERENCE_WIDTH;
        buildWalls(width, height, scale);
        currentRenderInfo = computeRenderInfo(scale);
        setRenderInfo({ ...currentRenderInfo });
        // A container-only resize doesn't fire the window `resize` event.
        refreshStageRect();
        // The hero text reflows at the new viewport size, so its platform
        // bodies need rebuilding alongside the walls.
        rebuildTextPlatforms();

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
        // hasEnteredJar is keyed by item id and untouched, so nothing that
        // already entered the jar gets re-pinned after a resize.
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
      // Started either immediately (reduced motion, nothing to replay) or
      // once the recording has played back. Either way the live world is
      // already at the settled state, since precompute advanced the real
      // engine, so there's no state to hand off.
      let rafId = 0;
      function startLiveLoop() {
        let accumulator = 0;
        let lastTime = performance.now();
        // Physics advances in fixed STEP_MS increments, but painting happens
        // every rAF frame, interpolated between the pose before the last
        // tick (`prev`) and the body's current pose. Painting only on ticks
        // instead reads as judder above 60Hz: most frames repaint an
        // unchanged transform, then one jumps a whole tick of motion.
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
            renderedPose.set(id, { x, y, angle });
          }
        }
        function rafTick(now: number) {
          accumulator += now - lastTime;
          lastTime = now;
          accumulator = Math.min(accumulator, STEP_MS * MAX_STEPS_PER_FRAME);
          while (accumulator >= STEP_MS) {
            // Snapshot before stepping: this is the endpoint interpolation
            // renders from.
            prev = physicsItems.map(({ body }) => ({ x: body.position.x, y: body.position.y, angle: body.angle }));
            stepPhysics();
            // Skip interpolating across a respawn teleport (see teleportedIds).
            if (teleportedIds.size > 0) {
              for (let i = 0; i < physicsItems.length; i++) {
                if (!teleportedIds.has(physicsItems[i].id)) continue;
                const b = physicsItems[i].body;
                prev[i] = { x: b.position.x, y: b.position.y, angle: b.angle };
              }
              teleportedIds.clear();
            }
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
          if (debugPerf) {
            console.assert(
              isRunning === shouldRun,
              "[jar][debug=perf] runner state didn't converge to shouldRun",
              { shouldRun, isRunning, isIntersecting, hidden: document.hidden },
            );
            console.log(
              `[jar][debug=perf] physics runner ${isRunning ? "RUNNING" : "STOPPED"} ` +
                `(intersecting=${isIntersecting}, tabHidden=${document.hidden})`,
            );
          }
        };

        const intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            isIntersecting = entry.isIntersecting;
            updateRunning();
          },
          { threshold: 0 },
        );
        // TS can't carry the `if (!container) return` narrowing into a
        // nested function declaration, only into arrow functions.
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
      // Items dropping into a still-transparent jar read as broken.
      // JAR_PHYSICS_DELAY_MS is derived from the shared heroLoadIn fade's
      // own duration (motion-timing.ts). Timed against setupStartTime
      // rather than a fresh clock read, so the work already done above
      // counts against the delay instead of stacking on top of it. Skipped
      // under reduced motion, which has no fade and no fall to delay.
      if (!instant) {
        const elapsed = performance.now() - setupStartTime;
        const remaining = JAR_PHYSICS_DELAY_MS - elapsed;
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }
        if (cancelled) return;
      }

      // --- replay: play the precomputed history back in real time -------
      // Same accumulator pattern as the live loop, but reading pre-baked
      // positions instead of stepping the engine, so a slow frame just
      // shows a later frame rather than a different physics outcome.
      // physicsItems' order is stable between recording and playback, so
      // history[n][i] lines up with physicsItems[i].
      //
      // Engine.update only runs from the live loop, so a press during
      // replay can grab a body but nothing would follow the cursor until
      // replay finished. Cutting replay short on interaction fixes that:
      // the bodies are already at the poses replay was tweening toward, so
      // it's an unnoticeable snap.
      let replayRafId = 0;
      let replayInProgress = false;
      const skipReplayOnInteraction = () => {
        if (!replayInProgress) return;
        replayInProgress = false;
        cancelAnimationFrame(replayRafId);
        startLiveLoop();
      };
      container.addEventListener("mousedown", skipReplayOnInteraction);
      container.addEventListener("touchstart", skipReplayOnInteraction, { passive: true });
      cleanupFns.push(() => {
        container.removeEventListener("mousedown", skipReplayOnInteraction);
        container.removeEventListener("touchstart", skipReplayOnInteraction);
      });

      if (instant || history.length === 0) {
        startLiveLoop();
      } else {
        replayInProgress = true;
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
          // Same interpolation as the live loop, but simpler: the next
          // frame already exists, so there's no lookahead risk.
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
              renderedPose.set(id, { x, y, angle });
            }
          }
          if (replayIndex >= history.length - 1) {
            replayInProgress = false;
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
      // Fire-and-forget, after the fall is already underway: rings aren't
      // needed to spawn a body or paint an item, only the bbox is. Yields
      // between items so this synchronous canvas work can't stutter the
      // fall. A ring arriving a beat after its image is already handled by
      // JarItem.tsx's useDropShadowFallback.
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
