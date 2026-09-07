import styles from "./TypeBadge.module.css";
import { TYPE_COLORS, typeLabel } from "@/lib/pokemonTypes";

export default function TypeBadge({ type }) {
  return (
    <span className={styles.badge} style={{ backgroundColor: TYPE_COLORS[type] ?? "#777" }}>
      {typeLabel(type)}
    </span>
  );
}
