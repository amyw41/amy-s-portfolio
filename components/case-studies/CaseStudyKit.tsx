"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAutoPlayInView } from "@/lib/useAutoPlayInView";
import {
  buildWobblyPillPath,
  PILL_STROKE_COLOR,
  PILL_STROKE_WIDTH,
  PILL_VIEW_BOX,
} from "@/components/sections/Hero/wobblyOval";

// Hand-sketched hover ring for this Back button — the wobbly PILL variant
// (wobblyOval.ts's buildWobblyPillPath), not the hero/taskbar's own wide
// oval: an ellipse stretched over "← Back"'s much shorter, wider box reads
// as a nearly flat, barely-visible line (see that function's own comment).
// This route is Tailwind-based (see this file's own top comment), so unlike
// the other two usages this is revealed via Tailwind's group/group-hover
// rather than a CSS Module :hover rule, but it's the exact same underlying
// mechanism. vectorEffect="non-scaling-stroke" keeps the line clearly
// visible at this button's small font-size, where the oval's own thin
// stroke would have all but disappeared. Was a bigger 12px expand + full
// opacity on hover at first (to fix the oval's own near-invisibility) —
// dialed back per request once the pill shape/thickness alone was already
// legible: 20px expand gives "BACK" more breathing room inside the ring
// (its K no longer touches the edge), 0.55 opacity reads as a lighter,
// less-solid-black line instead.
function ScribbleOval({ seed, active = false }: { seed: number; active?: boolean }) {
  const path = useMemo(() => buildWobblyPillPath(seed), [seed]);
  return (
    <svg
      className={`pointer-events-none absolute -left-6 -top-1.5 h-[calc(100%+12px)] w-[calc(100%+48px)] transition-opacity duration-150 ${
        active ? "opacity-[0.55]" : "opacity-0 group-hover:opacity-[0.55]"
      }`}
      viewBox={PILL_VIEW_BOX}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={PILL_STROKE_COLOR}
        strokeWidth={PILL_STROKE_WIDTH}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

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
  header: "font-body text-[clamp(22px,2.4vw,28px)] font-medium text-black text-left",
  subheader: "font-body text-[clamp(19px,2vw,24px)] font-normal text-black/60 text-left",
  content: "font-body text-[clamp(16px,1.45vw,18px)] font-light leading-relaxed text-black/60 text-left",
  frame: "font-body text-[clamp(18px,1.75vw,22px)] font-light text-black/60 text-left",
  groupHeader: "font-body text-[clamp(20px,2.1vw,24px)] font-medium text-black/80 text-left",
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
      // Border removed per request — every case-study image (screenshots,
      // phone mockups, videos alike) went through this one component, so
      // dropping it here removes it everywhere at once.
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
    <div>
      {/* eyebrow rendered as its own full-width block ABOVE the grid, not
          as a second stacked <p> inside the grid's left column alongside
          heading (the old structure — see git blame if curious). That old
          layout needed heading pulled up with a hand-tuned -mt-0.5 to sit
          close to eyebrow, AND meant `children` (the right column below,
          via childrenGap's md:mt-0) started level with the TOP of the left
          column — i.e. flush with eyebrow's own line, spanning down past
          heading too, when it should read as aligned with heading/subheader
          alone. Both problems were really one problem: eyebrow living
          inside the same grid row as heading. Pulling it out fixes both at
          once — heading is now the only thing at the top of the grid's left
          column, so children (right column, same grid row) naturally lines
          up with heading, not eyebrow. mb-2 below is the actual, real gap
          between eyebrow and heading (not a line-height-overlap
          compensation hack) — the exact same class every standalone
          "group label" header elsewhere in these case studies
          (SkinSprout's "03 / Design Process", CyberSea's "06 / Learnings",
          Spotify's "Spotify's Design System"/"Branding") now also uses
          above ITS own next block, so every header-to-subheader gap on
          these pages reads as the same distance, whichever of the two ways
          it's built. */}
      {eyebrow && <p className={`${TEXT.header} mb-2`}>{eyebrow}</p>}
      <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr] lg:grid-cols-[16rem_1fr] md:gap-x-8 lg:gap-x-12">
        <div className="md:col-start-1">
          <p className={headingClassName ?? TEXT.subheader}>{heading}</p>
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
    <section id={id} className="first-of-type:mt-[30px] md:first-of-type:mt-[64px] mt-[120px] scroll-mt-24 space-y-[72px]">
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
  const idKey = ids.join(",");

  useEffect(() => {
    const idList = idKey ? idKey.split(",") : [];
    const elements = idList.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
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
  }, [idKey]);

  return activeId;
}

// `className` supplies the flex layout (direction/wrap/gap).
// font-instrument (serif); the active section (see useActiveSection) gets
// the site's case-study accent blue.
const TOC_DELAY = 0;

function TableOfContents({
  sectionNav,
  className,
  style,
  home = false,
}: {
  sectionNav: SectionNavItem[];
  className: string;
  style?: CSSProperties;
  // When true, renders a ← BACK button above the section links — calls
  // router.back() so the browser restores the user to their exact scroll
  // position on the previous page rather than jumping to the top.
  home?: boolean;
}) {
  const activeId = useActiveSection(sectionNav.map((s) => s.id));
  const router = useRouter();

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: TOC_DELAY }}
      // Size matched exactly to TEXT.content (the case study's own body
      // copy) per request — was its own close-but-not-quite
      // clamp(16px,1.5vw,18px).
      className={`flex text-left font-instrument leading-none text-[clamp(16px,1.45vw,18px)] font-light text-black/60 ${className}`}
      style={style}
    >
      {home && (
        // leading-none — the sidebar's own pt matches CaseStudyHero's h1 pt
        // exactly (see CaseStudyLayout), but the h1 is set leading-none
        // too, so its glyph sits right at the top of its own padding box;
        // this nav's normal line-height was adding extra space above BACK's
        // glyph that the h1 doesn't have, making the two look misaligned
        // even though their boxes start at the same y. leading-none here
        // closes that gap so both read as starting the same distance down.
        <button
          type="button"
          onClick={() => router.back()}
          // Was a bare "← Back" text link with a hand-drawn scribble-oval
          // hover ring (see ScribbleOval above, still used by the section
          // links below) — replaced with a solid black circle + arrow per
          // request, same treatment as the Playground plate page's own Back
          // button (CategoryDetail.module.css), so "back" reads as one
          // consistent control everywhere on the site. Hover is now a plain
          // opacity fade (matching this file's other CTA-style buttons)
          // instead of the scribble reveal — no more need for `relative`/
          // `group` now that there's no absolutely-positioned ring riding
          // on top of this button. self-start still needed: TableOfContents'
          // own flex-col container defaults to align-items: stretch, which
          // would otherwise stretch this button to the sidebar's full width.
          className="mb-5 flex w-fit items-center gap-2 self-start bg-transparent border-none p-0 cursor-pointer font-instrument leading-none text-[length:var(--fs-small)] font-extralight tracking-[-0.03em] uppercase text-black/40 transition-opacity duration-300 ease-out hover:opacity-[0.615]"
        >
          <span
            aria-hidden="true"
            className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-black text-[12px] leading-none text-white"
          >
            ←
          </span>
          Back
        </button>
      )}
      {sectionNav.map((s, idx) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`group relative text-left transition-colors whitespace-nowrap w-fit self-start ${
            activeId === s.id ? "text-[#2460A4]" : "text-black/60 hover:text-[#2460A4]"
          }`}
        >
          <ScribbleOval seed={idx + 10} active={activeId === s.id} />
          {s.label}
        </a>
      ))}
    </motion.nav>
  );
}

// Every case study's hero box locks to 3/2 to match the homepage's project
// thumbnail ratio. object-cover (inside CaseStudyImage) crops each source
// video/image to this shape instead of showing it at its own native proportions.
export const HERO_RATIO = "3/2";

// The hero block — title, subtitle, hero image, and the timeline/team/role/
// skills meta box, rendered (and animated) as one unit: it fades in on
// mount in step with TableOfContents's own fade-in (see TOC_DELAY there),
// so opening a case study reads as everything arriving together rather than
// one piece settling before the next. Takes the hero media's own
// src/alt/video/highlightColor directly (not a pre-built <CaseStudyImage/>
// node) so this component is the one place HERO_RATIO gets applied — a
// case study can't accidentally diverge from it the way it could if each
// page built its own hero image element by hand.
export function CaseStudyHero({
  title,
  titleClassName,
  subtitle,
  heroSrc,
  heroAlt,
  heroVideo = false,
  highlightColor,
  meta,
}: {
  title: string;
  // Overrides the default title size below — for SkinSprout, whose own
  // "SkinSprout" title read a bit large next to the rest of its page, per
  // request. Per-call, not a shared shrink: CyberSea/Spotify keep the
  // original shared clamp() untouched.
  titleClassName?: string;
  subtitle: string;
  heroSrc: string;
  heroAlt: string;
  heroVideo?: boolean;
  highlightColor?: string;
  meta: { label: string; values: string[] }[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* font-light (300), not the old font-normal (400) — matches the
          homepage's own h1 weight (Hero.module.css's .title), per request
          that this read the same as "amy wang's jar" on the homepage
          rather than noticeably bolder. Shared by all 3 case studies (this
          component, not any one page's own file), so they all match the
          homepage consistently rather than one getting a special case. */}
      <h1
        className={`font-instrument ${titleClassName ?? "text-[clamp(2.75rem,7.5vw,4.5rem)]"} font-light leading-none tracking-[-0.04em] text-black/90`}
      >
        {title}
      </h1>
      <p className="mt-3 font-body text-[clamp(16px,1.56vw,20px)] font-light text-black/70">{subtitle}</p>

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
            <p className="font-instrument text-[clamp(20px,2.2vw,28px)] font-medium tracking-[-0.035em] text-black/80">{m.label}</p>
            {m.values.map((v) => (
              <p key={v} className="mt-1 font-body text-[clamp(14px,1.3vw,17px)] font-light text-black/70">
                {v}
              </p>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// The responsive case study layout — deliberately the simplest version that
// gets this right, after a few rounds of over-engineering it (absolute
// positioning + a live clamp()/calc() width formula to dodge overlap, a
// divider line, custom breakpoints). Plain flexbox: sidebar and content are
// ordinary siblings inside .pageContainer, which already gives them the
// same width/centering as the taskbar above and every other section on the
// site — nothing here needs to compute or guard against overlap, because
// normal flow siblings simply can't overlap each other. At 1024px (`lg`,
// matching jar-portfolio's own breakpoint, which this file was ported from)
// the sidebar hides and the content falls back to an inline top-nav with a
// Back button instead.
export function CaseStudyLayout({ sectionNav, children }: { sectionNav: SectionNavItem[]; children: ReactNode }) {
  return (
    <div className="tw-scope min-h-screen bg-white">
      <div className="pageContainer flex w-full gap-10 lg:gap-16">
        {/* h-fit — sticks to its own content height, not stretched to match
            <main>'s (flex's default align-items:stretch would otherwise
            make it tall enough to overlap the footer while sticky).
            top-0 — this is the actual fix (earlier attempts tried top-14,
            then a JS-measured CSS var, then a plain top-6; all of them left
            a permanent gap between the sidebar and the top of the screen
            once stuck, instead of the sidebar rising to close it). With
            top-0, the sidebar isn't sticky at all yet while the taskbar
            (which scrolls away normally, it's not fixed) is still above
            it — it just scrolls up the page at the same rate as everything
            else, staying wherever it naturally sits below the taskbar. It
            only locks in place the instant its own top edge would cross
            above the very top of the viewport — which is exactly the
            moment the taskbar has fully scrolled out of view — so it rises
            to fill the space the taskbar leaves behind, then sits flush
            against the top for the rest of the page. */}
        <aside className="sticky top-0 hidden h-fit w-48 shrink-0 pb-24 pt-8 lg:block lg:pt-14">
          <TableOfContents sectionNav={sectionNav} className="flex-col gap-3.5" home />
        </aside>

        {/* Main reading content: shrinks responsively with the container.
            Below 1024px the sidebar above just hides — no inline top-nav
            fallback anymore (an earlier version showed a Back button +
            horizontal section list here); per request, this breakpoint now
            reads as just the taskbar and then straight into the content,
            nothing else. */}
        <main className="min-w-0 flex-1 pb-24 pt-8 lg:pt-14 text-left">
          {children}
        </main>
      </div>
    </div>
  );
}
