/**
 * Cloudflare Pages Advanced Mode Worker
 * 
 * 代理 /oauth/token → IAM，绕过浏览器 CORS。
 * 其余请求走静态文件。
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /oauth/token → 代理到 IAM
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

    // 其余走静态文件
    return env.ASSETS.fetch(request);
  },
};
