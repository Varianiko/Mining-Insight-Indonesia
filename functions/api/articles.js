
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

    const result = auth.session
      ? await env.DB.prepare(`
          SELECT *, content AS body
          FROM articles
          ORDER BY created_at DESC
        `).all()
      : await env.DB.prepare(`
          SELECT *, content AS body
          FROM articles
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
    const content = String(data.body || data.content || "").trim();

    const status = data.status === "published"
      ? "published"
      : "draft";

    if (!title || !content) {
      return json({
        success: false,
        message: "Judul dan isi artikel wajib diisi."
      }, 400);
    }

    if (
      title.length > 180 ||
      summary.length > 400 ||
      category.length > 100 ||
      content.length > 100000
    ) {
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

    // Membuat slug dari judul
    const slugBase = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 150) || "artikel";

    const slug = slugBase + "-" + Date.now();

    // Simpan ke database D1
    const result = await env.DB.prepare(`
      INSERT INTO articles
      (title, slug, content, category, image_url, status, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      slug,
      content,
      category,
      imageUrl,
      status,
      summary
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
      message: "Gagal menyimpan artikel: " + error.message
    }, 500);
  }
}
