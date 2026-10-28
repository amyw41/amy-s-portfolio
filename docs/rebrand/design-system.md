# Design system (home page, rebrand v2)

The source of truth for how the site looks. Amy edits this file; code follows it. When a value here and the code disagree, this file wins: change the code to match.

Values are at the 1536×696 laptop size (the biggest the site gets).

## Type

| Token | Value |
|---|---|
| Font | Geist |
| Letter spacing | -0.6px |
| Name size | 24px, line-height 1.15 |
| Body size (everything else) | 14px, line-height 1.45 |
| Heading weight (Experience, Works, About, Play) | 500 |
| jar/work toggle weight | 400 |
| Body weight (intro, list items) | 300 |

## Colour

| Token | Value |
|---|---|
| Text | #000 |
| Intro text | 75% black |
| Case-study description | 30% black (55% while its row is open) |
| Hover circle | 45% black |
| Inactive mode button (jar/work) | 40% black (70% on hover) |
| Divider line | #000 |
| Background | #fff |
| Highlight toggles | projects: red #ff2841, items: blue #42b4fa |

## Layout

| Token | Value |
|---|---|
| Frame | min(100vw, 1536px) wide, 100dvh tall, centred, no outer padding |
| Sidebar width | clamp(260px, 20vw, 320px) (~307px) |
| Divider | 1px, inset 32px from the top and bottom of the screen |
| Sidebar padding, left/right | 32px |
| Sidebar padding, top/bottom | 64px (the divider starts 32px above the name) |
| Mobile breakpoint | below 768px the sidebar stacks above the stage |

## Sidebar spacing (top to bottom)

| Between | Value |
|---|---|
| Name → intro | 14px |
| Intro → icons → Experience | 22px each |
| Icon → icon | 4px (each icon in a 24px box) |
| Heading → its chevron | 4px |
| Heading → first item, item → item | 4px |
| Experience list → Works | 40px |
| Works → About → Play (incl. last case study → About) | 8px |
| Play → jar/work toggle | fills the leftover space, at least 16px |
| jar ↔ work | 16px |

## Components

- **Icons:** X, LinkedIn, mail. Plain black, ~18–20px, no border.
- **Headings with a dropdown** (Experience, Works): text + chevron (14px). Start open. Closed points down, open points up.
- **List items:** same left edge as the heading, no indent, no dash.
- **Case-study row:** name, then " - description" on one line; the description truncates with "…". Hovering it (or keyboard focus) expands it to the full description, wrapped onto extra lines under the name. The hover area is the whole row, expanded lines and the gap above included; only one row is open at a time.
- **Hover circle:** hand-drawn wiggly oval, drawn on like a pen when hovering a heading, un-drawn on leave. 16px past the word left/right, 8px above/below.
- **Highlight toggles:** stacked on the stage's right, 40px from its top and right edges, 10px apart.

## Motion

| Token | Value |
|---|---|
| Hover circle draw | 350ms ease-out |
| Chevron turn | 200ms, 180° |
| Dropdown open | 280ms ease-out; items fade down from 6px above, 35ms apart |
| Dropdown close | 180ms ease-in, all at once |
| Case-study row open | after 100ms of hovering; expands 200ms ease-out |
| Case-study row close | 150ms after the pointer leaves the row; collapses 160ms ease-in |
| Reduced motion | no animation, things just appear (case-study rows open and close without animating) |
