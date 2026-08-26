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
      tagline: "adding a little charm to every intuitive design.",
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
        title: "extras",
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
    about: {
      placeholder: "About — coming soon.",
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
