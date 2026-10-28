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
//
// Leave delay for the project hover preview (step 6, brief Part 3.1) — the
// brief's own name for it.
export const HOVER_CLOSE_DELAY_MS = 150;

// Sidebar dropdowns (Home/Sidebar.tsx): the hand-drawn oval pen-draws on
// around an opened heading in OVAL_DRAW_S (un-draws on close), while its
// chevron turns CHEVRON_OPEN_DEG over CHEVRON_TURN_S.
export const OVAL_DRAW_S = 0.35;
export const CHEVRON_TURN_S = 0.2;
export const CHEVRON_OPEN_DEG = 180;

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
