/**
 * Hero load-in choreography constants shared across files that otherwise
 * can't see each other's values: the shared CSS fade duration every hero
 * element — jar included — animates with (Hero.module.css, via the
 * --hero-load-ms custom property set inline in index.tsx), and
 * useJarPhysics.ts's own "don't start falling until the jar is mostly
 * visible" entrance delay.
 *
 * History, briefest version: started as several independently-timed,
 * independently-directed pieces (star/title/tagline staggered one way, nav
 * links staggered another way and sliding in, jar fading on its own timer,
 * toggles rising on a third timer) → collapsed to one shared fade+rise,
 * jar excluded (jar reads as "just there" instantly) → simplified once more
 * to a plain fade, no rise, jar included again — "everything appears on
 * the spot together" was the actual ask underneath all those iterations.
 * HERO_LOAD_IN_MS is that one shared duration.
 */
export const HERO_LOAD_IN_MS = 450;

/** Physics visibly starts falling once the shared fade is ~70% complete —
 * items dropping into a still-mostly-transparent jar reads as broken, and
 * the jar is back to fading in with everything else (see Hero.module.css).
 * Derived from HERO_LOAD_IN_MS itself (not a bare hardcoded number) so it
 * stays correct if that duration above ever changes. */
export const JAR_PHYSICS_DELAY_MS = Math.round(HERO_LOAD_IN_MS * 0.7);
