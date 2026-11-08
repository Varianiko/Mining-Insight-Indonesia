
import { json, getSession } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await getSession(request, env);

    if (!session) {
      return json({
        success: false,
        authenticated: false,
        message: "Belum login."
      }, 401);
    }

    return json({
      success: true,
      authenticated: true,
      admin: {
        id: session.admin_id,
        username: session.username
      }
    });

  } catch (error) {
    console.error("SESSION CHECK ERROR:", error);

    return json({
      success: false,
      authenticated: false,
      message: "Gagal memeriksa sesi."
    }, 500);
  }
}

