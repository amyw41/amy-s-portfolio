// Shared Framer Motion transition constants — pulled out because the exact
// same literal object was independently copy-pasted across multiple files
// (confirmed via grep before extracting, not just "these look similar").
//
// FADE_IN_TRANSITION: every simple mount fade-in on the site (page
// transitions, the taskbar, case-study hero/TOC reveals, the extras
// gallery header) used this exact { duration: 0.45, ease: "easeOut" }
// object independently: PageTransition.tsx, Taskbar.tsx, CaseStudyKit.tsx
// (TableOfContents + CaseStudyHero), ExtrasCaseStudy.tsx.
//
// NOT the same family as Playground's own 0.35s fades (posterLayout.ts's
// own SLIDE_UP_TRANSITION) — that's a distinct, deliberately-tuned value
// for a distinct kind of animation (FLIP transitions between plate/collage
// layouts), not accidental duplication, so it's intentionally left as its
// own separate constant rather than merged into this one.
export const FADE_IN_TRANSITION = { duration: 0.45, ease: "easeOut" as const };

// ARC_SPRING: the wheel-rotation / item-placement / image-opacity spring
// used 3x identically in CategoryDetail.tsx.
export const ARC_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ---------- rebrand v2 timings (brief Part 4.3) ----------

// Hand-drawn look (brief Part 4.1). Every code-drawn line cycles through 3
// slightly different drawings BUZZ_FPS times a second (BuzzPath); the
// intro and the jar's cartoon moves update STOP_MOTION_FPS times a second.
// Both follow ?slow (BuzzPath reads it through the --slow custom property).
export const BUZZ_FPS = 10;
// Off for now (Amy will retune it later): every BuzzPath holds still on
// its first drawing. Flip back to true to bring the buzz back.
export const BUZZ_ENABLED = false;
export const STOP_MOTION_FPS = 12;

// Easing curves: landings and reveals; falling and exits; zooms and pulls.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN = [0.55, 0, 1, 0.45] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

// Project hover preview slide-up (step 6). A spring has no duration to
// scale, so ?slow doesn't touch it.
export const PREVIEW_SPRING = { type: "spring", stiffness: 220, damping: 26 } as const;

// Intro sidebar load-in and the work-mode grid sweep (steps 8 and 4),
// seconds between items. Run them through slowTransition() where used.
export const SIDEBAR_STAGGER = 0.07;
export const GRID_STAGGER = 0.04;

// Work-mode grid (Home/WorkGrid.tsx): each tile rises GRID_TILE_RISE_PX and
// scales up from GRID_TILE_SCALE over GRID_TILE_S, GRID_STAGGER apart.
// Leaving work mode, the heading and grid slide up WORK_EXIT_RISE_PX and
// fade out together over WORK_EXIT_S, then the jar shows. Filtering slides
// tiles to their new places over GRID_REORDER_S.
export const GRID_TILE_S = 0.3;
export const GRID_TILE_RISE_PX = 12;
export const GRID_TILE_SCALE = 0.97;
export const WORK_EXIT_S = 0.2;
export const WORK_EXIT_RISE_PX = 12;
export const GRID_REORDER_S = 0.35;

// Hovering a case study in the sidebar's Works list isolates it: its jar
// item rises JAR_LIFT_PX and scales to JAR_LIFT_SCALE over JAR_LIFT_IN_MS
// (soft ease-out), settling back over JAR_LIFT_OUT_MS (ease-in-out); nothing
// else in the jar changes. CSS transitions, so a hover
// that changes mid-way carries on from where it is, never snapping. In work
// mode its grid tile lifts TILE_LIFT_PX instead and the other tiles dim.
export const JAR_LIFT_PX = 12;
export const JAR_LIFT_SCALE = 1.04;
export const JAR_LIFT_IN_MS = 400;
export const JAR_LIFT_OUT_MS = 300;
export const TILE_LIFT_PX = 6;

// The jar / work toggle (Home/ModeToggle.tsx): the newly picked side is
// coloured in with crayon, stroke by stroke — each stroke draws on over
// CRAYON_STROKE_S, CRAYON_STAGGER_S after the last (~400ms in all) — while
// the old side's shading fades out over CRAYON_ERASE_S. Hovering the
// unpicked side draws CRAYON_HINT_STROKES faint strokes (CRAYON_HINT_OPACITY)
// over CRAYON_HINT_S, retracted the same way on leave.
export const CRAYON_STROKE_S = 0.12;
export const CRAYON_STAGGER_S = 0.03;
export const CRAYON_ERASE_S = 0.2;
export const CRAYON_HINT_S = 0.18;
export const CRAYON_HINT_STROKES = 2;
export const CRAYON_HINT_OPACITY = 0.4;

// The jar's cartoon moves (Home/JarView.tsx, brief Part 2.4).
// jar → work: anticipation — lift JAR_ANTICIPATE_PX and squash to
// JAR_ANTICIPATE_SCALE_Y over JAR_ANTICIPATE_S — then drop down out of the
// stage over JAR_DROP_OUT_S (ease-in), jostling the items with
// JAR_JOSTLE_STRENGTH as it goes.
// work → jar: once the grid has gone (WORK_EXIT_S), drop in from above over
// JAR_DROP_IN_S (ease-in), land with a squash (JAR_LAND_SCALE_X/Y) and
// spring back over JAR_LAND_S, then the items fall in.
// "what's inside?" drops in from above by HEADING_DROP_PX with a small
// overshoot over HEADING_DROP_S.
// The brief asked for these on the 12fps stop-motion clock; that stepping
// read as choppy ("pixels not flowing"), so they run smooth at the
// display's frame rate. true brings the stepped stop-motion look back.
export const JAR_MOVES_STOP_MOTION = false;
export const JAR_ANTICIPATE_PX = 10;
export const JAR_ANTICIPATE_SCALE_Y = 0.96;
export const JAR_ANTICIPATE_S = 0.12;
export const JAR_DROP_OUT_S = 0.38;
export const JAR_JOSTLE_STRENGTH = 1;
export const JAR_DROP_IN_S = 0.42;
export const JAR_LAND_SCALE_X = 1.04;
export const JAR_LAND_SCALE_Y = 0.92;
export const JAR_LAND_S = 0.36;
// Interruptions (switching back mid-transition): an unsettled jar skips its
// exit (gone at once — no anticipation, no clink, no items); a jar called
// back mid-exit rises back into place over JAR_RETURN_S.
export const JAR_RETURN_S = 0.25;
// The intro (Home/Intro.tsx, docs/rebrand/intro-brief.md), as [start, end]
// seconds on its own clock. A blank page until INTRO_DRAW, when a small jar
// (INTRO_SMALL_SCALE of the real one, centred on screen) pen-draws; black ink
// fills it in INTRO_FILL_STEPS visible steps (INTRO_FILL), bulges into a dome
// above the rim (INTRO_DOME) and bubbles over as line-drawn foam, rolling
// down both sides in INTRO_FOAM_WAVES waves with small bubbles popping
// (INTRO_FOAM); the foam flattens into the jar's line and the ink drains
// (INTRO_SETTLE); then the
// line breaks at the bottom (INTRO_BREAK): the left half is pulled out as
// thread onto the divider, the right half stretches into the real jar
// (INTRO_MORPH_STAGGER spreads it along the line). The real jar and divider
// swap in at INTRO_HANDOFF[0]; the sidebar then loads top to bottom,
// INTRO_SIDEBAR_STAGGER_S apart, rising INTRO_SIDEBAR_RISE_PX.
// Ink, dome, foam and bubbles are drawn on the stop-motion clock (INTRO_INK_FPS, a
// new pose every frame); the line's travel and morph at INTRO_LINE_FPS.
// INTRO_SHORT is the short version (repeat visits, phones): the small jar
// draws, then goes straight into the jar and divider.
export const INTRO_DRAW: [number, number] = [0.3, 0.9];
export const INTRO_FILL: [number, number] = [0.9, 2.2];
export const INTRO_FILL_STEPS = 8;
export const INTRO_DOME: [number, number] = [2.2, 2.5];
export const INTRO_FOAM: [number, number] = [2.4, 3.0];
export const INTRO_FOAM_WAVES = 4;
export const INTRO_SETTLE: [number, number] = [3.0, 3.4];
export const INTRO_BREAK: [number, number] = [3.3, 4.2];
export const INTRO_HANDOFF: [number, number] = [4.2, 4.5];
export const INTRO_SHORT: { draw: [number, number]; break: [number, number]; handoff: number } = {
  draw: [0, 0.4],
  break: [0.4, 0.95],
  handoff: 0.95,
};
// At the swap the divider changes on the same frame (the drawn line is
// exactly on it); the jar blends over INTRO_JAR_BLEND_S, since its drawing
// has a few more lines round the rim than the one traced line.
export const INTRO_JAR_BLEND_S = 0.15;
export const INTRO_SMALL_SCALE = 0.25;
export const INTRO_MORPH_STAGGER = 0.3;
export const INTRO_INK_FPS = 12;
export const INTRO_LINE_FPS = 60;
export const INTRO_SIDEBAR_STAGGER_S = 0.07;
export const INTRO_SIDEBAR_RISE_PX = 8;
// Clicking a case study zooms into it (components/ui/CaseZoom, brief Part
// 3.2): the home page fades and drops out (ZOOM_LEAVE_S, ZOOM_DROP_PX, its
// parts ZOOM_STAGGER_S apart) while the sidebar narrows to the case study's
// rail; then the clicked thumbnail grows into its spot on the case-study
// page over ZOOM_GROW_S (ease-in-out). The logo back reverses it: the rail
// widens back into the sidebar as home fades in over ZOOM_RETURN_S.
export const ZOOM_LEAVE_S = 0.35;
export const ZOOM_DROP_PX = 10;
export const ZOOM_STAGGER_S = 0.03;
export const ZOOM_GROW_S = 0.6;
export const ZOOM_RETURN_S = 0.4;
// The items drop in almost as soon as the jar lands (Home/JarView.tsx starts
// them the moment it stops moving, then squashes): no wait before the fall
// (JAR_ITEMS_DELAY_MS — the hero's own load-in waits ~315ms), and the replay
// skips the stretch where they're still above the window (useJarPhysics's
// skipOffscreenFall). They spawn where they always did, so the settled pile
// is the original one.
export const JAR_ITEMS_DELAY_MS = 0;
// The clink (Hero/jar-sound.ts, Hero/useJarPhysics.ts): one short clink per
// item's first touch of the jar's glass as they fall in; and as the jar is
// lowered away (jostled), up to JAR_BOUNCE_CLINKS clinks from glass contacts
// in the JAR_BOUNCE_CLINK_WINDOW_MS after. Never closer together than
// JAR_CLINK_MIN_GAP_MS; each JAR_CLINK_S long.
export const JAR_BOUNCE_CLINK_WINDOW_MS = 700;
export const JAR_BOUNCE_CLINKS = 3;
export const JAR_CLINK_MIN_GAP_MS = 60;
export const JAR_CLINK_S = 0.22;
export const HEADING_DROP_PX = 48;
export const HEADING_DROP_S = 0.45;
// Ease with a little overshoot past the end before settling (back-out).
export const EASE_OVERSHOOT = [0.34, 1.4, 0.64, 1] as const;

// Scrolling switches mode (Home/useScrollSwitch.ts): wheel/trackpad/swipe
// travel is added up until it passes SCROLL_SWITCH_THRESHOLD_PX, which
// switches once. Then input is locked until the transition has finished
// plus SCROLL_SWITCH_SETTLE_MS, and the rest of that gesture (a trackpad's
// inertial tail) is ignored — a gesture ends after SCROLL_GESTURE_GAP_MS
// with no wheel events. The transition's length is worked out from the
// jar and grid timings above, whichever way is longer.
export const SCROLL_SWITCH_THRESHOLD_PX = 50;
export const SCROLL_SWITCH_SETTLE_MS = 300;
export const SCROLL_GESTURE_GAP_MS = 200;
export const MODE_TRANSITION_MS =
  Math.max(
    JAR_ANTICIPATE_S + JAR_DROP_OUT_S + HEADING_DROP_S,
    WORK_EXIT_S + JAR_DROP_IN_S + JAR_LAND_S,
  ) * 1000;
// Mobile's tap cues (Home/ScrollCue.tsx; desktop has none): each bobs
// SCROLL_CUE_BOB_PX the way it points, one bob every SCROLL_CUE_BOB_S, and
// fades over SCROLL_CUE_FADE_S as the mode changes.
export const SCROLL_CUE_BOB_PX = 3;
export const SCROLL_CUE_BOB_S = 1.8;
export const SCROLL_CUE_FADE_S = 0.4;
// The "scroll down!" doodle beside the jar (Home/ScrollHint.tsx, desktop):
// while the items are falling in (SCROLL_HINT_DELAY_S after they start),
// its curly arrow pen-draws on over
// SCROLL_HINT_DRAW_S (ease-out) as its label fades in over
// SCROLL_HINT_LABEL_S; switching to work fades it out over SCROLL_HINT_OUT_S
// before the jar moves.
export const SCROLL_HINT_DELAY_S = 0.2;
export const SCROLL_HINT_DRAW_S = 0.6;
export const SCROLL_HINT_LABEL_S = 0.3;
export const SCROLL_HINT_OUT_S = 0.15;

// Hover-intent leave delay for the project hover preview (step 6, brief
// Part 3.1) — the brief's own name for it.
export const HOVER_CLOSE_DELAY_MS = 150;

// Sidebar (Home/Sidebar.tsx): the hand-drawn oval pen-draws on around a
// heading in OVAL_DRAW_S while it's hovered/focused and un-draws on leave; a
// dropdown's chevron turns CHEVRON_OPEN_DEG over CHEVRON_TURN_S. Opening a
// dropdown grows its list over DROPDOWN_OPEN_S while the items fade down
// into place DROPDOWN_ITEM_STAGGER_S apart; closing runs quicker
// (DROPDOWN_CLOSE_S) with no stagger.
export const OVAL_DRAW_S = 0.35;
export const CHEVRON_TURN_S = 0.2;
export const CHEVRON_OPEN_DEG = 180;
// A Works row's ↗ turns ARROW_HOVER_DEG (to point straight right) while the
// row is hovered, over CHEVRON_TURN_S like the chevron.
export const ARROW_HOVER_DEG = 45;
export const DROPDOWN_OPEN_S = 0.28;
export const DROPDOWN_CLOSE_S = 0.18;
export const DROPDOWN_ITEM_STAGGER_S = 0.035;
export const DROPDOWN_ITEM_DROP_PX = 6;

// ---------- debug params (rebrand v2) ----------
//
// ?slow=4 — global animation slow-down factor. Every rebrand animation added
// from here on multiplies its durations/delays by getSlowFactor() (or reads
// the --slow custom property from CSS, set on <html> by MotionDebug.tsx), so
// one URL param slows the whole site down for tuning. Not wired into Framer
// Motion's MotionConfig: MotionConfig's `transition` is only a fallback for
// components that don't pass their own, and every motion component on this
// site passes its own — use slowTransition() on those instead.
//
// ?intro=1 — forces the intro (brief Part 4.2, step 8) to replay even if it
// already played this visit. Stored in sessionStorage so it survives the
// intro's own route/state churn; the intro clears it once it's played.
//
// Both are read lazily on first call (never during SSR — there's no URL
// there), then cached for the rest of the page's life.

let slowFactor: number | null = null;

export function getSlowFactor(): number {
  if (slowFactor !== null) return slowFactor;
  if (typeof window === "undefined") return 1;
  const raw = Number(new URLSearchParams(window.location.search).get("slow"));
  slowFactor = Number.isFinite(raw) && raw > 0 ? raw : 1;
  return slowFactor;
}

/** Turns an easing curve into stop motion (brief Part 4.1): the animation
 * only advances STOP_MOTION_FPS times a second, holding each pose in
 * between, so it steps like hand-drawn frames. `durationS` is the
 * animation's real (already ?slow-scaled) length, which sets how many
 * frames it gets. */
export function stopMotion(ease: readonly [number, number, number, number], durationS: number): (t: number) => number {
  const frames = Math.max(1, Math.round(durationS * STOP_MOTION_FPS));
  const curve = cubicBezier(ease);
  return (t) => curve(Math.min(1, Math.floor(t * frames) / frames));
}

/** CSS-style cubic-bezier(x1, y1, x2, y2) as a function of progress. */
function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number]): (t: number) => number {
  const sample = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0 || x >= 1) return x <= 0 ? 0 : 1;
    // Solve for the curve parameter whose x matches, by bisection.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (sample(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return sample(y1, y2, (lo + hi) / 2);
  };
}

/** Scales a millisecond duration/delay by the ?slow factor. */
export function slowMs(ms: number): number {
  return ms * getSlowFactor();
}

/** Scales a Framer Motion transition's duration/delay (seconds) by the
 * ?slow factor. Springs are left as-is apart from their delay — slowing a
 * spring properly means retuning stiffness/damping, not a single factor. */
export function slowTransition<T extends { duration?: number; delay?: number }>(transition: T): T {
  const k = getSlowFactor();
  if (k === 1) return transition;
  return {
    ...transition,
    ...(transition.duration !== undefined && { duration: transition.duration * k }),
    ...(transition.delay !== undefined && { delay: transition.delay * k }),
  };
}

/** sessionStorage keys for the intro (step 8). INTRO_SEEN_KEY marks the
 * full intro as already played this visit; INTRO_FORCE_KEY is set by
 * ?intro=1. */
export const INTRO_SEEN_KEY = "aw:intro-seen";
export const INTRO_FORCE_KEY = "aw:intro-force";

/** Stores ?intro=1 as INTRO_FORCE_KEY. Called once on mount (MotionDebug). */
export function storeIntroParam() {
  if (new URLSearchParams(window.location.search).get("intro") !== "1") return;
  try {
    sessionStorage.setItem(INTRO_FORCE_KEY, "1");
  } catch {
    // Storage blocked (private mode etc.) — the flag just doesn't stick.
  }
}

/** True when ?intro=1 asked for the intro to replay. */
export function isIntroForced(): boolean {
  try {
    return sessionStorage.getItem(INTRO_FORCE_KEY) === "1";
  } catch {
    return false;
  }
}
