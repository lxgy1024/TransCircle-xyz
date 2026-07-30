/**
 * Cloudflare Pages Function — 反向代理 /oauth/token → IAM。
 * 浏览器同源请求 /oauth/token，由此函数转发到 iam.transcircle.org，绕过 CORS。
 */
export async function onRequest(context) {
  const { request } = context;
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

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
      "Pragma": "no-cache",
    },
  });
}
