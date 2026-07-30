/** 奖励类型 */
export type RewardType = "tokens" | "collectible" | "freeSpin" | "nothing";

/** 物品稀有度 */
export type Rarity = "common" | "special" | "rare";

/** 奖励定义 */
export interface Reward {
  type: RewardType;
  /** token 数量 (type=tokens 时) */
  amount?: number;
  /** 收藏品 ID (type=collectible 时) */
  itemId?: string;
}

/** 转盘格子定义 */
export interface WheelSlot {
  id: number;
  name: string;
  rarity: Rarity;
  reward: Reward;
}

/** 游戏模式 */
export type SpinMode = "free" | "premium";

/** 单次抽奖记录 */
export interface SpinRecord {
  timestamp: number;
  mode: SpinMode;
  slotId: number;
  prizeName: string;
}

/** 玩家游戏状态 (localStorage) */
export interface PlayerState {
  playerName: string;
  tokens: number;
  /** 收藏品计数: itemId → 数量 */
  inventory: Record<string, number>;
  /** 抽奖历史 (最新在前) */
  history: SpinRecord[];
  /** 上次免费抽奖时间戳 (每日免费限制) */
  lastFreeSpinTimestamp: number;
}
