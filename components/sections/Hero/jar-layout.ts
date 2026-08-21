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
  // rabbit/skullpanda swapped — rabbit (sizeScale 1.5, the biggest of this
  // foursome) now lands first, skullpanda (1.34) second, kitty-mirror
  // (1.23) third, skinsprout (0.9, project box, the smallest) last — per
  // this file's own "biggest-first" principle (see the comment above
  // PLACEMENT_ORDER). Their lanes (rabbit 0.28, skullpanda 0.42, kitty-
  // mirror 0.23, skinsprout 0.36) all sit close together, so this cluster
  // effectively settles as one group; skinsprout landing last, smallest,
  // was still visibly nudging the other three on arrival — descending size
  // means each later (smaller/lighter) arrival disturbs the pile less
  // instead of a late one shoving an already-settled bigger neighbor.
  "rabbit",
  "skullpanda",
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
 * request, and spotify joined it there on a later request still. cybersea/
 * skullpanda/rabbit/pineapple/cam then reshuffled into one contiguous
 * chain — cybersea, skullpanda, rabbit, pineapple, cam, each in front of
 * the one before it — on a later request still. */
export const LAYER_ORDER = [
  "bear-hirono",
  "skinsprout",
  "spotify",
  "kitty-mirror",
  "bottle",
  "chips",
  "cybersea",
  "skullpanda",
  "rabbit",
  "pineapple",
  "cam",
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
  // Nudged left (0.28 -> 0.26) on request — rabbit was reading as getting
  // pushed far off its own lane (toward laneige/skullpanda's crowded
  // corner) while settling, which was itself a source of shaking. A little
  // more starting room to the left gives it more distance to be pushed
  // before it reaches that crowded area. This does tighten the gap to
  // kitty-mirror (0.23) to 0.03 — worth watching if kitty-mirror starts
  // showing the same kind of landing bump laneige/skullpanda had.
  rabbit: 0.26,
  skinsprout: 0.36,
  // Nudged right (0.45 -> 0.48) on request: this isn't the same shake that
  // was fixed via the sleep-motion-threshold in useJarPhysics — that one
  // was bodies stuck idling forever after everything looked done. This is
  // a genuine mid-fall collision: laneige lands early (see PLACEMENT_ORDER)
  // and is already resting by the time skullpanda falls into its own lane
  // (0.42) later — only 0.03 away — so skullpanda's landing visibly bumps
  // the already-settled laneige. A little more lane clearance from
  // skullpanda (and a touch more from rabbit's 0.28 too) means less of that
  // landing gets transmitted as a bump in the first place. Small, isolated
  // move — still 0.07 clear of cam (0.55) on the other side.
  laneige: 0.48,
  skullpanda: 0.42,
  cam: 0.55,
  cybersea: 0.57,
  spotify: 0.65,
  chips: 0.65,
  bottle: 0.72,
  ballet: 0.81,
  "bear-hirono": 0.8,
};
