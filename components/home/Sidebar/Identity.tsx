import styles from "./Sidebar.module.css";
import { content } from "@/lib/content";

const copy = content.en.sidebar;

export default function Identity() {
  return (
    <div className={styles.identity}>
      <h1 className={styles.name}>{copy.name}</h1>
      <p className={styles.description}>{copy.description}</p>
      <p className={styles.meta}>{copy.school}</p>
      <p className={styles.meta}>{copy.prev}</p>
    </div>
  );
}
