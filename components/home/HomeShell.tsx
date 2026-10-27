import styles from "./HomeShell.module.css";
import Sidebar from "./Sidebar/Sidebar";
import Stage from "./Stage/Stage";

/**
 * The rebranded one-screen home page: sidebar on the left, a thin divider,
 * and the jar stage filling the rest (rebrand-brief.md 2.1). The intro
 * state machine lands here in Phase 6.
 */
export default function HomeShell() {
  return (
    <main className={styles.frame}>
      <Sidebar />
      {/* Plain line for now; Phase 3 swaps it for the boiling hand-drawn
       * one, which is why it's its own element rather than a border. */}
      <div className={styles.divider} aria-hidden="true" />
      <Stage />
    </main>
  );
}
