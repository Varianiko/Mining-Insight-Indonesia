

import {
  json,
  getCookie,
  hashToken,
  clearSessionCookie
} from "./_auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const token = getCookie(request);

    if (token && env.DB) {
      const tokenHash = await hashToken(token);

      await env.DB.prepare(`
        DELETE FROM admin_sessions
        WHERE token_hash = ?
      `).bind(tokenHash).run();
    }

    return json({
      success: true,
      message: "Anda berhasil logout."
    }, 200, {
      "Set-Cookie": clearSessionCookie()
    });

  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return json({
      success: false,
      message: "Gagal mengakhiri sesi login."
    }, 500, {
      "Set-Cookie": clearSessionCookie()
    });
  }
}
