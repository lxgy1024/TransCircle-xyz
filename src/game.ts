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

/** ── 高级抽奖 TSC 奖励映射 ── */
const PREMIUM_TOKEN_REWARDS: Record<number, number> = {
  1: 5,
  3: 10,
  5: 20,
};

const API_BASE = "/api/game";

export function getUserId(): string {
  try {
    const raw = localStorage.getItem("iam_tokens");
    if (!raw) return "";
    const tok = JSON.parse(raw);
    // 从 id_token 解析 sub（简单 base64 decode payload）
    const payload = tok.id_token?.split(".")[1];
    if (!payload) return "";
    return JSON.parse(atob(payload)).sub || "";
  } catch {
    return "";
  }
}

function apiHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-User-Id": getUserId(),
  };
}

/** ── 从服务端加载存档 ───────────────────────────── */
export async function loadState(): Promise<PlayerState> {
  try {
    const uid = getUserId();
    if (!uid) return DEFAULT_STATE;
    const resp = await fetch(`${API_BASE}/state`, { headers: apiHeaders() });
    if (!resp.ok) return DEFAULT_STATE;
    const parsed = await resp.json();
    if (!parsed || !parsed.playerName) return DEFAULT_STATE;
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

/** ── 写入存档到服务端 ───────────────────────────── */
export async function saveState(state: PlayerState): Promise<void> {
  try {
    const uid = getUserId();
    if (!uid) return;
    await fetch(`${API_BASE}/state`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(state),
    });
  } catch {
    /* 静默失败 — 下次 save 会重试 */
  }
}

const DEFAULT_STATE: PlayerState = {
  playerName: "",
  tokens: 0,
  inventory: {},
  history: [],
  lastFreeSpinTimestamp: 0,
};

/** ── 重置存档 ────────────────────────────────── */
export function resetState(): void {
  /* 不做任何事 — 由服务端管理 */
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

function weightedPick(): number {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < PREMIUM_WEIGHTS.length; i++) {
    cumulative += PREMIUM_WEIGHTS[i];
    if (r < cumulative) return i;
  }
  return PREMIUM_WEIGHTS.length - 1;
}

function commonPick(): number {
  const idx = Math.floor(Math.random() * COMMON_SLOT_IDS.length);
  return COMMON_SLOT_IDS[idx];
}

export function performSpin(
  state: PlayerState,
  mode: SpinMode,
): { slotId: number; updatedState: PlayerState } {
  const s = { ...state };
  s.history = [...s.history];

  if (mode === "premium") {
    if (s.tokens < PREMIUM_COST) throw new Error("TSC 代币不足");
    s.tokens -= PREMIUM_COST;
  }

  const slotId = mode === "premium" ? weightedPick() : commonPick();
  const slot = WHEEL_SLOTS[slotId];

  let reward = slot.reward;
  if (mode === "premium" && slotId in PREMIUM_TOKEN_REWARDS) {
    reward = { type: "tokens", amount: PREMIUM_TOKEN_REWARDS[slotId] };
  }

  switch (reward.type) {
    case "tokens":
      s.tokens += reward.amount ?? 0;
      break;
    case "freeSpin":
      {
        const reSlotId = commonPick();
        const reSlot = WHEEL_SLOTS[reSlotId];
        applyReward(s, reSlot.reward);
        const rec: SpinRecord = {
          timestamp: Date.now(), mode, slotId, prizeName: slot.name,
        };
        const rec2: SpinRecord = {
          timestamp: Date.now() + 1, mode: "bonus", slotId: reSlotId, prizeName: reSlot.name,
        };
        s.history.unshift(rec2);
        s.history.unshift(rec);
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
      break;
  }

  const record: SpinRecord = {
    timestamp: Date.now(), mode, slotId, prizeName: slot.name,
  };
  s.history.unshift(record);

  if (s.history.length > 100) {
    s.history = s.history.slice(0, 100);
  }

  return { slotId, updatedState: s };
}

function applyReward(state: PlayerState, reward: (typeof WHEEL_SLOTS)[number]["reward"]): void {
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
    case "freeSpin":
      state.tokens += 5;
      break;
    case "nothing":
      break;
  }
}
