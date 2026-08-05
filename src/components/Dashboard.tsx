import type { SpinMode } from "../types";
import styles from "./Dashboard.module.css";

interface DashboardProps {
  tokens: number;
  freeRemaining: number;
  isSpinning: boolean;
  onSpin: (mode: SpinMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  tokens,
  freeRemaining,
  isSpinning,
  onSpin,
}) => {
  const canFree = freeRemaining > 0 && !isSpinning;
  const canPremium = tokens >= 100 && !isSpinning;

  return (
    <div className={styles.dashboard}>
      {/* TSC 余额 */}
      <div className={styles.tokenRow}>
        <span className={styles.tokenIcon}>◆</span>
        <span className={styles.tokenAmount}>{tokens}</span>
        <span className={styles.tokenLabel}>TSC</span>
      </div>
      <span className={styles.tokenHint}>TSC 代币请找翅膀获取</span>

      {/* 按钮组 */}
      <div className={styles.buttons}>
        <button
          className={`${styles.btn} ${styles.btnFree}`}
          disabled={!canFree}
          onClick={() => onSpin("free")}
        >
          免费转转盘
        </button>
        <button
          className={`${styles.btn} ${styles.btnPremium}`}
          disabled={!canPremium}
          onClick={() => onSpin("premium")}
        >
          高级转转盘 (100 TSC)
        </button>
      </div>

      {/* 免费剩余 */}
      {freeRemaining > 0 ? (
        <span className={styles.freeRemaining}>
          今日免费剩余 {freeRemaining} 次
        </span>
      ) : (
        <span className={styles.freeRemaining}>今日免费次数已用完</span>
      )}
    </div>
  );
};

export default Dashboard;
