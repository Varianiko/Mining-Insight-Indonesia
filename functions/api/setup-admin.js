
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function toBase64(bytes) {
  return btoa(
    String.fromCharCode(...new Uint8Array(bytes))
  );
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations: 310000,
    hash: "SHA-256"
  }, key, 256);

  return `pbkdf2$310000$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.ADMIN_SETUP_SECRET) {
    return json({
      success: false,
      message: "Database atau secret belum tersedia."
    }, 500);
  }

  const secret = request.headers.get("X-Setup-Secret");

  if (secret !== env.ADMIN_SETUP_SECRET) {
    return json({
      success: false,
      message: "Secret tidak sesuai."
    }, 403);
  }

  try {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM admins"
    ).first();

    if (count.total > 0) {
      return json({
        success: false,
        message: "Akun administrator sudah tersedia."
      }, 409);
    }

    const body = await request.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!/^[a-zA-Z0-9_]{4,30}$/.test(username)) {
      return json({
        success: false,
        message: "Username harus 4-30 karakter."
      }, 400);
    }

    if (password.length < 12) {
      return json({
        success: false,
        message: "Password minimal 12 karakter."
      }, 400);
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(`
      INSERT INTO admins (username, password_hash)
      VALUES (?, ?)
    `).bind(username, passwordHash).run();

    return json({
      success: true,
      message: "Administrator berhasil dibuat."
    });

  } catch (error) {
    return json({
      success: false,
      message: "Gagal membuat akun administrator."
    }, 500);
  }
}
