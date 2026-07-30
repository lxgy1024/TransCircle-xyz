import { WHEEL_SLOTS, COLLECTIBLE_NAMES } from "../constants";
import type { Reward, SpinMode } from "../types";
import styles from "./ResultModal.module.css";

interface ResultModalProps {
  slotId: number | null;
  mode: SpinMode | null;
  onClose: () => void;
  /** "再来一次" 时触发免费再抽 */
  onRetryFree?: () => void;
}

function getIcon(reward: Reward): string {
  switch (reward.type) {
    case "tokens":
      return "◆";
    case "collectible": {
      const map: Record<string, string> = {
        rainbow_badge: "🌈",
        jia_yu: "🐢",
        gan_yue: "🌙",
        wings_sutra: "📜",
      };
      return map[reward.itemId ?? ""] ?? "🎁";
    }
    case "freeSpin":
      return "🔄";
    case "nothing":
      return "😅";
  }
}

function getPrizeDisplay(
  reward: Reward,
): { main: string; sub: string } | null {
  switch (reward.type) {
    case "tokens":
      return { main: `+${reward.amount} TSC`, sub: "代币已添加到账户" };
    case "collectible":
      return {
        main: COLLECTIBLE_NAMES[reward.itemId ?? ""] ?? "收藏品",
        sub: "已加入背包",
      };
    case "freeSpin":
      return { main: "再来一次！", sub: "免费再转一次普通转盘" };
    case "nothing":
      return null;
  }
}

const ResultModal: React.FC<ResultModalProps> = ({
  slotId,
  mode,
  onClose,
  onRetryFree,
}) => {
  if (slotId === null || mode === null) return null;

  const slot = WHEEL_SLOTS[slotId];
  const { rarity, name, reward } = slot;
  const icon = getIcon(reward);
  const prizeDisplay = getPrizeDisplay(reward);

  const rarityClass =
    rarity === "rare"
      ? styles.rarityRare
      : rarity === "special"
        ? styles.raritySpecial
        : styles.rarityCommon;

  const isRetry = reward.type === "freeSpin";

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="抽奖结果"
    >
      <div className={`${styles.card} ${rarityClass}`}>
        <p className={styles.title}>
          {mode === "free" ? "免费抽奖" : "高级抽奖"}
        </p>

        <span className={styles.icon}>{icon}</span>

        <p className={`${styles.prizeName} ${rarity === "rare" ? styles.rareText : ""}`}>
          {name}
        </p>

        {prizeDisplay && (
          <>
            <p className={styles.tokenReward}>{prizeDisplay.main}</p>
            <p className={styles.subtitle}>{prizeDisplay.sub}</p>
          </>
        )}

        <div className={styles.actions}>
          {isRetry && onRetryFree ? (
            <>
              <button
                className={styles.closeBtn}
                onClick={onRetryFree}
              >
                再来一次！
              </button>
              <span className={styles.freeSpinHint}>
                免费再转一次普通转盘
              </span>
            </>
          ) : (
            <button className={styles.closeBtn} onClick={onClose}>
              太棒了！
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
