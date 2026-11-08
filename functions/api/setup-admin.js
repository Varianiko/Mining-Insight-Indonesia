
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
    Array.from(bytes)
      .map(byte => String.fromCharCode(byte))
      .join("")
  );
}

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const iterations = 100000;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256"
    },
    key,
    256
  );

  return [
    "pbkdf2",
    String(iterations),
    toBase64(salt),
    toBase64(new Uint8Array(hash))
  ].join("$");
}

export async function onRequestPost({ request, env }) {

  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  if (!env.ADMIN_SETUP_SECRET) {
    return json({
      success: false,
      message: "ADMIN_SETUP_SECRET belum tersedia."
    }, 500);
  }

  const suppliedSecret =
    request.headers.get("X-Setup-Secret") || "";

  if (suppliedSecret !== env.ADMIN_SETUP_SECRET) {
    return json({
      success: false,
      message: "Secret Cloudflare tidak sesuai."
    }, 403);
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

  if (!/^[a-zA-Z0-9_]{4,30}$/.test(username)) {
    return json({
      success: false,
      message: "Username harus 4 sampai 30 karakter."
    }, 400);
  }

  if (password.length < 12 || password.length > 256) {
    return json({
      success: false,
      message: "Password harus 12 sampai 256 karakter."
    }, 400);
  }

  try {

    const existing = await env.DB.prepare(`
      SELECT id, username
      FROM admins
      LIMIT 1
    `).first();

    if (existing) {
      return json({
        success: false,
        message: "Administrator sudah tersedia. Silakan login."
      }, 409);
    }

    const passwordHash = await hashPassword(password);

    const result = await env.DB.prepare(`
      INSERT INTO admins (username, password_hash)
      SELECT ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM admins
      )
    `).bind(
      username,
      passwordHash
    ).run();

    if (!result.success) {
      throw new Error("Database gagal menyimpan administrator.");
    }

    if (!result.meta || result.meta.changes !== 1) {
      return json({
        success: false,
        message: "Administrator sudah dibuat oleh proses lain."
      }, 409);
    }

    return json({
      success: true,
      message: "Administrator berhasil dibuat. Silakan login."
    }, 201);

  } catch (error) {

    console.error("SETUP ADMIN ERROR:", error);

    let detail = String(error.message || error);

    if (detail.includes("UNIQUE constraint failed")) {
      detail = "Username sudah digunakan.";
    }

    return json({
      success: false,
      message: "Gagal membuat akun administrator.",
      detail: detail
    }, 500);

  }
}
