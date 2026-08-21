/**
 * Hero load-in choreography constants shared across files that otherwise
 * can't see each other's values: the jar's own CSS fade duration
 * (Hero.module.css, via the --jar-fade-ms custom property set inline in
 * index.tsx) and useJarPhysics.ts's "don't start falling until the jar is
 * mostly visible" entrance delay. Deriving the delay from this one constant
 * means it can never silently drift out of sync with how long the fade
 * actually takes.
 */

/** Must match the fallback in Hero.module.css's `var(--jar-fade-ms, 400ms)`
 * — that fallback only ever matters if the inline custom property is
 * somehow missing. This constant is the real source of truth; it's passed
 * down via inline style in Hero/index.tsx. */
export const JAR_FADE_MS = 400;

/** Physics visibly starts falling once the jar outline's own fade is ~70%
 * complete — items dropping into a not-yet-visible jar reads as broken.
 * Derived from JAR_FADE_MS itself (not a bare hardcoded 280) so it stays
 * correct if that duration above ever changes. */
export const JAR_PHYSICS_DELAY_MS = Math.round(JAR_FADE_MS * 0.7);
