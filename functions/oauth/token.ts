/**
 * Cloudflare Pages Function — 反向代理 /oauth/token → IAM 的 token 端点。
 * 浏览器发同源请求到 /oauth/token，由这个 Function 转发到 iam.transcircle.org，
 * 绕过 CORS 限制。
 */

export async function onRequestPost({ request }: { request: Request }): Promise<Response> {
  const body = await request.text();

  const iamResp = await fetch("https://iam.transcircle.org/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  // 透传 IAM 的响应
  return new Response(iamResp.body, {
    status: iamResp.status,
    statusText: iamResp.statusText,
    headers: {
      "Content-Type": iamResp.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
  });
}
