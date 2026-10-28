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

// Hover-intent leave delay: the sidebar's case-study rows (below) and the
// project hover preview (step 6, brief Part 3.1) — the brief's own name.
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
export const DROPDOWN_OPEN_S = 0.28;
export const DROPDOWN_CLOSE_S = 0.18;
export const DROPDOWN_ITEM_STAGGER_S = 0.035;
export const DROPDOWN_ITEM_DROP_PX = 6;

// Case-study rows under Works: resting on one for CASE_ROW_OPEN_DELAY_MS
// grows it from its one-line, truncated description to the full wrapped
// text over CASE_ROW_EXPAND_S; it shrinks back over CASE_ROW_COLLAPSE_S,
// HOVER_CLOSE_DELAY_MS after the pointer leaves the row.
export const CASE_ROW_OPEN_DELAY_MS = 100;
export const CASE_ROW_EXPAND_S = 0.2;
export const CASE_ROW_COLLAPSE_S = 0.16;

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
