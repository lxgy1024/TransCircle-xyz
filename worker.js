/**
 * 只处理 /oauth/token 代理，其余由 Workers Static Assets 自动服务。
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /oauth/token → 反向代理到 IAM
    if (url.pathname === "/oauth/token" && request.method === "POST") {
      const body = await request.text();
      const iamResp = await fetch("https://iam.transcircle.org/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      return new Response(iamResp.body, {
        status: iamResp.status,
        headers: {
          "Content-Type": iamResp.headers.get("Content-Type") || "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // SPA fallback: 所有非 API 请求走静态资源
    return env.ASSETS.fetch(request);
  },
};
