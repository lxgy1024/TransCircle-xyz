import {
  type PlayerState,
  type SpinMode,
  type SpinRecord,
} from "./types";
import {
  WHEEL_SLOTS,
  COMMON_SLOT_IDS,
  PREMIUM_WEIGHTS,
  PREMIUM_COST,
  DAILY_FREE_LIMIT,
} from "./constants";

const STORAGE_KEY = "transcircle_wheel_state";

const DEFAULT_STATE: PlayerState = {
  playerName: "",
  tokens: 0,
  inventory: {},
  history: [],
  lastFreeSpinTimestamp: 0,
};

/** ── 读取存档 ────────────────────────────────── */
export function loadState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<PlayerState>;
    return {
      playerName: parsed.playerName ?? "",
      tokens: parsed.tokens ?? 0,
      inventory: parsed.inventory ?? {},
      history: parsed.history ?? [],
      lastFreeSpinTimestamp: parsed.lastFreeSpinTimestamp ?? 0,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

/** ── 写入存档 ────────────────────────────────── */
export function saveState(state: PlayerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/** ── 重置存档 ────────────────────────────────── */
export function resetState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}

/** ── 检查每日免费次数是否已达上限 ─────────────── */
export function canFreeSpin(state: PlayerState): boolean {
  if (state.history.length === 0) return true;
  const now = Date.now();
  const dayStart = getDayStart(now);
  const freeCount = state.history.filter(
    (r) => r.mode === "free" && r.timestamp >= dayStart,
  ).length;
  return freeCount < DAILY_FREE_LIMIT;
}

/** ── 获取当日 0 时时间戳 ─────────────────────── */
function getDayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** ── 每日剩余免费次数 ─────────────────────────── */
export function getDailyFreeRemaining(state: PlayerState): number {
  const now = Date.now();
  const dayStart = getDayStart(now);
  const freeCount = state.history.filter(
    (r) => r.mode === "free" && r.timestamp >= dayStart,
  ).length;
  return Math.max(0, DAILY_FREE_LIMIT - freeCount);
}

/** ── 按权重随机抽选格子 (高级抽奖) ─────────────── */
function weightedPick(): number {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < PREMIUM_WEIGHTS.length; i++) {
    cumulative += PREMIUM_WEIGHTS[i];
    if (r < cumulative) return i;
  }
  return PREMIUM_WEIGHTS.length - 1; // 浮点误差回退
}

/** ── 普通抽奖: 从普通格中均匀随机 ─────────────── */
function commonPick(): number {
  const idx = Math.floor(Math.random() * COMMON_SLOT_IDS.length);
  return COMMON_SLOT_IDS[idx];
}

/** ── 执行抽奖, 返回 { slotId, updatedState } ─── */
export function performSpin(
  state: PlayerState,
  mode: SpinMode,
): { slotId: number; updatedState: PlayerState } {
  const s = { ...state };
  s.history = [...s.history];

  // 扣费 (高级)
  if (mode === "premium") {
    if (s.tokens < PREMIUM_COST) {
      throw new Error("TSC 代币不足");
    }
    s.tokens -= PREMIUM_COST;
  }

  // 确定中奖格子
  const slotId = mode === "premium" ? weightedPick() : commonPick();
  const slot = WHEEL_SLOTS[slotId];

  // 发放奖励
  const reward = slot.reward;
  switch (reward.type) {
    case "tokens":
      s.tokens += reward.amount ?? 0;
      break;
    case "freeSpin":
      // 再来一次: 直接免费再抽一次普通 (递归但只一次)
      {
        const reSlotId = commonPick();
        const reSlot = WHEEL_SLOTS[reSlotId];
        applyReward(s, reSlot.reward);
        // 记录第一次的"再来一次"结果
        const rec: SpinRecord = {
          timestamp: Date.now(),
          mode,
          slotId,
          prizeName: slot.name,
        };
        // 记录第二次的实际奖品
        const rec2: SpinRecord = {
          timestamp: Date.now() + 1,
          mode,
          slotId: reSlotId,
          prizeName: reSlot.name,
        };
        s.history.unshift(rec2);
        s.history.unshift(rec);
        saveState(s);
        return { slotId: reSlotId, updatedState: s };
      }
    case "collectible":
      {
        const itemId = reward.itemId!;
        s.inventory = { ...s.inventory };
        s.inventory[itemId] = (s.inventory[itemId] ?? 0) + 1;
      }
      break;
    case "nothing":
      // 谢谢惠顾 — 什么都没发生
      break;
  }

  // 记录历史
  const record: SpinRecord = {
    timestamp: Date.now(),
    mode,
    slotId,
    prizeName: slot.name,
  };
  s.history.unshift(record);

  // 限制历史长度
  if (s.history.length > 100) {
    s.history = s.history.slice(0, 100);
  }

  saveState(s);
  return { slotId, updatedState: s };
}

function applyReward(state: PlayerState, reward: typeof WHEEL_SLOTS[number]["reward"]): void {
  switch (reward.type) {
    case "tokens":
      state.tokens += reward.amount ?? 0;
      break;
    case "collectible": {
      const itemId = reward.itemId!;
      state.inventory = { ...state.inventory };
      state.inventory[itemId] = (state.inventory[itemId] ?? 0) + 1;
      break;
    }
    case "freeSpin": {
      // 再来一次中再来一次 — 给 5 TSC 防止死循环
      state.tokens += 5;
      break;
    }
    case "nothing":
      break;
  }
}
