import { useState, useEffect } from "react";

interface AdminPageProps {
  onBack: () => void;
}

interface PlayerInfo {
  key: string;
  userId: string;
  name: string;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selected, setSelected] = useState<PlayerInfo | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/players", { headers: { "X-User-Id": getUserId() } })
      .then((r) => r.json())
      .then((d) => {
        const list: PlayerInfo[] = (d.players || []).map((p: string) => {
          const [userId, name] = p.split("|");
          return { key: p, userId, name };
        });
        setPlayers(list);
      })
      .catch(() => {});
  }, []);

  const viewPlayer = (p: PlayerInfo) => {
    setSelected(p);
    fetch(`/api/admin/player/${p.userId}`, { headers: { "X-User-Id": getUserId() } })
      .then((r) => r.json())
      .then((d) => setSelectedState(JSON.stringify(d, null, 2)))
      .catch(() => setSelectedState("加载失败"));
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: "var(--text-color)" }}>
          ← 返回
        </button>
        <h2 style={{ margin: 0, fontSize: "var(--fs-lg)" }}>管理后台</h2>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* 玩家列表 */}
        <div style={{ flex: 1, maxHeight: 400, overflow: "auto" }}>
          <h3 style={{ fontSize: "var(--fs-base)", marginBottom: 8 }}>玩家 ({players.length})</h3>
          {players.map((p) => (
            <div
              key={p.userId}
              onClick={() => viewPlayer(p)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid var(--border-color)",
                background: selected?.userId === p.userId ? "var(--bg-hover, rgba(128,128,128,0.1))" : "transparent",
                fontSize: "var(--fs-sm)",
              }}
            >
              {p.name || p.userId.slice(0, 8) + "..."}
            </div>
          ))}
          {players.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>暂无玩家</p>}
        </div>

        {/* 玩家详情 */}
        <div style={{ flex: 2 }}>
          {selected ? (
            <>
              <h3 style={{ fontSize: "var(--fs-base)", marginBottom: 8 }}>
                {selected.name} <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>({selected.userId.slice(0, 12)}...)</span>
              </h3>
              <pre style={{
                background: "var(--bg-card, rgba(0,0,0,0.05))",
                padding: 12,
                borderRadius: 8,
                fontSize: 11,
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}>
                {selectedState || "加载中..."}
              </pre>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>点击左侧玩家查看详情</p>
          )}
        </div>
      </div>
    </div>
  );
};

function getUserId(): string {
  try {
    const raw = localStorage.getItem("iam_tokens");
    if (!raw) return "";
    const tok = JSON.parse(raw);
    const payload = tok.id_token?.split(".")[1];
    if (!payload) return "";
    return JSON.parse(atob(payload)).sub || "";
  } catch {
    return "";
  }
}

export default AdminPage;
