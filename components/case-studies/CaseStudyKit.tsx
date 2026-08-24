"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAutoPlayInView } from "@/lib/useAutoPlayInView";

// Shared building blocks behind every written case study on the site
// (SkinSprout, Spotify Guessr, CyberSea) — extracted so the three don't
// carry independent copies of the same layout system, text styles, and
// sidebar scroll-spy nav. Each case study still owns all of its actual
// content (copy, images, meta/insight data) and its own SECTION_NAV; only
// the presentational shell and primitives live here.
//
// Ported from an older portfolio (jar-portfolio) largely as-is — the
// Tailwind-based layout/animation work was already built and tuned there,
// and hand-converting it to this site's own CSS-Modules system would be a
// high-risk rewrite of animation-heavy, already-correct code for no visual
// benefit. See app/projects/[slug]/case-study.css for how Tailwind is
// scoped to just this route so it can't affect the rest of the site.

// Text system every case study page uses:
//   header    — section number/title (e.g. "01 / Initial Planning"): black, medium, 28px
//   subheader — the sub-label (e.g. "The Problem"): black/60, regular, 24px
//   content   — body copy: black/60, light, 18px
//   frame     — text sitting inside a colorful/placeholder box: black/60, light, 24px
//   groupHeader — mid-section group labels above a cluster of Rows, one
//     notch bolder than subheader so it reads as a grouping label, not just
//     another row in the list
export const TEXT = {
  header: "font-body text-[28px] font-medium text-black text-left",
  subheader: "font-body text-[24px] font-normal text-black/60 text-left",
  content: "font-body text-[18px] font-light leading-relaxed text-black/60 text-left",
  frame: "font-body text-[22px] font-light text-black/60 text-left",
  groupHeader: "font-body text-[24px] font-medium text-black/80 text-left",
};

// Fallback tint behind a placeholder/neutral image box when a case study
// doesn't pass its own — each case study's actual highlight color (Spotify's
// lavender EFEDF5, CyberSea's pale blue e5eef7, SkinSprout's pink faf1f6)
// is supplied per-call via the `highlightColor` prop below rather than this
// shared module hardcoding one project's color as everyone's default.
const DEFAULT_HIGHLIGHT = "#EFEDF5";

// `ratio` is only meaningful for boxes that stand in for a real
// image/screenshot — omit it and the box sizes itself off its own text with
// tight py-[14px] padding instead of a fixed aspect-ratio height.
// `bg` (on by default) is the neutral backdrop for screenshots/diagrams shot
// on white; turn it off for media that already carries its own background
// (e.g. a phone mockup PNG with a transparent/device-framed backdrop baked
// in) so this box doesn't add a second one behind it.
// `video` needs autoplay/muted/loop instead of next/image, but still shares
// this same box (aspect-ratio, rounded corners, optional bg) rather than
// duplicating the wrapper just for one case.
export function CaseStudyImage({
  src,
  alt,
  ratio,
  bg = true,
  video = false,
  highlightColor = DEFAULT_HIGHLIGHT,
  className = "",
  sizes = "(min-width: 768px) 900px, 100vw",
}: {
  src: string;
  alt: string;
  ratio: string;
  bg?: boolean;
  video?: boolean;
  highlightColor?: string;
  className?: string;
  sizes?: string;
}) {
  const videoRef = useAutoPlayInView<HTMLVideoElement>();

  return (
    <div
      style={{ aspectRatio: ratio, backgroundColor: bg ? highlightColor : undefined }}
      className={`relative w-full overflow-hidden rounded-[8px] ${className}`}
    >
      {video ? (
        // No `autoPlay` — see useAutoPlayInView, starts fresh from the
        // beginning once actually scrolled into view instead of on mount.
        <video
          ref={videoRef}
          src={src}
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          // Turbopack's dev-mode image-optimization cache doesn't bust when
          // a file is replaced at the same path (it keeps serving the
          // first-ever encode indefinitely) — case-study images get swapped
          // often during design iteration, so skip the optimizer in dev to
          // always show the current file. Production still gets normal
          // next/image optimization.
          unoptimized={process.env.NODE_ENV !== "production"}
          className="object-cover"
        />
      )}
    </div>
  );
}

export function PlaceholderBox({
  ratio,
  label = "Image placeholder",
  highlightColor = DEFAULT_HIGHLIGHT,
  className = "",
}: {
  ratio?: string;
  label?: string;
  highlightColor?: string;
  className?: string;
}) {
  return (
    <div
      style={{ ...(ratio ? { aspectRatio: ratio } : undefined), backgroundColor: highlightColor }}
      className={`flex w-full items-center justify-center rounded-[8px] px-6 text-center ${TEXT.frame} ${ratio ? "" : "py-[14px]"} ${className}`}
    >
      {label}
    </div>
  );
}

// One row of a case study's 2-col rhythm. `eyebrow` only appears on the
// first row of a numbered section, stacked above `heading`.
//
// Real CSS grid (not flexbox) on purpose: `media` is a grid item spanning
// both columns (md:col-span-2), so grid's own auto-placement puts it in a
// *new grid row* that starts below whichever of the label/content columns
// is taller — not just "24px after the paragraph regardless of what's
// happening in the other column". With flexbox, each column stacked
// independently off its own content, so a full-width image could land right
// under a short label with almost no visual gap, purely by coincidence of
// the two columns' heights nearly matching.
// `after` is for the rare case where more text follows the media — it also
// becomes its own grid row, again positioned correctly regardless of
// media's actual rendered height.
export function Row({
  eyebrow,
  heading,
  headingClassName,
  children,
  media,
  after,
  tight,
}: {
  eyebrow?: string;
  heading: string;
  // Overrides the default TEXT.subheader styling on `heading` — for a
  // heading that should read as the bolder TEXT.header/groupHeader tier
  // instead (e.g. Spotify's "Wireframing").
  headingClassName?: string;
  children?: ReactNode;
  media?: ReactNode;
  after?: ReactNode;
  // Forces the tighter heading-to-children gap even when children is
  // present — for a heading whose very first line reads as one
  // header/subheader pair with it, not two separate ideas.
  tight?: boolean;
}) {
  // Per-block margins instead of one shared grid `gap-y` — needed so
  // tightening one relationship (heading-to-media) can't also tighten a
  // different one (media-to-after) that happens to sit in the very next
  // grid row. A single `gap-y` can't tell those two gaps apart; explicit
  // margins on each block can.
  //
  // `mediaGap`: a heading with no `children` has nothing standing between
  // it and `media` — the media *is* what the heading is labeling, not a
  // separate idea introduced by a paragraph in between. That's a tight
  // header/caption relationship by default, so it gets the smaller gap
  // automatically rather than needing every such Row to opt in
  // individually — but only when children is genuinely absent; if children
  // *is* present, media is following real paragraph text (not the heading
  // directly) and keeps the normal gap.
  //
  // `after` deliberately always keeps the normal 36px gap regardless of
  // `mediaGap`/`tight` — it's real trailing content, not a caption, so
  // squeezing it against `media` the same way would read as cramped rather
  // than related.
  const childrenGap = tight ? "mt-2 md:mt-0" : "mt-[36px] md:mt-0";
  const mediaGap = children ? "mt-[36px]" : "mt-2";
  return (
    <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] md:gap-x-12">
      <div className="md:col-start-1">
        {eyebrow && <p className={TEXT.header}>{eyebrow}</p>}
        {/* eyebrow and heading here are two plain sibling <p>s inside the
            same div, so mt-0 alone left a gap: each line still carries its
            own line-height plus the font's own internal ascent/descent
            padding, neither of which margin-top:0 touches. Negative margin
            is what actually pulls it in past that residual space. */}
        <p className={`${eyebrow ? "-mt-0.5 " : ""}${headingClassName ?? TEXT.subheader}`}>{heading}</p>
      </div>
      {children && (
        <div className={`min-w-0 md:col-start-2 ${childrenGap} ${TEXT.content}`}>{children}</div>
      )}
      {media && <div className={`md:col-span-2 ${mediaGap}`}>{media}</div>}
      {/* Full width (md:col-span-2, matching `media`) — `after` follows a
          full-width image with no heading of its own beside it, so
          confining it to just the narrow content column (like `children`)
          left it looking squeezed relative to the image directly above
          it. */}
      {after && <div className={`min-w-0 md:col-span-2 mt-[36px] ${TEXT.content}`}>{after}</div>}
    </div>
  );
}

// One numbered section (01 Initial Planning, 02 Research, ...) — owns the
// spacing system. Anchored to the page's own 18px body text (TEXT.content):
// 8x18=144px between sections, 4x18=72px between Rows/subsections (Row's
// own gap-y-[36px] handles the 2x tier, between text/media within a
// subsection). One definition here means every case study's section
// spacing can't quietly drift out of sync the way copy-pasting this
// className onto each <section> tag by hand eventually did.
export function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-[120px] scroll-mt-24 space-y-[72px]">
      {children}
    </section>
  );
}

export function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-body text-[18px] font-light text-black/80 text-left">{title}</p>
      <ul className={`mt-2 space-y-1 ${TEXT.content}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true">–</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type SectionNavItem = { id: string; label: string };

// Which section is currently scrolled into view — "active" means whichever
// Section's own element is the one actually in view right now (these are
// same-page #anchor links, not routes, so there's no pathname to match
// against). rootMargin biases the observer toward a line near the top of
// the viewport (not the full viewport height) so the active link swaps
// roughly when a section's heading reaches the top, not whenever any sliver
// of it is visible.
function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

// `className` supplies the full flex layout (direction/wrap/gap) so the
// fixed sidebar version and the mobile inline-row fallback don't fight each
// other over a shared default. font-instrument (serif); the active section
// (see useActiveSection) gets the site's case-study accent blue.
//
// Slides in from the left on mount, in step with CaseStudyHero's own
// fade/slide-up (no delay — both start together). Both call sites (the
// sticky desktop sidebar and the mobile inline fallback) get this for free
// since it lives here, not per call site — same reasoning CaseStudyHero
// itself already uses for owning HERO_RATIO.
const TOC_DELAY = 0;

function TableOfContents({
  sectionNav,
  className,
  style,
}: {
  sectionNav: SectionNavItem[];
  className: string;
  style?: CSSProperties;
}) {
  const activeId = useActiveSection(sectionNav.map((s) => s.id));

  return (
    <motion.nav
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: TOC_DELAY }}
      className={`flex text-left font-instrument text-2xl font-light text-black/60 ${className}`}
      style={style}
    >
      {sectionNav.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`text-left transition-colors hover:text-[#2460A4] ${activeId === s.id ? "text-[#2460A4]" : ""}`}
        >
          {s.label}
        </a>
      ))}
    </motion.nav>
  );
}

// Every case study's hero box locks to this one ratio (CyberSea's own hero
// video, 848x636) rather than each page picking a ratio to match its own
// source file's real dimensions — that per-asset matching is exactly right
// for body content (see CaseStudyImage's `ratio` prop elsewhere on a page,
// still per-call) but wrong for the hero specifically, since the hero is the
// one box every case study puts in the same spot and readers compare page to
// page. object-cover (inside CaseStudyImage) crops each source video/image
// to this shape instead of showing it at its own native proportions.
export const HERO_RATIO = "848/636";

// The hero block — title, subtitle, hero image, and the timeline/team/role/
// skills meta box, rendered (and animated) as one unit: it fades/slides up
// on mount in step with TableOfContents's own slide-in-from-left (see
// TOC_DELAY there), so opening a case study reads as everything arriving
// together rather than one piece settling before the next. Takes the
// hero media's own src/alt/video/highlightColor directly (not a pre-built
// <CaseStudyImage/> node) so this component is the one place HERO_RATIO gets
// applied — a case study can't accidentally diverge from it the way it could
// if each page built its own hero image element by hand.
export function CaseStudyHero({
  title,
  subtitle,
  heroSrc,
  heroAlt,
  heroVideo = false,
  highlightColor,
  meta,
}: {
  title: string;
  subtitle: string;
  heroSrc: string;
  heroAlt: string;
  heroVideo?: boolean;
  highlightColor?: string;
  meta: { label: string; values: string[] }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <h1 className="font-instrument text-[clamp(2.75rem,7.5vw,4.5rem)] font-normal leading-none tracking-[-0.04em] text-black/90">
        {title}
      </h1>
      <p className="mt-3 font-body text-[20px] font-light text-black/70">{subtitle}</p>

      <div className="mt-8">
        <CaseStudyImage
          src={heroSrc}
          alt={heroAlt}
          ratio={HERO_RATIO}
          video={heroVideo}
          highlightColor={highlightColor}
          sizes="(min-width: 768px) 946px, 100vw"
        />
      </div>

      <div className="mt-8 grid grid-cols-2 items-start justify-items-center gap-6 rounded-[10px] border border-gray-200 p-6 text-center sm:grid-cols-4">
        {/* Extra bottom padding on every column but the first — added
            per-column instead of bumping the box's own shared p-6, which
            would pad every column (including ones with a single short
            value) and grow the box/border taller than necessary just to
            give the already-tallest columns more breathing room. */}
        {meta.map((m, i) => (
          <div key={m.label} className={`text-center ${i !== 0 ? "pb-3" : ""}`}>
            <p className="font-instrument text-[28px] font-medium tracking-[-0.035em] text-black/80">{m.label}</p>
            {m.values.map((v) => (
              <p key={v} className="mt-1 font-body text-lg font-light text-black/70">
                {v}
              </p>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Gutter math for the sidebar breakpoint below: the content column now
// centers itself using the site's own .pageContainer contract (app/
// globals.css) — width: min(100% - 2*pad, --content-max), --content-max:
// 1050px (lib/tokens.css) — instead of an ad hoc max-w/px combo, so it
// lands on the exact same horizontal center as every homepage section at
// every viewport width. --content-max already caps the content width (i.e.
// 100% - 2*--pad > 1050px) starting around an ~1221px-wide viewport, well
// below anywhere the sidebar could plausibly fit — so at every viewport
// width this breakpoint actually cares about, each side gutter is simply
// (viewport - --content-max) / 2, independent of --pad's own value. The
// fixed sidebar (w-72 = 288px) needs to fit in that
// gutter with room to spare on both sides — 32px between the sidebar and
// the content column, and another 32px between the sidebar and the true
// viewport edge — so it never touches or nudges the content column:
//   gutter >= 288 + 32 + 32 = 352
//   (viewport - 1050) / 2 >= 352  =>  viewport >= 1754
// Rounded up to 1760px for a clean value with a little extra breathing
// room past the exact boundary. Below this, TableOfContents' inline mobile/
// tablet fallback (rendered inside the content column below) is what shows
// instead — plain `lg` (1024px) would show the sidebar while the gutter is
// still far narrower than 288px, overlapping the content column.
//
// The `min-[1760px]:` breakpoint below is written out literally at each use
// (not held in a JS constant and interpolated into a className) because
// Tailwind's class scanner matches literal text in source files — a
// template-literal-built class name like `${x}:block` never appears as
// that exact string anywhere in this file, so it would silently fail to
// generate. If this number ever needs to change, update every
// `min-[1760px]:` below together with the math above.

// The full page shell every case study shares: a sticky left sidebar
// (desktop) with the numbered-section nav, a mobile inline fallback of that
// same nav, and a centered content column — `children` is everything below
// the section nav (hero + numbered <Section>s).
export function CaseStudyLayout({ sectionNav, children }: { sectionNav: SectionNavItem[]; children: ReactNode }) {
  return (
    // Full-bleed row — breaks out of whatever ancestor layout the app router
    // wraps this route in (this site has no shared max-width/padded section
    // around page content the way some sites do, but this still needs to
    // hold even if that ever changes) so the sidebar below can anchor off
    // the true left edge of the viewport regardless. `100vw` is the only
    // unit that reaches the true viewport edge regardless of an ancestor's
    // own width — a percentage-based negative-margin breakout can't reach
    // past a max-width ancestor on any viewport wider than that cap.
    // `100vw` does include the vertical scrollbar's own width, though —
    // that's handled globally by the root layout's `overflow-x: clip`
    // (deliberately clip, not hidden — hidden silently breaks
    // position:sticky for every descendant, including the sidebar below).
    //
    // `relative` — the anchor `aside` below positions itself off of this
    // element (not the flex/grid content column), which is exactly the
    // point: taking the sidebar out of flow here means adding or removing
    // it can never change the content column's own centering math.
    //
    // `tw-scope` — see case-study.css's own top comment: this class is what
    // scopes the hand-picked preflight subset (border-style, list-style,
    // link color/decoration, ...) to exactly this component's own subtree,
    // so Tailwind can't visually affect anything outside a case-study page.
    <div className="tw-scope relative left-1/2 w-screen -translate-x-1/2">
      {/* Absolutely positioned against the row above, NOT a flex/grid
          sibling of the content column — it occupies zero layout space, so
          the content column's centering (via .pageContainer below) is
          identical whether this renders or not. `inset-y-0` stretches this
          outer box to the row's own height (i.e. the content column's
          height, since that's the row's only in-flow child) purely so the
          sticky box nested inside knows where to stop — see that box's own
          comment. */}
      <aside className="absolute inset-y-0 left-0 z-10 hidden w-72 min-[1760px]:block">
        {/* `sticky`, not `fixed` — fixed floats free of the document and
            bleeds over the footer once scrolled past the end of the case
            study. Sticky is bounded by its containing block — the `aside`
            above, whose `inset-y-0` makes that exactly the content column's
            own height — so it naturally stops exactly where the content
            ends instead of covering the site's global Footer.

            top-0 / h-dvh — unlike jar-portfolio (where this was ported
            from), this site has no sticky/fixed global header for the
            sidebar to clear, so it sticks straight to the true top of the
            viewport instead of offsetting below one. */}
        <div className="sticky top-0 flex h-dvh w-72 flex-col border-r border-gray-200 bg-white px-10 py-8">
          {/* Slide-in-from-left mount animation lives inside TableOfContents
              itself (see TOC_DELAY there) — shared by this sidebar and the
              mobile inline fallback below instead of duplicated per call. */}
          <TableOfContents sectionNav={sectionNav} className="flex-col gap-3" />
        </div>
      </aside>

      {/* Same width/centering contract as every homepage section (see the
          gutter-math comment above) — no extra px-* here on top of it,
          same as Hero/Projects/Footer's own use of this class, so the
          edges match exactly rather than just approximately. */}
      <div className="pageContainer">
        {/* pt-8 lines the title up with the sidebar's own py-8 (32px).
            pb-24 at the bottom — the sidebar is deliberately flush against
            the footer with no gap, but that's the sidebar's border/
            background, not this text column: without its own bottom
            padding, the last paragraph's text would butt directly up
            against the footer. */}
        <div className="pb-24 pt-8 text-left">
          {/* Same section links, inline — mobile/tablet fallback for the
              sticky sidebar, which is hidden below the 1760px sidebar
              breakpoint. */}
          <TableOfContents
            sectionNav={sectionNav}
            className="mb-8 flex-row flex-wrap gap-x-6 gap-y-2 text-sm min-[1760px]:hidden"
          />

          {children}
        </div>
      </div>
    </div>
  );
}
