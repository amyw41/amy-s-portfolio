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
// item lifts JAR_LIFT_PX and scales to JAR_LIFT_SCALE over JAR_LIFT_IN_MS
// (settling back over JAR_LIFT_OUT_MS) while every other item dims. In work
// mode its grid tile lifts TILE_LIFT_PX instead and the other tiles dim.
export const JAR_LIFT_PX = 12;
export const JAR_LIFT_SCALE = 1.04;
export const JAR_LIFT_IN_MS = 250;
export const JAR_LIFT_OUT_MS = 200;
export const TILE_LIFT_PX = 6;

// The jar / work toggle (Home/ModeToggle.tsx): the selected label's
// squiggly underline draws on over MODE_UNDERLINE_DRAW_S (the old one
// un-draws over the same); hovering an unselected label previews its
// squiggle faintly, drawn on over MODE_HOVER_DRAW_S.
export const MODE_UNDERLINE_DRAW_S = 0.3;
export const MODE_HOVER_DRAW_S = 0.15;

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
export const HEADING_DROP_PX = 48;
export const HEADING_DROP_S = 0.45;
// Ease with a little overshoot past the end before settling (back-out).
export const EASE_OVERSHOOT = [0.34, 1.4, 0.64, 1] as const;

// Hover-intent leave delay for the project hover preview (step 6, brief
// Part 3.1) — the brief's own name for it.
export const HOVER_CLOSE_DELAY_MS = 150;

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
