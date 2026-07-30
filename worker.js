const IAM = "https://iam.transcircle.org";
const ADMIN_IDS = ["019ea0ed-9b49-701a-849d-efa50ea3fae4"]; // lxgy1024

async function apiState(userId, env) {
  const raw = await env.GAME_STATE.get(`state:${userId}`);
  return new Response(raw || "{}", { headers: { "Content-Type": "application/json" } });
}

async function apiSaveState(userId, body, env) {
  await env.GAME_STATE.put(`state:${userId}`, JSON.stringify(body));
  // track player list
  let players = JSON.parse(await env.GAME_STATE.get("admin:players") || "[]");
  const userKey = `${userId}|${body.playerName || ""}`;
  players = players.filter((p) => !p.startsWith(`${userId}|`));
  players.unshift(userKey);
  if (players.length > 200) players = players.slice(0, 200);
  await env.GAME_STATE.put("admin:players", JSON.stringify(players));
  return new Response("ok");
}

async function apiAdminPlayers(env) {
  const raw = await env.GAME_STATE.get("admin:players");
  const players = raw ? JSON.parse(raw) : [];
  return new Response(JSON.stringify({ players }), { headers: { "Content-Type": "application/json" } });
}

async function apiAdminPlayerState(userId, env) {
  const raw = await env.GAME_STATE.get(`state:${userId}`);
  return new Response(raw || "{}", { headers: { "Content-Type": "application/json" } });
}

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
      if (!userId) return new Response("missing user", { status: 401 });
      return apiState(userId, env);
    }
    if (path === "/api/game/state" && method === "POST") {
      if (!userId) return new Response("missing user", { status: 401 });
      const body = await request.json();
      return apiSaveState(userId, body, env);
    }

    // Admin API
    if (path === "/api/admin/players" && method === "GET") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      return apiAdminPlayers(env);
    }
    if (path.startsWith("/api/admin/player/") && method === "GET") {
      if (!userId || !ADMIN_IDS.includes(userId)) return new Response("forbidden", { status: 403 });
      const targetId = path.split("/").pop();
      return apiAdminPlayerState(targetId, env);
    }

    // SPA fallback
    return env.ASSETS.fetch(request);
  },
};
