
import { json, requireAuth } from "./_auth.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

function safeFilename(name) {
  return String(name || "foto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-100) || "foto";
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;

  if (
    !env.GITHUB_TOKEN ||
    !env.GITHUB_OWNER ||
    !env.GITHUB_REPO ||
    !env.GITHUB_BRANCH
  ) {
    return json({
      success: false,
      message: "Konfigurasi GitHub belum lengkap."
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({
        success: false,
        message: "Format foto tidak didukung."
      }, 400);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return json({
        success: false,
        message: "Ukuran foto maksimal 10 MB."
      }, 400);
    }

    const filename =
      Date.now() + "-" +
      crypto.randomUUID().slice(0, 8) + "-" +
      safeFilename(file.name);

    const path = "uploads/articles/" + filename;

    const apiUrl =
      "https://api.github.com/repos/" +
      encodeURIComponent(env.GITHUB_OWNER) + "/" +
      encodeURIComponent(env.GITHUB_REPO) +
      "/contents/" +
      path.split("/").map(encodeURIComponent).join("/");

    const content = toBase64(await file.arrayBuffer());

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
  "Authorization": "Bearer " + env.GITHUB_TOKEN,
  "User-Agent": "MiningInsightIndonesia",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Upload artikel: " + filename,
        content,
        branch: env.GITHUB_BRANCH
      })
    });

    const responseText = await response.text();

    let githubData = {};

    try {
      githubData = JSON.parse(responseText);
    } catch {
      githubData = {};
    }

    if (!response.ok) {
      console.error("GITHUB ERROR:", response.status, responseText);

      return json({
        success: false,
        message:
          "GitHub menolak upload. HTTP " +
          response.status +
          ". Alasan: " +
          (githubData.message || responseText || "Respons GitHub kosong.")
      }, 502);
    }

    const imageUrl =
      "https://raw.githubusercontent.com/" +
      env.GITHUB_OWNER + "/" +
      env.GITHUB_REPO + "/" +
      env.GITHUB_BRANCH + "/" +
      path;

    return json({
      success: true,
      message: "Foto berhasil diunggah ke GitHub.",
      image_url: imageUrl,
      filename
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);

    return json({
      success: false,
      message: error.message || "Upload foto gagal."
    }, 500);
  }
}
