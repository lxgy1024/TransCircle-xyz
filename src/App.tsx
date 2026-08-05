import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerState, SpinMode } from "./types";
import { loadState, performSpin, canFreeSpin, getDailyFreeRemaining, saveState, getUserId } from "./game";
import { processCallback, getStoredUser, logout as iamLogout, isIamConfigured } from "./iam";
import Wheel from "./components/Wheel";
import Dashboard from "./components/Dashboard";
import ResultModal from "./components/ResultModal";
import Inventory from "./components/Inventory";
import History from "./components/History";
import LoginScreen from "./components/LoginScreen";
import AdminPage from "./components/AdminPage";
import ThemeToggle from "./components/ThemeToggle";
import styles from "./App.module.css";

const DEFAULT_STATE: PlayerState = {
  playerName: "",
  tokens: 0,
  inventory: {},
  history: [],
  lastFreeSpinTimestamp: 0,
};

const App: React.FC = () => {
  const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState<{ slotId: number } | null>(null);
  const [resultSlot, setResultSlot] = useState<number | null>(null);
  const [resultMode, setResultMode] = useState<SpinMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(playerState);
  stateRef.current = playerState;
  // 转盘停止后才显示的结果
  const pendingResultRef = useRef<{ slotId: number; mode: SpinMode } | null>(null);

  // ── 挂载时从服务端加载存档 ──
  useEffect(() => {
    (async () => {
      const state = await loadState();
      const iamUser = getStoredUser();
      if (iamUser && !state.playerName) {
        state.playerName = iamUser.preferred_username;
      }
      setPlayerState(state);
      stateRef.current = state;
      // 有登录用户但 KV 里还没有存档 → 立即保存，确保出现在管理后台
      if (iamUser && state.playerName) {
        saveState(state);
      }
      setLoading(false);
    })();
  }, []);

  // ── OAuth 回调处理 ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) return;
    (async () => {
      const result = await processCallback();
      if (result && result.success) {
        const loaded = await loadState();
        const updated: PlayerState = { ...loaded, playerName: result.user.preferred_username };
        setPlayerState(updated);
        stateRef.current = updated;
        await saveState(updated);
      } else if (result && !result.success) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
      }
    })();
  }, []);

  const handleSpin = useCallback(
    (mode: SpinMode) => {
      if (isSpinning) return;
      const st = stateRef.current;

      if (mode === "free" && !canFreeSpin(st)) {
        setError("今日免费次数已用完");
        setTimeout(() => setError(null), 2000);
        return;
      }
      if (mode === "premium" && st.tokens < 100) {
        setError("TSC 代币不足 (需要 100)");
        setTimeout(() => setError(null), 2000);
        return;
      }

      try {
        const { slotId, updatedState } = performSpin(st, mode);
        setPlayerState(updatedState);
        stateRef.current = updatedState;
        // 暂存结果，等转盘转完再显示
        pendingResultRef.current = { slotId, mode };
        setIsSpinning(true);
        setSpinTrigger({ slotId });
        // 异步保存（不阻塞 UI）
        saveState(updatedState);
      } catch (e) {
        setError(e instanceof Error ? e.message : "抽奖失败");
        setTimeout(() => setError(null), 2000);
      }
    },
    [isSpinning],
  );

  const handleSpinEnd = useCallback(() => {
    setIsSpinning(false);
    setSpinTrigger(null);
    // 转盘停止后才显示结果
    if (pendingResultRef.current) {
      setResultSlot(pendingResultRef.current.slotId);
      setResultMode(pendingResultRef.current.mode);
      pendingResultRef.current = null;
    }
  }, []);

  const closeResult = useCallback(() => {
    setResultSlot(null);
    setResultMode(null);
  }, []);

  const handleLogout = useCallback(() => {
    const cleared: PlayerState = { ...playerState, playerName: "" };
    setPlayerState(cleared);
    iamLogout();
  }, [playerState]);

  const freeRemaining = getDailyFreeRemaining(playerState);
  const isAdmin = getUserId() === "019ea0ed-9b49-701a-849d-efa50ea3fae4";

  // ── 加载中 ──
  if (loading) {
    return (
      <div className={styles.container} style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>加载中...</p>
      </div>
    );
  }

  // ── OAuth 回调进行中 ──
  const oauthPending = !playerState.playerName &&
    isIamConfigured() &&
    new URLSearchParams(window.location.search).has("code");
  if (oauthPending) {
    return (
      <div className={styles.container} style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>登录中...</p>
      </div>
    );
  }

  // ── 未登录 → 登录屏 ──
  if (!playerState.playerName) {
    return (
      <>
        <ThemeToggle />
        <LoginScreen />
      </>
    );
  }

  // ── 管理后台 ──
  if (showAdmin) {
    return (
      <>
        <ThemeToggle />
        <AdminPage onBack={() => setShowAdmin(false)} />
      </>
    );
  }

  // ── 游戏主界面 ──
  return (
    <>
      <ThemeToggle />
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            TransCircle 转盘
            {isAdmin && (
              <button className={styles.logoutBtn} onClick={() => setShowAdmin(true)} title="管理后台" style={{ marginLeft: 8 }}>
                ⚙
              </button>
            )}
          </h1>
          <p className={styles.playerName}>
            {playerState.playerName}
            {isIamConfigured() && (
              <button className={styles.logoutBtn} onClick={handleLogout} title="退出登录">
                ✕
              </button>
            )}
          </p>
        </header>

        <main className={styles.main}>
          <Dashboard
            tokens={playerState.tokens}
            freeRemaining={freeRemaining}
            isSpinning={isSpinning}
            onSpin={handleSpin}
          />

          <Wheel
            isSpinning={isSpinning}
            onSpinEnd={handleSpinEnd}
            spinTrigger={spinTrigger}
          />

          {error && (
            <p style={{ textAlign: "center", color: "var(--error-color)", fontSize: "var(--fs-sm)", margin: 0 }} role="alert">
              {error}
            </p>
          )}

          <hr className={styles.divider} />
          <Inventory inventory={playerState.inventory} />
          <hr className={styles.divider} />
          <History history={playerState.history} />
        </main>

        <footer className={styles.footer}>
          TransCircle ·{" "}
          <a href="https://transcircle.xyz" target="_blank" rel="noopener noreferrer">
            transcircle.xyz
          </a>
        </footer>
      </div>

      {resultSlot !== null && (
        <ResultModal slotId={resultSlot} mode={resultMode} onClose={closeResult} />
      )}
    </>
  );
};

export default App;
