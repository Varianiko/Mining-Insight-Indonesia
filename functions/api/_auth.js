
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getCookie(request) {
  const cookies = request.headers.get("Cookie") || "";

  for (const item of cookies.split(";")) {
    const [name, ...values] = item.trim().split("=");

    if (name === "mii_session") {
      return values.join("=");
    }
  }

  return null;
}

export async function getSession(request, env) {
  if (!env.DB) return null;

  const token = getCookie(request);
  if (!token) return null;

  const tokenHash = await hashToken(token);

  const session = await env.DB.prepare(`
    SELECT admin_sessions.id,
           admin_sessions.admin_id,
           admins.username
    FROM admin_sessions
    JOIN admins
      ON admins.id = admin_sessions.admin_id
    WHERE admin_sessions.token_hash = ?
      AND datetime(admin_sessions.expires_at) > datetime('now')
  `).bind(tokenHash).first();

  return session || null;
}

export async function requireAuth(request, env) {
  const session = await getSession(request, env);

  if (!session) {
    return {
      error: json({
        success: false,
        message: "Silakan login terlebih dahulu."
      }, 401)
    };
  }

  return { session };
}

export function sessionCookie(token) {
  return `mii_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`;
}

export function clearSessionCookie() {
  return "mii_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0";
}
