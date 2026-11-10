# Zoom into a case study: brief v2

Replaces the zoom in design-system.md "Zoom into a case study" (steps 1-3). The way back (the logo) is unchanged.

## The problem

Clicking a project feels laggy. Today the click does this:

1. A copy of the thumbnail is laid over the clicked one and **stays still for 350ms** while the home page plays its exit (the sidebar narrowing to the rail).
2. Only then does the page change, and the copy **waits for the case study to be on screen** before it starts growing.
3. The sidebar's narrowing animates the grid's column width, which re-lays-out the whole page every frame, so it stutters.

So for the first 0.35s to 1s+ nothing answers the click, then it zooms. That's the lag.

## How modern sites do it

The card-to-page "zoom" is the shared-element transition, the pattern behind the App Store's expanding cards, Airbnb's listing photos, and most portfolio sites with case-study cards. It's built one of two ways: the browser's View Transitions API (the old and new page are snapshotted and the browser morphs one into the other), or a FLIP overlay (a copy of the card is lifted above the page and animated from its first rect to its last; Framer Motion's `layoutId` works this way). The ones that feel good share the same rules:

- **Answer the click on the next frame.** The card starts moving immediately; nothing waits on the network or the new page. Loading happens underneath the animation, not before it.
- **Freeze the world.** Everything else stops: no hovers, no videos, no idle motion, no clicks. Only the card moves, so the eye follows it.
- **Push the background back.** A scrim fades over the page (to white here) instead of the page playing its own exit, so the card has the screen to itself.
- **Move the thing itself, physically bigger.** The card grows on its own rect (position and size), with its corners easing, rather than a crossfade to a new picture.
- **Animate cheaply.** Only the card's own box and the scrim's opacity change: nothing that makes the rest of the page re-lay-out.
- **Land exactly, then hand over.** It ends on the new page's image at the same rect, so the swap is invisible; if the final spot is only known late, a short settle corrects it.
- **Fetch early.** The next page is prefetched when the pointer shows intent (hover), so it's usually ready by the time the card lands.

We use the FLIP overlay: it's already how the zoom works, it lives across the route change in the root layout, and it doesn't depend on the newer View Transitions support in this Next version or in every browser.

## The new zoom

On click (desktop, motion allowed):

1. **Pause (0ms).** The page freezes: CSS animations and transitions hold where they are, videos pause, nothing takes the pointer.
2. **Background fades (300ms, ease-out).** A white scrim fades in over the whole page, under the card.
3. **The project grows (600ms, ease-in-out), starting at once.** The copy of the card grows from its spot, physically bigger, to where the case study's thumbnail will be, worked out from the case-study layout's own sizes at this window size. Its corners and any jar rotation ease to the thumbnail's. The page changes underneath at the same moment.
4. **Land.** When the case study is on screen, the copy settles onto its thumbnail's exact rect (250ms, if it's off at all), the scrim fades away (300ms) uncovering the case study already in place, and the real thumbnail takes over.

Prefetch: hovering a project prefetches its case study.

Unchanged: phones and reduced motion just change page; the logo's way back.

## Timings (lib/motion.ts)

| | |
|---|---|
| Scrim in | 300ms ease-out |
| Grow | 600ms ease-in-out |
| Settle onto the real thumbnail | 250ms ease-out |
| Scrim out | 300ms ease-out |
