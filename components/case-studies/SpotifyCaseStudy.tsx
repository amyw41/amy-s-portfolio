"use client";

import TextHighlight from "@/components/case-studies/TextHighlight";
import {
  BulletList,
  CaseStudyCta,
  CaseStudyHero,
  CaseStudyImage,
  CaseStudyLayout,
  HighlightBox,
  PlaceholderBox,
  Row,
  Section,
  TEXT,
  type SectionNavItem,
} from "@/components/case-studies/CaseStudyKit";

// Full case-study content for the Spotify Guessr project, replicated from
// Amy's old portfolio (https://amywang.framer.website/spotify) at her
// request: "copy this case study exactly."
//
// Layout, per Amy's correction: the whole page reads as a 2-column split.
// Left column (1fr) carries the label — the numbered section eyebrow
// ("01 / Initial Planning") stacked directly on top of the first
// subheading ("The Problem") for that section, then just the bare
// subheading for every row after that. Right column (1.5fr) carries the
// actual content — paragraphs, lists, placeholder media. No serif font
// anywhere on this page; font-body (Public Sans) only, weight does the
// differentiating.
//
// Shared layout/text/section primitives live in CaseStudyKit.tsx, used by
// every case study on the site — this file keeps only what's actually
// specific to Spotify Guessr: its section nav, meta/insight data, highlight
// color, and every Row's real content below.
//
// Rendered for the "spotify" project slug (this project's id in
// jar-portfolio, where this case study was originally written, was
// "spotify-guessr" — renamed here to match this site's own existing
// lib/projects.ts slug for the same project, its one canonical id) — see
// app/projects/[slug]/page.tsx.
const HIGHLIGHT = "#EFEDF5";

const SECTION_NAV: SectionNavItem[] = [
  { id: "initial-planning", label: "01 Initial Planning" },
  { id: "research", label: "02 Research" },
  { id: "design-process", label: "03 Design Process" },
  { id: "final-project", label: "04 Final Project" },
  { id: "learnings", label: "05 Learnings" },
];

// `values` is an array, not a comma-joined string — each entry renders on
// its own line instead of being run together after a comma.
const META = [
  { label: "TIMELINE", values: ["June 2026"] },
  { label: "TEAM", values: ["1 designer (me!)", "1 dev"] },
  { label: "ROLE", values: ["Product design", "Visual design"] },
  { label: "SKILLS", values: ["Product design", "Branding"] },
];

// `body` is JSX, not a plain string — each one wraps the specific phrase
// Amy flagged from her old site in TextHighlight, inline with the rest of
// the sentence around it.
const INSIGHTS = [
  {
    title: "Blend misrepresents actual listening taste",
    body: (
      <>
        Spotify Blends lose user trust because they{" "}
        <TextHighlight>don&apos;t accurately depict users&apos; music tastes</TextHighlight>, choosing shared songs
        over unique music.
      </>
    ),
  },
  {
    title: "Blend quality decays the longer it's used",
    body: (
      <>
        Infrequent updates and an unbalanced algorithm (one friend&apos;s plays dominating) make Blend feel{" "}
        <TextHighlight>increasingly homogeneous and unrepresentative over time.</TextHighlight>
      </>
    ),
  },
  {
    title: "Blend's value is social, not musical",
    body: (
      <>
        Users are drawn to Blends for the shared experience, where they compare statistics, music, etc.{" "}
        <TextHighlight>Losing the social hook kills engagement.</TextHighlight>
      </>
    ),
  },
  {
    title: "Lack of long-term draw",
    body: (
      <>
        Blend playlists are no longer relevant when the social factor is gone;{" "}
        <TextHighlight>users prefer listening to their own playlists</TextHighlight>, causing them to become
        irrelevant quick.
      </>
    ),
  },
];

export default function SpotifyCaseStudy() {
  return (
    <CaseStudyLayout sectionNav={SECTION_NAV}>
      <CaseStudyHero
        title="Spotify Guessr"
        subtitle="Turning a Spotify Blend into a party game"
        heroSrc="/images/projects/spotify/spotify.webp"
        heroAlt="Spotify Guessr app screens"
        highlightColor={HIGHLIGHT}
        meta={META}
        tldr="Spotify Blends lose their spark over time — shared songs crowd out real taste, and once the social hook fades, so does the reason to open them. Spotify Guessr turns a Blend into a multiplayer guessing game instead, keeping the social payoff front and center."
      />

      {/* 01 / Initial Planning */}
      <Section id="initial-planning">
        <Row
          eyebrow="01 / Initial Planning"
          heading="The Problem"
          media={
            <div className="space-y-[36px]">
              <PlaceholderBox
                label="85% of people use Blend but only 40% return."
                highlightColor={HIGHLIGHT}
              />
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
                <CaseStudyImage
                  src="/images/projects/spotify/survey_use.avif"
                  alt="Chart: Do you use Spotify Blend? 85% yes, 15% no"
                  ratio="512/275"
                  highlightColor={HIGHLIGHT}
                />
                <CaseStudyImage
                  src="/images/projects/spotify/survey_return.avif"
                  alt="Chart: Do you ever go back to a Blend after the first listen? 40% yes, 60% no"
                  ratio="512/266"
                  highlightColor={HIGHLIGHT}
                />
              </div>
            </div>
          }
        >
          <p>
            Every Spotify Blend begins with curiosity. People want to know: what&apos;s
            our match percentage? What secret song do we share? But curiosity dies
            down. By day 2, the playlist lays in your library, forgotten.
          </p>
          <p className="mt-[36px]">
            <TextHighlight>
              The problem isn&apos;t Spotify or the Blend itself; it&apos;s creating a
              reason to return.
            </TextHighlight>
          </p>
        </Row>

        <Row heading="The Solution">
          <p>
            A webapp that turns your Spotify Blend into a minigame — just sign in, play
            a song, and guess whose it is!
          </p>
        </Row>

        <Row
          heading="The Brief"
          media={
            <div className="grid grid-cols-1 gap-8 rounded-[10px] bg-[#f7f7f7] p-6 sm:grid-cols-3 sm:p-8">
              <BulletList
                title="Flow"
                items={[
                  "someone creates a room",
                  "room code → use to join room",
                  "start game after everyone joins",
                  "game begin",
                  "play song",
                  "list players",
                  "pick who the song belongs to",
                ]}
              />
              <BulletList
                title="Mechanics"
                items={[
                  "user chooses # rounds",
                  "default = 10 songs",
                  "rounds based on # songs",
                  "every correct guess = 1 point",
                  "first person gets most — top 3",
                ]}
              />
              <BulletList
                title="Game"
                items={[
                  "audience: teens+",
                  "no account",
                  "no player limit",
                  "spotify stats showing at the end of the game",
                  "spotify wrapped?",
                  "spotify compatibility",
                  "x and y listen to this genre",
                  "designed for mobile but can also play on desktop",
                ]}
              />
            </div>
          }
        >
          <p>
            I structured this project as a simulated client engagement, where{" "}
            <TextHighlight>my dev was the client and provided me with requirements.</TextHighlight>
          </p>
          <p className="mt-[36px]">
            I asked him a set of questions to make sure I fully understood the vision,
            then split them into 3 categories. This allowed me to visualize the product
            and begin my research.
          </p>
        </Row>
      </Section>

      {/* 02 / Research */}
      <Section id="research">
        <Row
          eyebrow="02 / Research"
          heading="Competitive Analysis"
          media={
            <div className="space-y-[36px]">
              <CaseStudyImage
                src="/images/projects/spotify/ca_img.avif"
                alt="Competitive analysis collage: Kahoot, Codenames, and Jackbox annotated with observations"
                ratio="1024/553"
                highlightColor={HIGHLIGHT}
              />
              <CaseStudyImage
                src="/images/projects/spotify/ca_result.avif"
                alt="Comparison table of Kahoot, Jackbox, and Codenames features"
                ratio="1024/263"
                highlightColor={HIGHLIGHT}
              />
            </div>
          }
        >
          <p>I compared several existing products to analyze what currently works and what doesn&apos;t.</p>
        </Row>

        <Row
          heading="Affinity Mapping"
          media={
            <CaseStudyImage
              src="/images/projects/spotify/am.avif"
              alt="Affinity map grouping survey responses into 4 key insight clusters"
              ratio="1024/863"
              bg={false}
            />
          }
        >
          <p>
            Through analysis of <TextHighlight>20 user survey responses (aged 17-24)</TextHighlight>, I mapped
            out the responses to better understand the problem.
          </p>
        </Row>

        <Row
          heading="4 Key Insights"
          tight
          media={
            <div className="space-y-4">
              {INSIGHTS.map((insight, i) => (
                <div key={insight.title} className="flex gap-4 rounded-[10px] bg-[#f7f7f7] p-6">
                  <span className="font-body text-lg font-medium text-black">{i + 1}</span>
                  <div>
                    <p className="font-body text-[18px] font-light text-black text-left">{insight.title}</p>
                    <p className={`mt-1 ${TEXT.content}`}>{insight.body}</p>
                  </div>
                </div>
              ))}
            </div>
          }
        ></Row>

        <Row
          heading="Problem Statement:"
          media={
            <HighlightBox bg="#f2f0f5">
              How might we extend the social excitement of Spotify Blend beyond the
              first interaction?
            </HighlightBox>
          }
        />
      </Section>

      {/* 03 / Design Process */}
      <Section id="design-process">
        <Row
          eyebrow="03 / Design Process"
          heading="Challenge"
          media={
            <HighlightBox bg="#fbeded">
              How do we make the product familiar to Spotify while also resembling its
              own creation?
            </HighlightBox>
          }
        />

        <div>
          {/* mb-2, not the old -mt-0.5 (a line-height-overlap hack) — same
              real gap Row's own eyebrow now uses, so this standalone
              group-header idiom reads identically to it. */}
          <p className={`${TEXT.header} mb-2`}>Spotify&apos;s Design System</p>
          <Row
            heading="Spotify's Main App"
            media={
              <CaseStudyImage
                src="/images/projects/spotify/main.avif"
                alt="Spotify main app screens annotated with design observations"
                ratio="1024/427"
                highlightColor={HIGHLIGHT}
              />
            }
          />
          <div className="mt-[72px]">
            <Row
              heading="Spotify Wrapped"
              media={
                <CaseStudyImage
                  src="/images/projects/spotify/wrapped.avif"
                  alt="Spotify Wrapped screens annotated with design observations"
                  ratio="991/1024"
                  highlightColor={HIGHLIGHT}
                />
              }
              after={
                <p>
                  Familiarity was easy; I decided to stick with{" "}
                  <TextHighlight>Spotify&apos;s iconic green as an accent color</TextHighlight>. I emulated the{" "}
                  <TextHighlight>chaotic vibe of Wrapped with pops of neon, shapes, and by creating mascots</TextHighlight>
                  .
                </p>
              }
            />
          </div>
        </div>

        <div>
          {/* mb-2, not the old -mt-0.5 (a line-height-overlap hack) — same
              real gap Row's own eyebrow now uses, so this standalone
              group-header idiom reads identically to it. */}
          <p className={`${TEXT.header} mb-2`}>Branding</p>
          <Row
            heading="Mascots"
            media={
              <CaseStudyImage
                src="/images/projects/spotify/branding.avif"
                alt="Triangle, star, and circle mascot characters in three poses each"
                ratio="1024/773"
                highlightColor={HIGHLIGHT}
              />
            }
          />
          <div className="mt-[72px]">
            <Row
              heading="Color Scheme"
              media={
                <CaseStudyImage
                  src="/images/projects/spotify/colors.avif"
                  alt="Color palette and typography scale for Spotify Guessr"
                  ratio="1024/563"
                  highlightColor={HIGHLIGHT}
                />
              }
            />
          </div>
        </div>

        <Row
          heading="Wireframing"
          headingClassName={TEXT.header}
          media={
            <CaseStudyImage
              src="/images/projects/spotify/lowfi.avif"
              alt="Low-fidelity wireframes of the Spotify Guessr screens and flow"
              ratio="1445/2048"
              highlightColor={HIGHLIGHT}
            />
          }
        >
          <p>
            I mapped out the screens + flow using low-fidelity wireframes, ensuring
            navigation was smooth.
          </p>
        </Row>

        <Row
          heading="Navigation Problem"
          media={
            <div className="space-y-[36px]">
              <HighlightBox bg="#fbeded">
                Users needed a way to move between stat cards without breaking the
                visual rhythm of the layout.
              </HighlightBox>
              <p className={TEXT.content}>
                Currently, the cards are aligned vertically. Do users swipe, tap, or
                should they click somewhere else on the screen?
              </p>
              <CaseStudyImage
                src="/images/projects/spotify/choice1.avif"
                alt="Three navigation options compared: horizontal arrows, vertical arrows, no arrows"
                ratio="1024/859"
                highlightColor={HIGHLIGHT}
              />
            </div>
          }
        />

        <Row heading="Decision">
          <p>
            Despite the vertical arrows having a clear next step, I decided against it
            because it cluttered the screen too much.
          </p>
          <p className="mt-[36px]">
            <TextHighlight>So we went with the no-arrow option.</TextHighlight> Users can{" "}
            <TextHighlight>swipe or tap</TextHighlight> to move onto the next screen. The layering is intuitive
            enough for the next step to be obvious.
          </p>
        </Row>
      </Section>

      {/* 04 / Final Project */}
      <Section id="final-project">
        <Row
          eyebrow="04 / Final Project"
          heading="Screens"
          media={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <CaseStudyImage
                  key={i}
                  src={`/images/projects/spotify/${i + 1}.avif`}
                  alt={`Spotify Guessr final screen ${i + 1}`}
                  ratio="1002/2048"
                  bg={false}
                  sizes="(min-width: 1024px) 180px, (min-width: 640px) 30vw, 45vw"
                />
              ))}
            </div>
          }
          after={
            <CaseStudyCta
              href="https://www.figma.com/proto/0i9bMQFOCCtSDtrcVcJqNO/spotify-game?node-id=66-264&starting-point-node-id=66%3A264"
              highlightColor={HIGHLIGHT}
            >
              Check out the Figma prototype!
            </CaseStudyCta>
          }
        />
      </Section>

      {/* 05 / Learnings */}
      <Section id="learnings">
        <Row eyebrow="05 / Learnings" heading="Working with a client">
          <p>
            As the designer taking on a client, it is important to understand ALL of
            their needs &amp; expectations! This means ensuring that you are
            communicating throughout the process, checking in to make sure everything
            is okay, and consistently asking questions.
          </p>
          <p className="mt-[36px]">
            Sometimes, the client doesn&apos;t have a tech background and will not
            understand the plausibility of certain features. Other times, they will not
            be able to communicate what they don&apos;t explicitly like about a design.
            As the sole product designer, it was my job to make sure I was transparent
            and created something that met the client&apos;s standard!
          </p>
        </Row>
      </Section>
    </CaseStudyLayout>
  );
}
