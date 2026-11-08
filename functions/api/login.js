
export async function onRequestPost({ request, env }) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json(
        { success: false, message: "Username dan password wajib diisi" },
        { status: 400 }
      );
    }

    const admin = await env.DB.prepare(
      "SELECT id, username, password_hash FROM admins WHERE username = ?"
    ).bind(username).first();

    if (!admin) {
      return Response.json(
        { success: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.password_hash);

    if (!valid) {
      return Response.json(
        { success: false, message: "Username atau password salah" },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID() + crypto.randomUUID();

    const tokenHash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );

    const hashHex = Array.from(new Uint8Array(tokenHash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    await env.DB.prepare(
      "INSERT INTO sessions (admin_id, token_hash, expires_at) VALUES (?, ?, datetime('now', '+1 day'))"
    ).bind(admin.id, hashHex).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login berhasil",
        token
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
        }
      }
    );

  } catch (error) {
    return Response.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

async function verifyPassword(password, storedHash) {
  try {
    const parts = storedHash.split("$");

    if (parts.length !== 4 || parts[0] !== "pbkdf2") {
      return false;
    }

    const iterations = Number(parts[1]);

    if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) {
      return false;
    }

    const salt = Uint8Array.from(atob(parts[2]), c => c.charCodeAt(0));
    const expected = Uint8Array.from(atob(parts[3]), c => c.charCodeAt(0));

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
