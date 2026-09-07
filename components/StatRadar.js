import styles from "./StatRadar.module.css";

const MAX_STAT = 180;
const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = 78;
const LEVELS = [0.2, 0.4, 0.6, 0.8, 1];

const LABELS = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SPA",
  "special-defense": "SPD",
  speed: "SPE",
};

function pointAt(index, total, fraction) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * fraction,
    y: CENTER + Math.sin(angle) * RADIUS * fraction,
  };
}

function polygonPoints(stats, fraction) {
  return stats
    .map((_, i) => {
      const p = pointAt(i, stats.length, fraction);
      return `${p.x},${p.y}`;
    })
    .join(" ");
}

export default function StatRadar({ stats, color = "#ef4453" }) {
  const total = stats.length;

  const valuePoints = stats
    .map((stat, i) => pointAt(i, total, Math.min(1, stat.base / MAX_STAT)))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.svg}>
        {LEVELS.map((level) => (
          <polygon key={level} points={polygonPoints(stats, level)} className={styles.grid} />
        ))}

        {stats.map((stat, i) => {
          const p = pointAt(i, total, 1);
          return <line key={stat.name} x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} className={styles.axis} />;
        })}

        <polygon points={valuePoints} className={styles.value} style={{ fill: color, stroke: color }} />

        {stats.map((stat, i) => {
          const p = pointAt(i, total, Math.min(1, stat.base / MAX_STAT));
          return <circle key={`${stat.name}-dot`} cx={p.x} cy={p.y} r="3" className={styles.dot} style={{ fill: color }} />;
        })}

        {stats.map((stat, i) => {
          const p = pointAt(i, total, 1.2);
          return (
            <text
              key={`${stat.name}-label`}
              x={p.x}
              y={p.y}
              className={styles.label}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {LABELS[stat.name] ?? stat.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
