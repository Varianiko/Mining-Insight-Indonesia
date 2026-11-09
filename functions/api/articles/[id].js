
import { json, requireAuth } from "../_auth.js";

// Validasi ID artikel
function getArticleId(params) {
  const id = Number(params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    return null;
  }

  return id;
}

// Mengedit artikel
export async function onRequestPut({ request, env, params }) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  const id = getArticleId(params);

  if (!id) {
    return json({
      success: false,
      message: "ID artikel tidak valid."
    }, 400);
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
      category.length > 100 ||
      summary.length > 400 ||
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

    const result = await env.DB.prepare(`
      UPDATE articles
      SET title = ?,
          category = ?,
          summary = ?,
          image_url = ?,
          content = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title,
      category,
      summary,
      imageUrl,
      content,
      status,
      id
    ).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        message: "Artikel tidak ditemukan."
      }, 404);
    }

    return json({
      success: true,
      message: "Artikel berhasil diperbarui."
    });

  } catch (error) {
    console.error("ARTICLE UPDATE ERROR:", error);

    return json({
      success: false,
      message: "Gagal memperbarui artikel: " + error.message
    }, 500);
  }
}

// Menghapus artikel
export async function onRequestDelete({ request, env, params }) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  if (!env.DB) {
    return json({
      success: false,
      message: "Database D1 belum terhubung."
    }, 500);
  }

  const id = getArticleId(params);

  if (!id) {
    return json({
      success: false,
      message: "ID artikel tidak valid."
    }, 400);
  }

  try {
    const result = await env.DB.prepare(`
      DELETE FROM articles
      WHERE id = ?
    `).bind(id).run();

    if (!result.meta.changes) {
      return json({
        success: false,
        message: "Artikel tidak ditemukan."
      }, 404);
    }

    return json({
      success: true,
      message: "Artikel berhasil dihapus."
    });

  } catch (error) {
    console.error("ARTICLE DELETE ERROR:", error);

    return json({
      success: false,
      message: "Gagal menghapus artikel: " + error.message
    }, 500);
  }
}
