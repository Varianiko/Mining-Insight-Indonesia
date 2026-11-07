
import { json, hashToken, sessionCookie } from "./_auth.js";

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

  if (!username || !password) {
    return json({
      success: false,
      message: "Username dan password wajib diisi."
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

    // Verifikasi menggunakan format hash yang digunakan
    // oleh sistem admin lama.
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

    const token = crypto.randomUUID() + crypto.randomUUID();
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
    return json({
      success: false,
      message: "Terjadi kesalahan saat login."
    }, 500);
  }
}

// Placeholder aman: algoritma hash harus disesuaikan
// dengan algoritma yang benar-benar digunakan sistem lama.
async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // Jangan menerima password mentah sebagai hash.
  // Verifikasi final akan dipasang setelah format hash diketahui.
  return false;
}
