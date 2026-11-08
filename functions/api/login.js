
import { json, hashToken, sessionCookie } from "./_auth.js";

async function verifyPassword(password, storedHash) {
  try {
    if (!storedHash) return false;

    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);

    if (!Number.isInteger(iterations) ||
        iterations < 10000 ||
        iterations > 1000000) {
      return false;
    }

    const salt = Uint8Array.from(
      atob(parts[2]),
      c => c.charCodeAt(0)
    );

    const expected = Uint8Array.from(
      atob(parts[3]),
      c => c.charCodeAt(0)
    );

    if (salt.length !== 16 || expected.length !== 32) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const result = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      key,
      256
    );

    const actual = new Uint8Array(result);
    let difference = 0;

    for (let i = 0; i < expected.length; i++) {
      difference |= actual[i] ^ expected[i];
    }

    return difference === 0;

  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      success: false,
      message: "Format data tidak valid."
    }, 400);
  }

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password ||
      username.length > 30 ||
      password.length > 256) {
    return json({
      success: false,
      message: "Username atau password tidak valid."
    }, 400);
  }

  try {
    const admin = await env.DB.prepare(`
      SELECT id, username, password_hash
      FROM admins
      WHERE username = ?
      LIMIT 1
    `).bind(username).first();

    if (!admin) {
      return json({
        success: false,
        message: "Username atau password salah."
      }, 401);
    }

    const verified = await verifyPassword(
      password,
      admin.password_hash
    );

    if (!verified) {
      return json({
        success: false,
        message: "Username atau password salah."
      }, 401);
    }

    const token =
      crypto.randomUUID() + crypto.randomUUID();

    const tokenHash = await hashToken(token);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    await env.DB.prepare(`
      INSERT INTO admin_sessions
      (admin_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      admin.id,
      tokenHash,
      expiresAt
    ).run();

    return json({
      success: true,
      message: "Login berhasil.",
      admin: {
        id: admin.id,
        username: admin.username
      }
    }, 200, {
      "Set-Cookie": sessionCookie(token)
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return json({
      success: false,
      message: "Terjadi kesalahan saat login."
    }, 500);
  }
}
