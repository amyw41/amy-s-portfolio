"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Matter from "matter-js";
import { JAR_INTERIOR_POINTS, JAR_WALL_THICKNESS, computeJarWallRects, createJarWallBodies, type JarWallRect } from "./jar-shape";
import { computeAlphaBBox, type AlphaBBox } from "./alpha-bbox";
import { PLACEMENT_ORDER, LAYER_ORDER, TARGET_X_FRACTION } from "./jar-layout";
import type { JarItemDef } from "./items.manifest";

const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Sleeping } = Matter;

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
/** Caps how many fixed steps a single real frame can run to catch up (e.g.
 * after the tab was backgrounded and the rAF gap was seconds long) — without
 * this, a long gap would otherwise demand thousands of steps in one go and
 * visibly stall the page. The sim just resumes a little behind real time
 * instead; it doesn't affect the eventual settled pile. */
const MAX_STEPS_PER_FRAME = 5;

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
 * / restitution / frictionAir instead. */
const BODY_SCALE = 0.38;

/** Every item is released into its own column this many ms after the
 * previous one, in PLACEMENT_ORDER. Timed rather than staggered by spawn
 * height, so rhythm and fall speed can be tuned independently — and so the
 * release schedule can be driven off the deterministic sim clock instead of
 * wall-clock setTimeout jitter (see the `simTime` bookkeeping below). Short
 * enough that several items are airborne at once, so a later one lands on
 * a pile that's still visibly settling rather than arriving one at a time
 * onto something already static. */
const RELEASE_INTERVAL_MS = 90;

/** Collision group for every item that hasn't entered the jar yet (see
 * hasEnteredJar / PIN_RELEASE_Y_FRACTION below). Matter treats bodies
 * sharing the same *negative* group as never colliding with each other,
 * regardless of category/mask — which is what column-pinned bodies need:
 * while still pinned, a body's x is rigidly forced back to its own lane
 * every tick, so it can never actually move away from a collision. Two
 * still-pinned bodies in nearby lanes would otherwise permanently jam each
 * other (the solver tries to push them apart, the pin immediately undoes
 * it, repeat forever). The moment a body's pin releases it's reset to the
 * default group (0) — collides normally with everything from then on,
 * including other items still above the jar, which is exactly what lets
 * the pile tumble and jostle instead of stacking in silence. */
const FALLING_GROUP = -1;

/** Report (once, per item) when a PNG carries more than 15% untrimmed
 * transparent padding, so it can be cleaned up at the source file. */
const PADDING_WARNING_THRESHOLD = 0.15;

/** How far above the frame each item spawns, as a multiple of the
 * container's own height: item n (0-based, in fall order) spawns at
 * -(SPAWN_BASE + n * SPAWN_STEP) * height. n=0 spawns half a jar-height
 * above the frame; later items spawn further still, so nothing pops into
 * existence inside the visible page — everything genuinely falls in from
 * off-screen. */
const SPAWN_BASE = 0.5;
const SPAWN_STEP = 0.12;

/** frictionAir while an item hasn't entered the jar yet — uniform across
 * every item, overriding whatever it's individually authored to in
 * items.manifest.ts (0.008–0.045). That per-item value exists to give each
 * object its own settle character (a light patch jostles, a heavy bottle
 * thuds), but it also acts as an air-drag terminal-velocity cap during the
 * fall itself — at 0.03 vs 0.008 that's a dramatically different fall
 * speed for no reason a viewer would read as intentional. Forcing this one
 * low value while still above the mouth decouples "how fast it falls" from
 * "how it settles": every item drops at the same brisk, consistent rate,
 * then the instant it enters the jar (see hasEnteredJar in stepPhysics)
 * its authored frictionAir is restored and its own character takes over. */
const FALL_FRICTION_AIR = 0.001;

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
}

interface PhysicsItem {
  id: string;
  body: Matter.Body;
  halfWidth: number;
  halfHeight: number;
}

function preloadImage(src: string): Promise<AlphaBBox> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      try {
        resolve(computeAlphaBBox(img));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/** Where the column pin releases, as a fraction of container height. An
 * item is pinned to its lane for as long as its centre is above this line;
 * the instant it crosses below, the pin drops permanently and it's free to
 * tumble under pure physics — see hasEnteredJar in the hook below.
 *
 * Deliberately well below the jar's actual mouth (JAR_INTERIOR_POINTS[0].y,
 * 0.06) rather than equal to it: releasing right at the mouth used to hand
 * an item to pure physics while it was still up in the neck — and the
 * neck's own shoulder (see jar-shape.ts's JAR_INTERIOR_POINTS) narrows in
 * before the body widens back out again, so a newly-freed item in an outer
 * lane would immediately graze that taper on its way down and get
 * deflected inward, reading as "items from the sides rolling into the
 * center" before they'd ever reached the pile. Held at 0.36 — just past
 * where the body widens back out (y:0.38 in jar-shape.ts) — an item stays
 * column-locked all the way through the narrow part and is only released
 * once it's already inside the wide body, with nothing left to graze. */
const PIN_RELEASE_Y_FRACTION = 0.36;

export function useJarPhysics(containerRef: RefObject<HTMLDivElement | null>, items: JarItemDef[]) {
  const [ready, setReady] = useState(false);
  const [renderInfo, setRenderInfo] = useState<Record<string, RenderInfo>>({});
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

      // Preload every sprite before starting the sim, and compute each
      // one's alpha bounding box — sizing and physics geometry come from
      // that bbox, not the file's own pixel dimensions (see alpha-bbox.ts).
      const bboxEntries = await Promise.all(
        items.map(async (item) => [item.id, await preloadImage(item.src)] as const),
      );
      if (cancelled) return;
      const bboxes = Object.fromEntries(bboxEntries) as Record<string, AlphaBBox>;

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

      const engine = Engine.create({
        enableSleeping: true,
        // Was 3.0 (3x Matter's own default of 1) — items covered the whole
        // fall in well under half a second, closer to being fired down
        // than dropped. Halved to 1.5: still brisk enough that the
        // staggered release (see RELEASE_INTERVAL_MS) reads as a lively
        // tumble in rather than a slow drift, but with enough hang time in
        // the air to actually look like gravity.
        gravity: { x: 0, y: 1.5 },
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
      let wallBodies: Matter.Body[] = [];
      let pinReleaseYPx = 0;

      const physicsItems: PhysicsItem[] = [];
      const bodyIdToItemId = new Map<number, string>();
      // True once an item's centre has crossed below the mouth line —
      // a one-way latch (see stepPhysics): once true, never re-pinned,
      // even if it later bounces back above that y for a moment.
      const hasEnteredJar = new Map<string, boolean>(items.map((item) => [item.id, false]));
      const fallIndexById = new Map<string, number>(orderedIds.map((id, i) => [id, i]));
      const releasedIds = new Set<string>();
      const releaseSimTime = new Map<string, number>(orderedIds.map((id, i) => [id, i * RELEASE_INTERVAL_MS]));
      let simTime = 0;

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
          info[item.id] = {
            divW: bbox.bboxW * pixelScale,
            divH: bbox.bboxH * pixelScale,
            imgW: bbox.naturalWidth * pixelScale,
            imgH: bbox.naturalHeight * pixelScale,
            imgLeft: -bbox.bboxX * pixelScale,
            imgTop: -bbox.bboxY * pixelScale,
          };
        }
        return info;
      }

      let currentRenderInfo = computeRenderInfo(1);

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
          // Starts in the "falling" group (never collides with other
          // not-yet-entered bodies) — the hasEnteredJar check in
          // stepPhysics resets this to 0 (normal collision) the moment the
          // body crosses the mouth line.
          collisionFilter: { group: FALLING_GROUP },
          chamfer: { radius: Math.min(bodyW, bodyH) * 0.12 },
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

      // instant === reduced motion: every body starts dynamic, already
      // falling, with no release stagger — the whole sim is then fast-
      // forwarded synchronously (see below) before anything is ever
      // painted, so it reads as "already settled", not as a skipped
      // animation.
      const instant = reducedMotion;

      function spawnBody(item: JarItemDef) {
        const info = currentRenderInfo[item.id];
        const targetX = (TARGET_X_FRACTION[item.id] ?? 0.5) * width;
        // Item n (0-based, in fall order) spawns n*SPAWN_STEP jar-heights
        // further above the frame than the first — see SPAWN_BASE/STEP.
        // Comfortably off-screen for every item, not just the last few.
        const n = fallIndexById.get(item.id) ?? 0;
        const spawnY = -(SPAWN_BASE + n * SPAWN_STEP) * height;
        const body = createBodyForItem(item, info, targetX, spawnY, 0);
        if (!instant) Body.setStatic(body, true); // see createBodyForItem's dynamic-then-freeze note below
        bodyIdToItemId.set(body.id, item.id);
        physicsItems.push({ id: item.id, body, halfWidth: info.divW / 2, halfHeight: info.divH / 2 });
        Composite.add(world, body);
        if (instant) releasedIds.add(item.id);
      }

      // Mouse / touch drag. Matter.Mouse hit-tests physics bodies directly
      // (not DOM elements), so item divs stay pointer-events:none and this
      // one listener set on the stage container is all drag needs. Because
      // item divs are pointer-events:none, a mousedown inside the jar's
      // silhouette actually lands on the plain <img> underneath (jar.png,
      // or an item's own <img> once painted) — both already have
      // draggable={false} (see JarStage.tsx / JarItem.tsx), but that alone
      // doesn't reliably stop every browser from still starting a native
      // image drag-ghost on a fast/diagonal drag gesture. When that native
      // drag wins the race against Matter.Mouse's own listener, the OS
      // takes over the gesture: the item visibly "drags the image" instead
      // of the physics body (bug 1), and because the browser is now
      // driving a native drag-and-drop instead of firing ordinary
      // mouse/touch events, the mouseup that would normally end the Matter
      // drag can go missing entirely, leaving mouseConstraint stuck
      // "holding" a body forever (bug 2 — release does nothing). Blocking
      // dragstart here stops the native gesture from ever starting, so
      // Matter.Mouse's own mousedown/mousemove/mouseup always wins.
      container.addEventListener("dragstart", (e) => e.preventDefault());

      const mouse = Mouse.create(container);
      mouse.pixelRatio = window.devicePixelRatio || 1;
      const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.2, damping: 0.1, render: { visible: false } },
      });
      Composite.add(world, mouseConstraint);

      // The mouse constraint grabs a body wherever the cursor actually
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
      // your hand. Keyed by body id so each drag restores its own item's
      // real inertia (its lockRotation-scaled value if it has one, its
      // plain rectangle inertia otherwise) rather than some other item's.
      const preDragInertia = new Map<number, number>();

      Events.on(mouseConstraint, "startdrag", (e: Matter.IEvent<Matter.MouseConstraint> & { body?: Matter.Body }) => {
        const body = e.body;
        if (!body) return;
        const id = bodyIdToItemId.get(body.id);
        if (id) bringToFront(id);
        preDragInertia.set(body.id, body.inertia);
        Body.setInertia(body, Infinity);
      });

      const restoreDragInertia = (body: Matter.Body | null | undefined) => {
        if (!body) return;
        const original = preDragInertia.get(body.id);
        if (original !== undefined) {
          Body.setInertia(body, original);
          preDragInertia.delete(body.id);
        }
      };

      Events.on(mouseConstraint, "enddrag", (e: Matter.IEvent<Matter.MouseConstraint> & { body?: Matter.Body }) => {
        restoreDragInertia(e.body);
      });

      // Belt-and-braces for the "doesn't drop" half of the bug above (and
      // for the ordinary case of releasing the mouse/finger past the
      // stage's own edge while dragging an item near the jar's rim):
      // Matter.Mouse's mouseup/touchend listener is scoped to `container`,
      // so a release that lands outside it (native drag-ghost swallowing
      // the event, or the cursor having genuinely left the element first)
      // never reaches Matter, and mouseConstraint keeps its body attached
      // indefinitely — the item stays glued to wherever the mouse last was.
      // A window-level listener catches every release regardless of where
      // it lands and force-clears the constraint's drag state. Also
      // restores the dragged body's real inertia directly (rather than
      // relying on "enddrag" to fire) since this bypasses Matter's own
      // release path entirely.
      const forceReleaseDrag = () => {
        if (mouseConstraint.body) {
          restoreDragInertia(mouseConstraint.body);
          mouseConstraint.body = null as unknown as Matter.Body;
        }
        mouse.button = -1;
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
      };
      const handleMouseLeave = () => {
        cursorRef.current = null;
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
        if (!instant) {
          simTime += STEP_MS;
          for (const id of orderedIds) {
            if (releasedIds.has(id)) continue;
            const at = releaseSimTime.get(id) ?? 0;
            if (simTime >= at) {
              releasedIds.add(id);
              const pi = physicsItems.find((p) => p.id === id);
              if (pi) Body.setStatic(pi.body, false);
            }
          }
        }

        Engine.update(engine, STEP_MS);

        for (const { id, body } of physicsItems) {
          // Column pinning: while an item's centre hasn't yet crossed the
          // jar's mouth line, force its x back to its own lane and zero out
          // any sideways velocity every tick. This is what guarantees every
          // item actually enters the jar rather than converging on wherever
          // it first grazes something, or drifting off to the side while
          // still well above the opening. The instant the centre crosses
          // below the line, the pin drops for good (never re-checked) and
          // the item falls under pure physics from then on — free to tip,
          // roll and collide with whatever's already in the jar.
          if (!hasEnteredJar.get(id)) {
            const targetX = (TARGET_X_FRACTION[id] ?? 0.5) * width;
            Body.setPosition(body, { x: targetX, y: body.position.y });
            Body.setVelocity(body, { x: 0, y: body.velocity.y });
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

            // Fall speed decoupled from settle character — see
            // FALL_FRICTION_AIR. Every not-yet-entered body gets forced to
            // the same low value every tick (its authored value is
            // restored the instant it enters, right below).
            body.frictionAir = FALL_FRICTION_AIR;

            if (body.position.y >= pinReleaseYPx) {
              hasEnteredJar.set(id, true);
              // Out of the never-collide-with-other-not-yet-entered group
              // (see FALLING_GROUP) — from here on it collides normally
              // with everything, including other items still above the
              // jar, which is exactly what makes the pile tumble and
              // jostle instead of quietly stacking.
              body.collisionFilter.group = 0;
              body.frictionAir = itemsById.get(id)?.frictionAir ?? body.frictionAir;
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
        // Only left/right/bottom are clamped (never top): items legitimately
        // start above the jar, before they've fallen in.
        if (wallBodies.length > 0) {
          let leftBound = Infinity;
          let rightBound = -Infinity;
          let floorBound = -Infinity;
          for (const w of wallBodies) {
            leftBound = Math.min(leftBound, w.bounds.min.x);
            rightBound = Math.max(rightBound, w.bounds.max.x);
            floorBound = Math.max(floorBound, w.bounds.max.y);
          }
          for (const { body, halfWidth, halfHeight } of physicsItems) {
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

        for (const { id, body, halfWidth, halfHeight } of physicsItems) {
          const el = itemElsRef.current.get(id);
          if (!el) continue;
          el.style.transform = `translate3d(${body.position.x - halfWidth}px, ${body.position.y - halfHeight}px, 0) rotate(${body.angle}rad)`;
        }
      }

      function measure() {
        const rect = container!.getBoundingClientRect();
        return { w: rect.width, h: rect.height };
      }

      // Bodies are only ever created once the container has actually been
      // measured — building them at some placeholder scale first and
      // rescaling in place afterward would leave their geometry (not just
      // their position) wrong, since a body's size is fixed at construction.
      const initial = measure();
      width = initial.w;
      height = initial.h;
      scale = width / REFERENCE_WIDTH;
      buildWalls(width, height, scale);
      currentRenderInfo = computeRenderInfo(scale);
      // Built dynamic (isStatic:false, the constructor default) always, so
      // mass/inertia get computed normally from density × area — passing
      // isStatic:true straight into the constructor options skips that
      // computation entirely (mass stays null), which then produces NaN
      // position the moment the body is later flipped dynamic. Freezing via
      // Body.setStatic afterward (in spawnBody, above) avoids that.
      for (const item of items) spawnBody(item);

      if (instant) {
        // Fast-forward: step the exact same deterministic physics many
        // times synchronously, with no rAF and nothing painted yet, until
        // the pile has settled. Reduced motion then sees the finished pile
        // immediately with no visible drop. 1200 ticks (20 sim-seconds) —
        // more headroom than the entrance needs even for the furthest
        // (deepest-spawned) item, given the new off-screen spawn heights.
        for (let i = 0; i < 1200; i++) stepPhysics();
        for (const { id, body } of physicsItems) {
          hasEnteredJar.set(id, true);
          // Belt-and-braces: force every item marked entered even if one
          // never actually crossed the mouth line in the fast-forward
          // window (so it doesn't stay pinned, or stuck in the never-
          // collide-with-not-yet-entered group forever — see FALLING_GROUP).
          body.collisionFilter.group = 0;
        }
      }

      // --- resize: rebuild walls + every body at the new scale ----------
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      function rebuildForResize() {
        if (!container) return;
        const r = measure();
        if (r.w <= 0 || r.h <= 0) return;

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
          // createBodyForItem defaults every new body into FALLING_GROUP —
          // correct for a body that hasn't entered the jar yet, but one
          // that already has needs to come back out of it or it'd stop
          // colliding with whatever's still dropping into neighbouring
          // lanes after the rebuild.
          if (hasEnteredJar.get(snap.id)) body.collisionFilter.group = 0;
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
      let rafId = 0;
      let accumulator = 0;
      let lastTime = performance.now();
      function rafTick(now: number) {
        accumulator += now - lastTime;
        lastTime = now;
        accumulator = Math.min(accumulator, STEP_MS * MAX_STEPS_PER_FRAME);
        while (accumulator >= STEP_MS) {
          stepPhysics();
          accumulator -= STEP_MS;
        }
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
      intersectionObserver.observe(container);
      cleanupFns.push(() => intersectionObserver.disconnect());

      const handleVisibilityChange = () => updateRunning();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      cleanupFns.push(() => document.removeEventListener("visibilitychange", handleVisibilityChange));

      updateRunning();

      cleanupFns.push(() => {
        cancelAnimationFrame(rafId);
        Composite.clear(world, false);
        Engine.clear(engine);
      });

      setRenderInfo(currentRenderInfo);
      setReady(true);
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
    registerItemEl,
    debugWalls,
    debugPhysicsEnabled,
  };
}
