import { COLLECTIBLE_NAMES } from "../constants";
import styles from "./Inventory.module.css";

interface InventoryProps {
  inventory: Record<string, number>;
}

const DISPLAY_ORDER = ["rainbow_badge", "jia_yu", "gan_yue", "wings_sutra"];

const Inventory: React.FC<InventoryProps> = ({ inventory }) => {
  const items = DISPLAY_ORDER.filter((id) => (inventory[id] ?? 0) > 0);

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>背包</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>还没有收藏品，去转转盘吧！</p>
      ) : (
        <div className={styles.grid}>
          {items.map((id) => (
            <div key={id} className={styles.item}>
              <span className={styles.name}>{COLLECTIBLE_NAMES[id]}</span>
              <span className={styles.count}>×{inventory[id]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Inventory;
