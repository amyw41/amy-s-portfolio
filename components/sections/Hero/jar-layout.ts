/** Fall/drop sequence — the order bodies are spawned and enter the jar. Rows
 * are emergent from gravity/collision (there's no authored y here, only x
 * via TARGET_X_FRACTION below), not enforced: earlier items are already
 * resting by the time later ones in the same conceptual "row" arrive.
 *
 * Hand-specified directly, replacing the earlier size-batched/alternating-
 * sweep ordering (that reasoning — biggest-first to avoid a late heavy item
 * disturbing an already-settled pile, alternating L→R/R→L/L→R per batch to
 * read as a deliberate sweep rather than a scatter — still applies to *why*
 * order matters here, just not to this exact sequence anymore; worth
 * revisiting if the feel regresses).
 */
export const PLACEMENT_ORDER = [
  "pineapple",
  "laneige",
  "chips",
  "ballet",
  "bottle",
  "cam",
  "cybersea",
  "skullpanda",
  "rabbit",
  "kitty-mirror",
  "skinsprout",
  "bear-hirono",
  "spotify",
] as const;

/** Back to front — array index IS the z-index (last entry renders frontmost).
 * Independent of physics and of PLACEMENT_ORDER.
 *
 * Same porting approach as PLACEMENT_ORDER above: the shared items'
 * relative order (skullpanda, kitty-mirror, bottle, chips, pineapple,
 * laneige) is the old Jar.js reference's own ITEMS array order, which
 * doubled as its back-to-front stacking order there too. cam/rabbit have
 * no ported position and are interleaved at roughly their predecessors'
 * previous relative depths. bear-hirono moved to the very front of this
 * list (== the very back of the pile) on request; ballet moved to the very
 * end (== the very front of the pile) on a later request. skinsprout moved
 * up next to bear-hirono (== toward the back of the pile) on a later
 * request, and spotify joined it there on a later request still. */
export const LAYER_ORDER = [
  "bear-hirono",
  "skinsprout",
  "spotify",
  "skullpanda",
  "cybersea",
  "kitty-mirror",
  "bottle",
  "chips",
  "pineapple",
  "cam",
  "rabbit",
  "laneige",
  "ballet",
] as const;

/**
 * Each item's fall lane: a fixed x, as a fraction (0–1) of the container's
 * width. While an item hasn't landed yet, its body is force-pinned to this
 * column every tick (see useJarPhysics) — that's what makes the pile fill
 * in as a clean sweep per row instead of everything drifting toward
 * whatever it grazes first in mid-air. The resulting y (and the settle
 * rotation) is never authored: it's whatever gravity + collision against
 * the jar walls and already-landed items produces, and — since there's no
 * randomness anywhere and the timestep is fixed — that result is identical
 * on every load at a given container size.
 *
 * Re-tuned (previous version below history) to roughly mirror a hand-
 * composed reference collage: rabbit/pineapple toward the left, kitty-
 * mirror/cybersea/skinsprout/laneige center-left, skullpanda/cam/spotify
 * center, chips/bottle/bear-hirono/ballet toward the right. Not a literal
 * coordinate transcription of that reference (a fixed lane still only
 * controls x, not the actual settle position/rotation, and item shapes
 * here don't match the reference's placeholder art 1:1) — just moved each
 * item's lane toward the general zone it occupies there. Every value stays
 * inside the validated-safe 0.2–0.8 range (see jar-shape.ts's comments on
 * why going wider risks neck-wedging).
 *
 * (Previously: three size-batches, each spread in even steps 0.2→0.8,
 * alternating direction, to fix an earlier version where several items in
 * the same batch landed within 0.04–0.06 of each other and read as one
 * clump instead of a sweep. That batch/sweep structure is gone now that
 * lanes are chosen by reference position instead, but kept genuinely
 * distinct spacing between neighbours for the same reason.)
 *
 * kitty-mirror pulled sharply left (0.38 -> 0.23, right next to pineapple)
 * and cybersea pushed right (0.3 -> 0.57, next to spotify) on a later
 * request — both moves just reshuffle x, independent of the LAYER_ORDER
 * (front/back) changes made at the same time.
 */
export const TARGET_X_FRACTION: Record<string, number> = {
  pineapple: 0.2,
  "kitty-mirror": 0.23,
  rabbit: 0.28,
  skinsprout: 0.42,
  laneige: 0.45,
  skullpanda: 0.5,
  cam: 0.55,
  cybersea: 0.57,
  spotify: 0.6,
  chips: 0.65,
  bottle: 0.72,
  ballet: 0.76,
  "bear-hirono": 0.8,
};
