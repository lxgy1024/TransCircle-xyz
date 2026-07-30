/**
 * 反向代理 OAuth 端点到 IAM，其余请求走静态资源。
 *
 * /oauth/token    (POST) → iam.transcircle.org/oauth2/token
 * /oauth/userinfo (GET)  → iam.transcircle.org/oauth2/userinfo
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /oauth/token → IAM token 端点
    if (url.pathname === "/oauth/token" && request.method === "POST") {
      const body = await request.text();
      const iamResp = await fetch("https://iam.transcircle.org/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      return new Response(iamResp.body, {
        status: iamResp.status,
        headers: { "Content-Type": iamResp.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
      });
    }

    // GET /oauth/userinfo → IAM UserInfo 端点（透传 Authorization header）
    if (url.pathname === "/oauth/userinfo") {
      const iamResp = await fetch("https://iam.transcircle.org/oauth2/userinfo", {
        headers: { Authorization: request.headers.get("Authorization") || "" },
      });
      return new Response(iamResp.body, {
        status: iamResp.status,
        headers: { "Content-Type": iamResp.headers.get("Content-Type") || "application/json", "Cache-Control": "no-store" },
      });
    }

    // 其余走静态资源
    return env.ASSETS.fetch(request);
  },
};
