/** Left to right, bottom to top — also the order items are released to fall
 * during the entrance (see RELEASE_INTERVAL_MS in useJarPhysics). Rows are
 * emergent from gravity/collision, not enforced: earlier items are already
 * resting by the time later ones in the same row arrive.
 *
 * The 11 non-"project" items' relative order here (ballet, laneige,
 * pineapple, chips, bottle, kitty-plush, bingsu, kitty-mirror, hufflepuff,
 * skullpanda, handcream) is ported straight from the old Jar.js reference's
 * `fallOrder` field (see items.manifest.ts's comment on sizeScale for the
 * full story) — that's the drop sequence the earlier build used for the
 * same 11 items. cybersea/skinsprout/spotify don't exist in that reference
 * (it had a 12th item, digi, that this project doesn't use), so they're
 * interleaved at roughly the same relative points in the sequence they
 * held before this port, rather than at any ported position. */
export const PLACEMENT_ORDER = [
  "ballet",
  "laneige",
  "pineapple",
  "chips",
  "bottle",
  "cybersea",
  "kitty-plush",
  "bingsu",
  "kitty-mirror",
  "hufflepuff",
  "skullpanda",
  "skinsprout",
  "handcream",
  "spotify",
] as const;

/** Back to front — array index IS the z-index. Independent of physics and
 * of PLACEMENT_ORDER.
 *
 * Same porting approach as PLACEMENT_ORDER above: the 11 shared items'
 * relative order (skullpanda, handcream, kitty-mirror, bingsu, hufflepuff,
 * ballet, bottle, chips, pineapple, kitty-plush, laneige) is the old
 * Jar.js reference's own ITEMS array order, which doubled as its
 * back-to-front stacking order there too — cybersea/skinsprout/spotify
 * again have no ported position and are interleaved at roughly their
 * previous relative depths. */
export const LAYER_ORDER = [
  "skullpanda",
  "cybersea",
  "handcream",
  "kitty-mirror",
  "bingsu",
  "hufflepuff",
  "ballet",
  "spotify",
  "bottle",
  "chips",
  "pineapple",
  "skinsprout",
  "kitty-plush",
  "laneige",
] as const;

/**
 * Each item's fall lane: a fixed x, as a fraction (0–1) of the container's
 * width. While an item hasn't landed yet, its body is force-pinned to this
 * column every tick (see useJarPhysics) — that's what makes the pile fill
 * in as a clean left-to-right sweep per row instead of everything drifting
 * toward whatever it grazes first in mid-air. The resulting y (and the
 * settle rotation) is never authored: it's whatever gravity + collision
 * against the jar walls and already-landed items produces, and — since
 * there's no randomness anywhere and the timestep is fixed — that result
 * is identical on every load at a given container size.
 *
 * The 11 shared items' fractions are the old Jar.js reference's own `left`
 * values (0–100, here divided by 100) — same porting rationale as
 * PLACEMENT_ORDER/LAYER_ORDER above. cybersea/skinsprout/spotify keep
 * their pre-port columns; there's no old-reference value to port for them.
 */
export const TARGET_X_FRACTION: Record<string, number> = {
  ballet: 0.78,
  laneige: 0.44,
  pineapple: 0.2,
  chips: 0.32,
  bottle: 0.8,
  "kitty-plush": 0.58,
  bingsu: 0.48,
  "kitty-mirror": 0.24,
  hufflepuff: 0.28,
  skullpanda: 0.32,
  handcream: 0.5,

  cybersea: 0.28,
  skinsprout: 0.6,
  spotify: 0.72,
};
