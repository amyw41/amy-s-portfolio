import styles from "./FooterStrip.module.css";
import FooterLink from "./FooterLink";
import { content } from "@/lib/content";

const copy = content.en.footer;
const LINKS = [copy.links.linkedin, copy.links.email, copy.links.twitter];

/** The class for the page content above the footer (white, in front of it),
 * so scrolling to the end reveals the footer from behind it. The page sets
 * --footer-reach to its side padding. */
export const footerCover = styles.cover;

/**
 * The rebrand's footer: a black band, an eighth of the window tall, revealed
 * from behind the page as it scrolls up off it — "designed + built by amy
 * (2026)" on the left, the social links on the right. Ends the home page's
 * work view and every case study. `className` places it (margins, reach).
 */
export default function FooterStrip({ className = "" }: { className?: string }) {
  return (
    <footer className={`${styles.strip} ${className}`}>
      <span className={styles.credit}>{copy.credit}</span>
      <nav className={styles.links} aria-label={content.en.sidebar.social.label}>
        {LINKS.map((link, i) => (
          <span key={link.href}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <FooterLink href={link.href} label={link.label} seed={40 + i} />
          </span>
        ))}
      </nav>
    </footer>
  );
}
