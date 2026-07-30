/**
 * TransCircle IAM OAuth2/OIDC 集成
 *
 * 转盘游戏作为 OIDC 客户端接入 IAM：
 *   - Authorization Code + PKCE (S256) — PKCE 对任何客户端都强制
 *   - 如配置了 client_secret 则一并发送（client_secret_post）
 *   - 登录后从 UserInfo 获取 preferred_username 作为玩家名
 *
 * 环境变量：
 *   VITE_IAM_ISSUER         — IAM 地址，如 https://iam.transcircle.org
 *   VITE_IAM_CLIENT_ID      — OIDC 客户端 ID
 *   VITE_IAM_CLIENT_SECRET  — 可选，机密客户端的密钥
 *   VITE_IAM_REDIRECT_URI   — 回调地址，默认 window.location.origin
 */

interface IamConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

let _config: IamConfig | null = null;

function getConfig(): IamConfig | null {
  if (_config) return _config;
  const issuer = import.meta.env.VITE_IAM_ISSUER as string | undefined;
  const clientId = import.meta.env.VITE_IAM_CLIENT_ID as string | undefined;
  if (!issuer || !clientId) return null;
  _config = {
    issuer: issuer.replace(/\/+$/, ""),
    clientId,
    clientSecret: import.meta.env.VITE_IAM_CLIENT_SECRET as string | undefined,
    redirectUri: (import.meta.env.VITE_IAM_REDIRECT_URI as string) || window.location.origin,
  };
  return _config;
}

/** IAM 是否已配置（客户端可用） */
export function isIamConfigured(): boolean {
  return getConfig() !== null;
}

// ── PKCE ────────────────────────────────────────

function base64UrlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(digest);
}

// ── 存储键名 ─────────────────────────────────────

const STORAGE_KEY_VERIFIER = "iam_code_verifier";
const STORAGE_KEY_STATE = "iam_oauth_state";
const STORAGE_KEY_TOKENS = "iam_tokens";
const STORAGE_KEY_USER = "iam_user";

interface IamTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_at: number; // timestamp ms
}

export interface IamUser {
  sub: string;
  preferred_username: string;
  name: string;
  picture?: string;
  email?: string;
  tc_roles?: string[];
  tc_permissions?: string[];
  tc_groups?: string[];
}

// ── 构建授权 URL ─────────────────────────────────

export async function buildAuthUrl(): Promise<string> {
  const cfg = getConfig();
  if (!cfg) throw new Error("IAM not configured");

  const verifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(verifier);
  const state = generateCodeVerifier(); // reuse as random state

  // 存到 sessionStorage（关闭浏览器即失效）
  sessionStorage.setItem(STORAGE_KEY_VERIFIER, verifier);
  sessionStorage.setItem(STORAGE_KEY_STATE, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: "openid profile tc.permissions",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce: generateCodeVerifier(),
  });

  return `${cfg.issuer}/oauth2/auth?${params.toString()}`;
}

// ── 处理回调 ─────────────────────────────────────

export type CallbackResult = {
  success: true;
  user: IamUser;
} | {
  success: false;
  error: string;
};

/**
 * 从 URL 解析 OAuth 回调参数并换 token、拉用户信息。
 * 调用后自动清除 URL 参数（防止刷新重复处理）。
 */
export async function processCallback(): Promise<CallbackResult | null> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");

  // 没有回调参数 → 不处理
  if (!code && !error) return null;

  // 清除 URL（replaceState 保留 history 条目，但去掉参数）
  window.history.replaceState({}, "", window.location.pathname);

  if (error) {
    return { success: false, error: `IAM 返回错误: ${error}` };
  }

  const savedState = sessionStorage.getItem(STORAGE_KEY_STATE);
  if (state && state !== savedState) {
    return { success: false, error: "state 不匹配，可能遭受 CSRF 攻击" };
  }
  sessionStorage.removeItem(STORAGE_KEY_STATE);

  const verifier = sessionStorage.getItem(STORAGE_KEY_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  if (!verifier) {
    return { success: false, error: "缺少 code_verifier（会话已过期？）" };
  }

  if (!code) return { success: false, error: "缺少授权码" };

  const cfg = getConfig();
  if (!cfg) return { success: false, error: "IAM 未配置" };

  // 换 token
  let tokenData: IamTokens;
  try {
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId,
      code_verifier: verifier,
    };
    if (cfg.clientSecret) {
      body.client_secret = cfg.clientSecret;
    }

    // 走同源代理 /oauth/token（避免跨域 CORS）：
    //   生产 → Cloudflare Pages Function 转发到 IAM
    //   开发 → Vite proxy 转发到 IAM
    const resp = await fetch(`/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      return {
        success: false,
        error: `令牌交换失败: ${errBody.error_description || errBody.error || resp.status}`,
      };
    }

    const json = await resp.json();
    const expiresIn = (json.expires_in as number) || 3600;
    tokenData = {
      access_token: json.access_token,
      id_token: json.id_token,
      refresh_token: json.refresh_token,
      expires_at: Date.now() + expiresIn * 1000,
    };
  } catch (e) {
    return {
      success: false,
      error: `令牌交换网络错误: ${e instanceof Error ? e.message : "未知"}`,
    };
  }

  // 存 token
  localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokenData));

  // 拉 UserInfo
  try {
    const resp = await fetch(`/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!resp.ok) {
      return { success: false, error: `UserInfo 请求失败: ${resp.status}` };
    }
    const user = (await resp.json()) as IamUser;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return { success: true, user };
  } catch (e) {
    return {
      success: false,
      error: `UserInfo 网络错误: ${e instanceof Error ? e.message : "未知"}`,
    };
  }
}

// ── 获取已存储的用户 ─────────────────────────────

export function getStoredUser(): IamUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw) as IamUser;
  } catch {
    return null;
  }
}

export function getStoredTokens(): IamTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TOKENS);
    if (!raw) return null;
    const t = JSON.parse(raw) as IamTokens;
    if (t.expires_at < Date.now()) {
      localStorage.removeItem(STORAGE_KEY_TOKENS);
      localStorage.removeItem(STORAGE_KEY_USER);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

/** 登出：清除 IAM 相关存储 */
export function logout(): void {
  localStorage.removeItem(STORAGE_KEY_TOKENS);
  localStorage.removeItem(STORAGE_KEY_USER);
  sessionStorage.removeItem(STORAGE_KEY_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEY_STATE);
}
