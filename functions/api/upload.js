
import { json, requireAuth } from "./_auth.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  if (!env.PRONTO_SECRET_KEY) {
    return json({
      success: false,
      message: "Konfigurasi penyimpanan gambar belum tersedia."
    }, 500);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({
        success: false,
        message: "Silakan pilih foto terlebih dahulu."
      }, 400);
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
      return json({
        success: false,
        message: "Format foto harus JPG, PNG, WEBP, atau GIF."
      }, 400);
    }

    if (file.size > MAX_FILE_SIZE || file.size === 0) {
      return json({
        success: false,
        message: "Ukuran foto maksimal 10 MB."
      }, 400);
    }

    const headers = {
      "Authorization": `ApiKey ${env.PRONTO_SECRET_KEY}`,
      "Content-Type": "application/json"
    };

    // 1. Meminta alamat upload
    const presignResponse = await fetch(
      "https://api.getpronto.io/v1/upload/presign",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          filename: file.name,
          mimetype: file.type,
          size: file.size,
          folderName: "mining-insight-indonesia"
        })
      }
    );

    if (!presignResponse.ok) {
      throw new Error("Gagal meminta alamat upload.");
    }

    const presign = await presignResponse.json();

    if (!presign.uploadUrl || !presign.pendingUploadId) {
      throw new Error("Alamat upload tidak valid.");
    }

    // 2. Mengirim foto ke penyimpanan
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type
      },
      body: file.stream()
    });

    if (!uploadResponse.ok) {
      throw new Error("Gagal mengunggah foto.");
    }

    // 3. Mengonfirmasi upload
    const confirmResponse = await fetch(
      "https://api.getpronto.io/v1/upload/confirm",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          pendingUploadId: presign.pendingUploadId
        })
      }
    );

    if (!confirmResponse.ok) {
      throw new Error("Gagal mengonfirmasi foto.");
    }

    const confirmation = await confirmResponse.json();
    const uploadedFile = confirmation.file;

    const imageUrl = uploadedFile?.rawUrl ||
                     uploadedFile?.secureUrl;

    if (!imageUrl) {
      throw new Error("URL foto tidak ditemukan.");
    }

    return json({
      success: true,
      message: "Foto berhasil diunggah.",
      image_url: imageUrl,
      filename: uploadedFile.name
    });

  } catch (error) {
    console.error("IMAGE UPLOAD ERROR:", error);

    return json({
      success: false,
      message: error.message || "Upload foto gagal."
    }, 500);
  }
}
