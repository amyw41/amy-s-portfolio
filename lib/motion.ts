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

// Work-mode grid: the cards come in all together, once every cover has
// loaded (they're usually preloaded while the jar sits idle), waiting at
// most this long (ms) for slow ones.
export const GRID_COVER_WAIT_MS = 300;

// Work-mode grid (Home/WorkGrid.tsx): each tile rises GRID_TILE_RISE_PX and
// scales up from GRID_TILE_SCALE over GRID_TILE_S, all at once.
// Leaving work mode, the heading and grid slide up WORK_EXIT_RISE_PX and
// fade out together over WORK_EXIT_S, then the jar shows.
export const GRID_TILE_S = 0.3;
export const GRID_TILE_RISE_PX = 12;
export const GRID_TILE_SCALE = 0.97;
export const WORK_EXIT_S = 0.2;
export const WORK_EXIT_RISE_PX = 12;

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
// The load-in's sidebar (Home/index.tsx, Home.module.css .introReveal):
// its parts come in top to bottom, INTRO_SIDEBAR_STAGGER_S apart, rising
// INTRO_SIDEBAR_RISE_PX.
export const INTRO_SIDEBAR_STAGGER_S = 0.07;
export const INTRO_SIDEBAR_RISE_PX = 8;
// The load-in (Home/index.tsx): the jar drops in and the items fall (the
// same arrival as coming back from the work: JAR_DROP_IN_S, JAR_LAND_*),
// while the sidebar loads (INTRO_SIDEBAR_*) and the divider draws on top to
// bottom over INTRO_DIVIDER_DRAW_S, ease-in-out.
export const INTRO_DIVIDER_DRAW_S = 0.6;
// The way back from a case study (its logo): home starts at the case
// study's sidebar width with its parts dropped ZOOM_DROP_PX and faded, and
// the sidebar widens back as everything fades in over ZOOM_RETURN_S.
export const ZOOM_DROP_PX = 10;
export const ZOOM_GROW_S = 0.6;
// The zoom v2 (docs/rebrand/zoom-brief.md, components/ui/CaseZoom): on the
// click the page freezes and a white scrim fades over it (ZOOM_SCRIM_IN_S)
// as the card grows (ZOOM_GROW_S) toward the case study's thumbnail; it then
// settles onto the real thumbnail (ZOOM_SETTLE_S) as the scrim fades off
// the case study (ZOOM_SCRIM_OUT_S).
export const ZOOM_SCRIM_IN_S = 0.3;
export const ZOOM_SETTLE_S = 0.25;
export const ZOOM_SCRIM_OUT_S = 0.3;
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
export const JAR_BOUNCE_CLINKS = 1;
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
// Going back up from the top of the work is easier: a flick of
// SCROLL_BACK_THRESHOLD_PX switches, and a pause of SCROLL_BACK_GAP_MS ends
// the gesture that scrolled the grid up to its top. A flick that reverses the
// last gesture always counts as new (useScrollSwitch.ts).
export const SCROLL_BACK_THRESHOLD_PX = 24;
export const SCROLL_BACK_GAP_MS = 150;
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


// Sidebar (Home/Sidebar.tsx): the hand-drawn oval pen-draws on around a
// heading in OVAL_DRAW_S while it's hovered/focused and un-draws on leave at
// the same pace (ease-in-out, like a pen going round); a
// dropdown's chevron turns CHEVRON_OPEN_DEG over CHEVRON_TURN_S. Opening a
// dropdown grows its list over DROPDOWN_OPEN_S while the items fade down
// into place DROPDOWN_ITEM_STAGGER_S apart; closing runs quicker
// (DROPDOWN_CLOSE_S) with no stagger.
export const OVAL_DRAW_S = 0.6;
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


// The sidebar social icons' foil hover (Home/Sidebar.tsx useFoil): a half circle
// under the mouse reveals a fixed gradient on the icon; it rises in,
// trails the mouse by this much (ease-out), and sinks out. Reduced motion:
// instant.
export const FOIL_REVEAL_LAG_MS = 180;
// The footer's item carousel (components/ui/FooterStrip/FooterCarousel):
// stepping slides the item out one side and the next in from the other
// over this (ease-in-out). Reduced motion: instant.
export const FOOTER_CAROUSEL_SLIDE_S = 0.45;
// The footer's credit: its gradient follows the mouse across it, catching
// up over this (ease-out), and eases back on leave. Reduced motion: still.
export const FOOTER_CREDIT_SHIFT_MS = 500;
// The items' clinks as they fall in (useJarPhysics's clinkPattern), on the
// load-in and every return from the work alike: instead of
// following the physics (which varies a little, and drops clinks that land
// in the same frame), a fixed run of clinks starting the moment the first
// item hits the glass: when (ms after that) and how hard (0-1), the same
// every time. It runs about as long as the items take to land and settle,
// getting softer and further apart as they do. The sound stops once the
// last has rung out (JAR_CLINK_RING_MS).
export const JAR_LOAD_CLINKS = [
  { atMs: 0, strength: 0.9 },
  { atMs: 110, strength: 0.75 },
  { atMs: 220, strength: 0.85 },
  { atMs: 340, strength: 0.65 },
  { atMs: 470, strength: 0.7 },
  { atMs: 610, strength: 0.55 },
  { atMs: 760, strength: 0.5 },
  { atMs: 920, strength: 0.42 },
] as const;
export const JAR_CLINK_RING_MS = 220;
// The CyberSea case study's 3D demo (case-studies/cybersea/meshScene.ts):
// Split pulls the pieces apart (and back) over this, ease-in-out. Reduced
// motion: instant.
export const MESH_DEMO_SPLIT_MS = 700;
// Media loading in (components/ui/MediaFade, like rachelchen.tech's): until
// an image or video has loaded, its box shows a soft grey that pulses
// (MEDIA_PULSE_S a cycle); once loaded it fades in from MEDIA_FADE_BLUR_PX
// of blur to sharp over MEDIA_FADE_MS, ease-in-out. Reduced motion: no blur,
// no pulse, just the fade.
export const MEDIA_FADE_MS = 500;
export const MEDIA_FADE_BLUR_PX = 6;
export const MEDIA_PULSE_S = 2;
// Spotify Guessr's cover demo (case-studies/spotify/GuessrDemo.tsx): the
// characters bob GUESSR_BOB_PX up and down, one bob every GUESSR_BOB_S (each
// a little out of step). The phone's screens cross-fade over
// GUESSR_SCREEN_FADE_MS (each tap moves on one; nothing plays by itself).
// The deck background blooms in once loaded over GUESSR_BG_BLOOM_MS. On the
// podium the characters hop over GUESSR_HOP_MS. Reduced motion: no bobbing
// or hop; screens swap without the fade.
export const GUESSR_BOB_PX = 2;
export const GUESSR_BOB_S = 3.2;
export const GUESSR_SCREEN_FADE_MS = 220;
export const GUESSR_BG_BLOOM_MS = 1400;
// The rest of the cover comes in after the background, staggered: the
// magenta glow GUESSR_GLOW_DELAY_MS in; the phone GUESSR_PHONE_DELAY_MS in,
// rising over GUESSR_PHONE_IN_MS; then the characters pop in (with a little
// overshoot) one by one from GUESSR_CHAR_DELAY_MS, GUESSR_CHAR_STAGGER_MS
// apart, each over GUESSR_CHAR_IN_MS.
export const GUESSR_GLOW_DELAY_MS = 300;
export const GUESSR_PHONE_DELAY_MS = 250;
export const GUESSR_PHONE_IN_MS = 800;
export const GUESSR_CHAR_DELAY_MS = 700;
export const GUESSR_CHAR_STAGGER_MS = 140;
export const GUESSR_CHAR_IN_MS = 600;
export const GUESSR_HOP_MS = 600;
