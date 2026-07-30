import { useState, useEffect } from "react";

interface AdminPageProps { onBack: () => void; }

interface PlayerInfo {
  userId: string; name: string;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selected, setSelected] = useState<PlayerInfo | null>(null);
  const [state, setState] = useState<any>(null);
  const [editTokens, setEditTokens] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPlayers(); }, []);

  const loadPlayers = async () => {
    try {
      const res = await fetch("/api/admin/players", { headers: { "X-User-Id": uid() } });
      const data = await res.json();
      setPlayers((data.players || []).map((p: string) => {
        const [userId, name] = p.split("|");
        return { userId, name: name || userId.slice(0, 8) + "..." };
      }));
    } catch { /* noop */ }
  };

  const viewPlayer = async (p: PlayerInfo) => {
    setSelected(p); setState(null); setEditTokens("");
    try {
      const res = await fetch(`/api/admin/player/${p.userId}`, { headers: { "X-User-Id": uid() } });
      const s = await res.json();
      setState(s);
      setEditTokens(String(s.tokens ?? 0));
    } catch { setState({ _error: true }); }
  };

  const saveTokens = async () => {
    if (!selected) return;
    const val = parseInt(editTokens, 10);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/player/${selected.userId}`, {
        method: "PATCH", headers: { "X-User-Id": uid(), "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: val }),
      });
      if (res.ok) { setState(await res.json()); }
    } catch { /* noop */ }
    setSaving(false);
  };

  const deletePlayer = async (p: PlayerInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定删除玩家「${p.name}」？所有数据将永久丢失。`)) return;
    await fetch(`/api/admin/player/${p.userId}`, { method: "DELETE", headers: { "X-User-Id": uid() } });
    if (selected?.userId === p.userId) { setSelected(null); setState(null); }
    loadPlayers();
  };

  const s = state;
  const diff = s && !s._error ? (parseInt(editTokens) || 0) - (s.tokens ?? 0) : 0;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "1px solid var(--border-color, #ddd)", borderRadius: 6, padding: "4px 12px", cursor: "pointer", color: "var(--text-color)", fontSize: "0.8rem" }}>← 返回</button>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>管理后台</h2>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* 玩家列表 */}
        <div style={{ width: 180, flexShrink: 0 }}>
          {players.map((p) => (
            <div key={p.userId} onClick={() => viewPlayer(p)}
              style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6, marginBottom: 2,
                background: selected?.userId === p.userId ? "var(--bg-active, rgba(100,100,255,0.08))" : "transparent",
                fontSize: "0.85rem", transition: "background 0.1s", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <button onClick={(e) => deletePlayer(p, e)}
                style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "0.85rem", padding: "0 2px", lineHeight: 1 }}
                title="删除玩家">×</button>
            </div>
          ))}
          {players.length === 0 && <div style={{ fontSize: "0.8rem", color: "#888", padding: 10 }}>暂无玩家</div>}
        </div>

        {/* 详情 */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div style={{ textAlign: "center", padding: 60, color: "#888", fontSize: "0.85rem" }}>点击左侧玩家查看详情</div>
          ) : !s ? (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>加载中...</div>
          ) : s._error ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--error-color)" }}>加载失败</div>
          ) : (
            <>
              {/* 头像 + 名称 */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-card, #f0f0f0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 700 }}>
                  {selected.name[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selected.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#888", fontFamily: "monospace" }}>{selected.userId.slice(0, 12)}...</div>
                </div>
              </div>

              {/* 代币 */}
              <div style={{ background: "var(--bg-card, rgba(0,0,0,0.03))", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>代币</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.2rem" }}>◆</span>
                  <input type="number" min={0} value={editTokens}
                    onChange={(e) => setEditTokens(e.target.value)}
                    style={{ width: 90, padding: "6px 10px", border: "1px solid var(--border-color, #ddd)", borderRadius: 6, fontSize: "0.9rem", textAlign: "center", background: "var(--bg-input, #fff)", color: "var(--text-color)" }} />
                  <button onClick={saveTokens} disabled={saving || diff === 0}
                    style={{ padding: "6px 16px", border: "none", borderRadius: 6, background: (saving || diff === 0) ? "#aaa" : "var(--accent, #6366f1)", color: "#fff", cursor: (saving || diff === 0) ? "not-allowed" : "pointer", fontSize: "0.8rem" }}>
                    {saving ? "..." : "保存"}
                  </button>
                </div>
                {diff !== 0 && <div style={{ fontSize: "0.72rem", color: diff > 0 ? "#22c55e" : "#ef4444", marginTop: 4 }}>◆ {s.tokens} → {s.tokens + diff} ({diff > 0 ? "+" : ""}{diff})</div>}
              </div>

              {/* 收藏品 */}
              <div style={{ background: "var(--bg-card, rgba(0,0,0,0.03))", borderRadius: 10, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 6, letterSpacing: 1 }}>收藏品</div>
                {s.inventory && Object.keys(s.inventory).length > 0 ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {Object.entries(s.inventory as Record<string, number>).map(([id, n]) => (
                      <span key={id} style={{ fontSize: "0.8rem", padding: "2px 8px", borderRadius: 4, background: "var(--bg-hover, rgba(128,128,128,0.1))" }}>{id} ×{n}</span>
                    ))}
                  </div>
                ) : <span style={{ fontSize: "0.8rem", color: "#888" }}>空</span>}
              </div>

              {/* 历史 */}
              <div style={{ background: "var(--bg-card, rgba(0,0,0,0.03))", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: 6, letterSpacing: 1 }}>抽奖记录</div>
                {s.history?.length > 0 ? (
                  <div style={{ maxHeight: 140, overflow: "auto" }}>
                    {s.history.slice(0, 10).map((h: any, i: number) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "0.8rem", borderBottom: "1px solid var(--border-color, #eee)" }}>
                        <span>
                          <span style={{ color: h.mode === "premium" ? "var(--accent, #6366f1)" : h.mode === "bonus" ? "#f59e0b" : "#666" }}>
                            {h.mode === "premium" ? "高级" : h.mode === "bonus" ? "奖励" : "免费"}
                          </span>{" "}{h.prizeName}
                        </span>
                        <span style={{ color: "#888", fontSize: "0.7rem" }}>{new Date(h.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    ))}
                  </div>
                ) : <span style={{ fontSize: "0.8rem", color: "#888" }}>暂无</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function uid(): string {
  try {
    const raw = localStorage.getItem("iam_tokens");
    if (!raw) return "";
    const tok = JSON.parse(raw);
    const payload = tok.id_token?.split(".")[1];
    if (!payload) return "";
    return JSON.parse(atob(payload)).sub || "";
  } catch { return ""; }
}

export default AdminPage;
