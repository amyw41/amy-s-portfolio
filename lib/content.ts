/**
 * All user-facing copy lives here, nested per-locale so a `zh` key can be
 * added later without touching any component. Components read
 * `content.en.<section>.<key>` (or take the active locale as a prop once
 * the language toggle is wired up).
 */
export const content = {
  en: {
    hero: {
      title: "amy wang's jar",
      tagline: "adding a little whimsy to every intuitive design.",
      social: {
        linkedin: { label: "LinkedIn", href: "https://linkedin.com/in/amyw41" },
        gmail: { label: "Email", href: "mailto:amy.wang1@uwaterloo.ca" },
        twitter: { label: "Twitter", href: "https://twitter.com/apriberri" },
      },
      nav: {
        work: "my work",
        about: "about me",
        playground: "playground",
      },
      toggles: {
        projects: "projects",
        favourites: "favourites",
      },
    },
    // Separate from hero.nav above on purpose — same three destinations,
    // deliberately shorter labels ("work" not "my work", "about" not
    // "about me") to fit the taskbar's smaller pill. Not derived from one
    // shared string set so the two can keep reading right for their very
    // different contexts (large hero column vs. compact floating pill).
    taskbar: {
      work: "work",
      about: "about",
      playground: "playground",
    },
    projects: {
      heading: "what's inside?",
      filters: {
        work: "work",
        personal: "personal project",
        hackathon: "hackathon",
      },
      extras: {
        title: "Extras",
        description: "A few more things worth a look.",
        modalTitle: "Extras",
        galleryPlaceholder: "Gallery — coming soon.",
        closeLabel: "Close",
      },
    },
    footer: {
      links: {
        linkedin: { label: "Linkedin", href: "https://linkedin.com/in/amyw41" },
        email: { label: "Email", href: "mailto:amy.wang1@uwaterloo.ca" },
        twitter: { label: "X / Twitter", href: "https://twitter.com/apriberri" },
      },
      heading: "thank you for dropping by !",
      credit: "designed + built by amy (2026)",
    },
    // Bio copy for the About page (components/sections/About/Bio.tsx).
    // Split into pieces instead of 4 flat paragraph strings because 2 of
    // the source paragraphs aren't plain text: the "perfectionist" one
    // wraps a single word in <em>, and the "reach me" one interleaves 3
    // links — both need real JSX from the component, not markup smuggled
    // through a content string. Splitting the surrounding text into named
    // before/after (or bullets) pieces keeps every actual English word in
    // this file (nothing hardcoded in the component) while leaving the
    // markup itself to the component. Social hrefs deliberately aren't
    // repeated here — Bio.tsx reads those straight from footer.links
    // above, one shared source instead of two copies that could drift.
    about: {
      heading: "hello! i'm amy",
      paragraphs: {
        intro: "I like pretty things and cool people... so I like design!",
        perfectionist: {
          before:
            "Growing up, my friends called me a perfectionist. I'd say it's a flaw if it wasn't the reason I slave over every one of my creations, waiting for it to look ",
          emphasis: "good",
          after: " enough to post. (And I guess it isn't necessarily SLOW, just tedious...)",
        },
        knownAs: {
          intro: "I'm also known as...",
          bullets: [
            "a dancer! I'm currently re-learning ballet pointe",
            "an overthinker. I'm a big fan of lore (harry potter, hunger games, just finished aot... talk about it with me)",
            "an engineer. I'm studying Management Engineering at Waterloo!",
          ],
        },
        contact: {
          before: "You can reach me on ",
          betweenLinkedinAndX: ", ",
          betweenXAndEmail: ", or by ",
          after: "!",
        },
      },
    },
    playground: {
      title: "what's on my plate?",
      caption: "click into the plate to see more!",
      toggles: {
        plate: "plate view",
        collage: "collage view",
      },
    },
  },
} as const;

export type Locale = keyof typeof content;
