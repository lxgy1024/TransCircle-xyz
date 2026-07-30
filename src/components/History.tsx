import type { SpinRecord } from "../types";
import styles from "./History.module.css";

interface HistoryProps {
  history: SpinRecord[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const History: React.FC<HistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.heading}>抽奖历史</h2>
        <p className={styles.empty}>还没有抽奖记录</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>抽奖历史</h2>
      <ul className={styles.list}>
        {history.map((rec, i) => (
          <li key={`${rec.timestamp}-${i}`} className={styles.item}>
            <span
              className={`${styles.modeBadge} ${rec.mode === "free" ? styles.free : styles.premium}`}
            >
              {rec.mode === "free" ? "免费" : "高级"}
            </span>
            <span className={styles.prizeName}>{rec.prizeName}</span>
            <span className={styles.time}>{formatTime(rec.timestamp)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default History;
