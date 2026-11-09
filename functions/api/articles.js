
import { json, requireAuth } from "./_auth.js";

// Mengambil daftar artikel
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  try {
    const auth = await requireAuth(request, env);

    // Admin dapat melihat semua artikel.
    // Pengunjung hanya dapat melihat artikel terbit.
    const result = auth.session
      ? await env.DB.prepare(`
          SELECT * FROM articles
          ORDER BY created_at DESC
        `).all()
      : await env.DB.prepare(`
          SELECT * FROM articles
          WHERE status = 'published'
          ORDER BY created_at DESC
        `).all();

    return json({
      success: true,
      articles: result.results || []
    });

  } catch (error) {
    console.error("ARTICLE GET ERROR:", error);

    return json({
      success: false,
      message: "Gagal mengambil daftar artikel."
    }, 500);
  }
}

// Menyimpan artikel baru
export async function onRequestPost({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  try {
    const data = await request.json();

    const title = String(data.title || "").trim();
    const category = String(data.category || "Berita Tambang").trim();
    const summary = String(data.summary || "").trim();
    const imageUrl = String(data.image_url || "").trim();
    const body = String(data.body || "").trim();
    const status = data.status === "published"
      ? "published"
      : "draft";

    if (!title || !body) {
      return json({
        success: false,
        message: "Judul dan isi artikel wajib diisi."
      }, 400);
    }

    if (title.length > 180 || summary.length > 400 ||
        category.length > 100 || body.length > 100000) {
      return json({
        success: false,
        message: "Ada bagian artikel yang melebihi batas karakter."
      }, 400);
    }

    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("URL tidak valid");
        }
      } catch {
        return json({
          success: false,
          message: "URL foto harus menggunakan HTTP atau HTTPS."
        }, 400);
      }
    }

    const createdAt = new Date().toISOString();

    const result = await env.DB.prepare(`
      INSERT INTO articles
      (title, category, summary, image_url, body, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      category,
      summary,
      imageUrl,
      body,
      status,
      createdAt
    ).run();

    return json({
      success: true,
      message: "Artikel berhasil disimpan.",
      id: result.meta.last_row_id
    }, 201);

  } catch (error) {
    console.error("ARTICLE POST ERROR:", error);

    return json({
      success: false,
      message: "Gagal menyimpan artikel."
    }, 500);
  }
}
