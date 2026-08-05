import type { WheelSlot } from "./types";

/** ── 10 个转盘格子 ─────────────────────────────── */
export const WHEEL_SLOTS: WheelSlot[] = [
  { id: 0,  name: "谢谢惠顾", rarity: "common",  reward: { type: "nothing" } },
  { id: 1,  name: "谢谢惠顾", rarity: "common",  reward: { type: "nothing" } },
  { id: 2,  name: "谢谢惠顾", rarity: "common",  reward: { type: "nothing" } },
  { id: 3,  name: "谢谢惠顾", rarity: "common",  reward: { type: "nothing" } },
  { id: 4,  name: "再来一次", rarity: "common",  reward: { type: "freeSpin" } },
  { id: 5,  name: "谢谢惠顾", rarity: "common",  reward: { type: "nothing" } },
  { id: 6,  name: "彩虹徽章", rarity: "common",  reward: { type: "collectible", itemId: "rainbow_badge" } },
  { id: 7,  name: "甲鱼",     rarity: "special", reward: { type: "collectible", itemId: "jia_yu" } },
  { id: 8,  name: "赶月",     rarity: "special", reward: { type: "collectible", itemId: "gan_yue" } },
  { id: 9,  name: "翅膀经",   rarity: "rare",    reward: { type: "collectible", itemId: "wings_sutra" } },
];

/** ── 高级抽奖各格子的概率 (总计 100%) ─────────── */
export const PREMIUM_WEIGHTS: number[] = [
  0.13,  // 0: 谢谢惠顾
  0.13,  // 1: TSC ×5
  0.13,  // 2: 谢谢惠顾
  0.13,  // 3: TSC ×10
  0.13,  // 4: 再来一次
  0.13,  // 5: TSC ×20
  0.13,  // 6: 彩虹徽章
  0.04,  // 7: 甲鱼
  0.04,  // 8: 赶月
  0.01,  // 9: 翅膀经
];

/** ── 普通格子索引 (id 0-6) ─────────────────────── */
export const COMMON_SLOT_IDS = [0, 1, 2, 3, 4, 5, 6];

/** ── 高级抽奖消耗 ───────────────────────────────── */
export const PREMIUM_COST = 100;

/** ── 每日免费次数 ───────────────────────────────── */
export const DAILY_FREE_LIMIT = 3;

/** ── 收藏品展示名 ───────────────────────────────── */
export const COLLECTIBLE_NAMES: Record<string, string> = {
  rainbow_badge: "彩虹徽章",
  jia_yu: "甲鱼",
  gan_yue: "赶月",
  wings_sutra: "翅膀经",
};

/** ── 转盘显示颜色 (10 种糖果色) ────────────────── */
export const SEGMENT_COLORS: string[] = [
  "#FF6B9D", // 热粉
  "#FF85A2", // 粉红
  "#FF9EBB", // 浅粉
  "#FFB8D1", // 淡粉
  "#C9A0DC", // 紫粉
  "#A8D8EA", // 天蓝
  "#B5EAD7", // 薄荷
  "#FFD59E", // 蜜桃
  "#FF9A9E", // 三文鱼
  "#FADADD", // 极淡粉
];
