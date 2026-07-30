import { useState, useCallback, useRef, useEffect } from "react";
import type { PlayerState, SpinMode } from "./types";
import { loadState, performSpin, canFreeSpin, getDailyFreeRemaining, saveState } from "./game";
import { processCallback, getStoredUser, logout as iamLogout, isIamConfigured } from "./iam";
import Wheel from "./components/Wheel";
import Dashboard from "./components/Dashboard";
import ResultModal from "./components/ResultModal";
import Inventory from "./components/Inventory";
import History from "./components/History";
import LoginScreen from "./components/LoginScreen";
import ThemeToggle from "./components/ThemeToggle";
import styles from "./App.module.css";

const App: React.FC = () => {
  // ── All hooks declared FIRST (Rules of Hooks) ──
  const [playerState, setPlayerState] = useState<PlayerState>(() => {
    const game = loadState();
    // 如果游戏存档没有玩家名，但 IAM 有已登录用户 → 自动补齐
    if (!game.playerName) {
      const iamUser = getStoredUser();
      if (iamUser) {
        return { ...game, playerName: iamUser.preferred_username };
      }
    }
    return game;
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTrigger, setSpinTrigger] = useState<{ slotId: number } | null>(null);
  const [resultSlot, setResultSlot] = useState<number | null>(null);
  const [resultMode, setResultMode] = useState<SpinMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(playerState);
  stateRef.current = playerState;

  // ── OAuth 回调处理 ──
  useEffect(() => {
    // 检查 URL 中是否有 IAM 回调参数
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) return;

    (async () => {
      const result = await processCallback();
      if (result && result.success) {
        const name = result.user.preferred_username;
        const updated: PlayerState = { ...stateRef.current, playerName: name };
        setPlayerState(updated);
        saveState(updated);
      } else if (result && !result.success) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
      }
    })();
  }, []); // 仅挂载时执行

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
        setResultSlot(slotId);
        setResultMode(mode);
        setIsSpinning(true);
        setSpinTrigger({ slotId });
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
  }, []);

  const closeResult = useCallback(() => {
    setResultSlot(null);
    setResultMode(null);
  }, []);

  const handleLogout = useCallback(() => {
    const cleared: PlayerState = { ...playerState, playerName: "" };
    setPlayerState(cleared);
    saveState(cleared);
    iamLogout();
  }, [playerState]);

  const freeRemaining = getDailyFreeRemaining(playerState);

  // ── 还在处理 OAuth 回调时显示 loading ──
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

  return (
    <>
      <ThemeToggle />
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>TransCircle 转盘</h1>
          <p className={styles.playerName}>
            🎮 {playerState.playerName}
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
            <p
              style={{
                textAlign: "center",
                color: "var(--error-color)",
                fontSize: "var(--fs-sm)",
                margin: 0,
              }}
              role="alert"
            >
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
        <ResultModal
          slotId={resultSlot}
          mode={resultMode}
          onClose={closeResult}
        />
      )}
    </>
  );
};

export default App;
