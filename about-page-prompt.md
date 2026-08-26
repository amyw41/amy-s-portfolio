# Build the About page at /about

## Goal

Port the bio content from `jar-portfolio` (source repo) into **this** repo
(`amy's portfolio`) as the real content of `app/about/page.tsx`, replacing
its current placeholder (`content.en.about.placeholder`). The `/about` route
and its Taskbar nav link already exist and work — this is purely about
giving that route real content.

Source note: despite living at `jar-portfolio`'s `app/notes/page.tsx`, that
file's own comments confirm it *is* the About page ("Work/community history
shown on the About page", "back to matching the bio grid's own outer width")
— the route was apparently renamed at some point without updating the
folder name. Treat `app/notes/page.tsx` + `components/Experience.tsx` +
`lib/experience.ts` as the About page's source, not `jar-portfolio`'s own
(nonexistent) `/about` route.

Follow the same porting pattern already established for `/playground` (see
`components/sections/Playground/` and `app/playground/page.tsx` in this
repo, already built) rather than re-deriving conventions from scratch:
- A `components/sections/About/` folder holding the new components
  (`index.tsx` + a `.module.css` + any sub-components), imported into a thin
  `app/about/page.tsx`.
- The section wrapped as `<section className={styles.section}><div
  className={`pageContainer ${styles.container}`}>...</div></section>` —
  **this is the fix for "same horizontal padding as the rest of the site"**:
  `jar-portfolio`'s source page manages its own independent width/padding
  (`mx-auto max-w-[1100px] px-4 py-3` on the bio section, `mx-auto
  max-w-[1100px] px-8 py-16 sm:px-16 sm:py-20` on the Experience section) —
  ignore those numbers entirely and let the global `.pageContainer` class
  (`lib/tokens.css`'s `--pad`/`--content-max`, `app/globals.css`) set the
  left/right edges instead, exactly like `Playground`'s own `.section`/
  `.container` split does. `padding-block` on `.section` can still use
  `Playground.module.css`'s own value (`clamp(64px, 8vw, 120px)`) for
  consistent vertical rhythm between sections, or the source's own vertical
  spacing if that reads better — vertical padding isn't the constraint here,
  only horizontal.
- Plain CSS Modules, not Tailwind utility classes — the source file writes
  everything as inline Tailwind classes (`className="flex items-center
  justify-between gap-4 py-2 lg:py-2"` etc.); translate that styling into a
  `.module.css` file the way `Playground.module.css`/`Projects.module.css`
  already do for this repo's other sections. (Tailwind does exist in this
  repo, but only scoped to `/projects/[slug]` — see
  `app/projects/[slug]/case-study.css`'s own comment on why it's not global.
  Don't pull it into this page.)
- No custom fonts: the source uses `font-instrument` (Instrument Serif) for
  the "Hello! I'm Amy" heading and the "Work"/"Community" group labels —
  same situation `Playground.module.css` already solved for "what's on my
  plate?" (see its own `.title` comment): this repo has no Instrument Serif
  loaded outside the Tailwind-scoped case-study route, so render these in
  the site's normal Roboto stack instead, sized/weighted with a `clamp()` or
  an existing token as appropriate, not introduced as a new font.

Assets are already in this repo — nothing to copy from `jar-portfolio`'s
`public/`:
- `public/images/etc/me-framed.webp` (the framed photo)
- `public/images/drawings/border.png` (the hand-drawn text-box border)
- `public/images/logos/rrc_companies_logo.jpg`, `uw_blueprint_logo.jpg`,
  `uwcube_logo.jpg`, `technova_logo.jpg` (Experience row logos)

## Content — bio section

Framed photo on the left (`me-framed.webp`, its own 1368:1600 aspect ratio,
stacked above the text on narrow screens per the source's responsive
behavior, side-by-side at wider widths), paired with a bordered text block
on the right (`border.png` stretched to fit behind the text, same technique
as the source — `object-fill`, sized to match the text box's own rendered
height) containing:

- Heading: "Hello! I'm Amy"
- Four paragraphs, verbatim from the source:
  1. "I like pretty things and cool people... so I like design!"
  2. "Growing up, my friends called me a perfectionist. I'd say it's a flaw
     if it wasn't the reason I slave over every one of my creations, waiting
     for it to look *good* enough to post. (And I guess it isn't
     necessarily SLOW, just tedious...)"
  3. "I'm also known as... / - a dancer! I'm currently re-learning ballet
     pointe / - an overthinker. I'm a big fan of lore (harry potter, hunger
     games, just finished aot... talk about it with me) / - an engineer.
     I'm studying Management Engineering at Waterloo!" (line breaks, not
     separate paragraphs — source uses `<br />` inside one `<p>`)
  4. "You can reach me on [Linkedin], [X/Twitter], or by [email]!" — three
     inline links.
- Move this bio copy (heading + 4 paragraphs) into `lib/content.ts` under
  `content.en.about`, replacing the current `placeholder` key — matching how
  `content.en.playground` already holds that page's own copy (title,
  caption, toggle labels). Keep the social links themselves out of
  `content.ts`'s `about` block, though — see next point.
- Social links: the source pulls these from its own `lib/social.js`
  (`SOCIAL_LINKS`, ids `linkedin`/`x`/`email`). This repo doesn't have that
  file — reuse the hrefs already sitting in `content.en.footer.links` (or
  `content.en.hero.social`, same three URLs) instead of introducing a
  duplicate social-links module.

Keep the slide-up entrance (`framer-motion`, `initial={{opacity:0,y:40}}`,
matching the `SLIDE_UP_DURATION` convention already used on `/playground`).

## Content — Experience section

Below the bio, a second section listing work/community history — port
`lib/experience.ts`'s `EXPERIENCE` data (two groups, "Work" and
"Community", each a list of `{ company, title, date, logo }`) directly into
this repo's `lib/` as-is, and port `components/Experience.tsx`'s row
layout (logo thumbnail + company/title text on the left, date on the right
at wider widths, stacked under the company/title on narrow screens) as a new
component under `components/sections/About/`, restyled as CSS Modules per
the note above.

- Group heading style ("Work" / "Community"): same no-new-font treatment as
  the bio heading above.
- This section can be a plain `whileInView` scroll-reveal (as the source
  does) rather than firing on mount with the bio — they're visually two
  separate blocks stacked on the page.

## Acceptance checklist

- [ ] `/about` (already linked from the Taskbar on every non-home page)
      renders this content instead of the placeholder text.
- [ ] The whole page — bio section and Experience section both — shares the
      same `.pageContainer` left/right edges as the rest of the site (no
      independent `max-w-[1100px]`/`px-4`/`px-8` box drifting out of
      alignment with the Taskbar, Hero, Projects, or Playground sections
      above/below it).
- [ ] No Tailwind classes and no Instrument Serif font introduced — CSS
      Modules and the site's existing Roboto stack only, matching
      `Playground`'s own precedent for porting this same source repo.
- [ ] Bio copy lives in `lib/content.ts` under `content.en.about`; social
      links reuse `content.en.footer.links` (or `hero.social`) rather than a
      new social-links file.
- [ ] Experience data/rows render correctly at both a narrow (stacked) and
      wide (photo beside text, date on the row's right edge) viewport.
- [ ] Taskbar and Footer render normally above/below this content (already
      handled by `app/layout.tsx` — don't duplicate them in the page
      itself).
