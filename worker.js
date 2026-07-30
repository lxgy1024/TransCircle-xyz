const IAM = "https://iam.transcircle.org";
const ADMIN_IDS = ["019ea0ed-9b49-701a-849d-efa50ea3fae4"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // OAuth proxy
    if (path === "/oauth/token" && method === "POST") {
      const body = await request.text();
      const r = await fetch(`${IAM}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" } });
    }
    if (path === "/oauth/userinfo") {
      const r = await fetch(`${IAM}/oauth2/userinfo`, {
        headers: { Authorization: request.headers.get("Authorization") || "" },
      });
      return new Response(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" } });
    }

    // Game API
    const userId = request.headers.get("X-User-Id") || "";

    if (path === "/api/game/state" && method === "GET") {
      if (!userId) return new Response('{"error":"missing user"}', { status: 401, headers: { "Content-Type": "application/json" } });
      try {
        const raw = await env.GAME_STATE.get(`state:${userId}`);
        return new Response(raw || "{}", { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (path === "/api/game/state" && method === "POST") {
      if (!userId) return new Response('{"error":"missing user"}', { status: 401, headers: { "Content-Type": "application/json" } });
      const body = await request.json();
      await env.GAME_STATE.put(`state:${userId}`, JSON.stringify(body));
      // track players (best-effort)
      try {
        const raw = await env.GAME_STATE.get("admin:players");
        let players = raw ? JSON.parse(raw) : [];
        const userKey = `${userId}|${body.playerName || ""}`;
        players = players.filter((p) => !p.startsWith(`${userId}|`));
        players.unshift(userKey);
        if (players.length > 200) players = players.slice(0, 200);
        await env.GAME_STATE.put("admin:players", JSON.stringify(players));
      } catch (_) { /* non-critical */ }
      return new Response("ok");
    }

    // Admin
    if (path === "/api/admin/players" && method === "GET") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      try {
        const raw = await env.GAME_STATE.get("admin:players");
        return new Response(JSON.stringify({ players: raw ? JSON.parse(raw) : [] }), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e), players: [] }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }
    if (path.startsWith("/api/admin/player/") && method === "GET") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      const targetId = path.split("/").pop();
      try {
        const raw = await env.GAME_STATE.get(`state:${targetId}`);
        return new Response(raw || "{}", { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }
    if (path.startsWith("/api/admin/player/") && method === "PATCH") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      const targetId = path.split("/").pop();
      try {
        const raw = await env.GAME_STATE.get(`state:${targetId}`);
        if (!raw) return new Response("{}", { status: 404 });
        const state = JSON.parse(raw);
        const patch = await request.json();
        if (typeof patch.tokens === "number") state.tokens = Math.max(0, patch.tokens);
        await env.GAME_STATE.put(`state:${targetId}`, JSON.stringify(state));
        return new Response(JSON.stringify(state), { headers: { "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }
    if (path.startsWith("/api/admin/player/") && method === "DELETE") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      const targetId = path.split("/").pop();
      await env.GAME_STATE.delete(`state:${targetId}`);
      // 从玩家列表移除
      try {
        const raw = await env.GAME_STATE.get("admin:players");
        if (raw) {
          const players = JSON.parse(raw).filter((p) => !p.startsWith(`${targetId}|`));
          await env.GAME_STATE.put("admin:players", JSON.stringify(players));
        }
      } catch (_) { /* non-critical */ }
      return new Response("ok");
    }

    // SPA fallback
    return env.ASSETS.fetch(request);
  },
};
