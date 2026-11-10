
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

const articleForm = document.getElementById("articleForm");
const articleList = document.getElementById("articleList");
const formMessage = document.getElementById("formMessage");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

const imageFile = document.getElementById("imageFile");
const imageUrl = document.getElementById("imageUrl");
const uploadMessage = document.getElementById("uploadMessage");

const API = "/api/articles";

let articlesCache = [];

// MENAMPILKAN PESAN
function showMessage(element, message, success = false) {
  element.textContent = message;
  element.style.color = success ? "#65c98a" : "#e5a36b";
}

// FUNGSI API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Terjadi kesalahan API.");
  }

  return data;
}

// UPLOAD FOTO KE GITHUB
imageFile.addEventListener("change", async function() {
  const file = imageFile.files[0];

  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showMessage(uploadMessage, "Ukuran foto maksimal 10 MB.");
    imageFile.value = "";
    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ];

  if (!allowedTypes.includes(file.type)) {
    showMessage(uploadMessage, "Format foto tidak didukung.");
    imageFile.value = "";
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  imageFile.disabled = true;
  showMessage(uploadMessage, "Sedang mengunggah foto ke GitHub...");

  try {
    const data = await apiRequest("/api/upload", {
      method: "POST",
      body: formData
    });

    imageUrl.value = data.image_url;

    showMessage(
      uploadMessage,
      "Foto berhasil diunggah. URL sudah terisi otomatis.",
      true
    );

  } catch (error) {
    showMessage(uploadMessage, "Upload gagal: " + error.message);
    console.error("Upload error:", error);

  } finally {
    imageFile.disabled = false;
  }
});

// MEMERIKSA LOGIN
async function checkSession() {
  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
      cache: "no-store"
    });

    const data = await response.json();

    if (response.ok && data.authenticated) {
      showDashboard();
      return true;
    }
  } catch (error) {
    console.error("Session error:", error);
  }

  showLogin();
  return false;
}

// DASHBOARD
function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  loadArticles();
}

// LOGIN
function showLogin() {
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

// LOGIN ADMIN
loginForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const button = loginForm.querySelector("button");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  showMessage(loginMessage, "Memeriksa akun administrator...");
  button.disabled = true;

  try {
    await apiRequest("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    document.getElementById("password").value = "";

    const authenticated = await checkSession();

    if (!authenticated) {
      throw new Error("Sesi login belum berhasil dibuat.");
    }

    showMessage(loginMessage, "Login berhasil.", true);

  } catch (error) {
    showMessage(loginMessage, error.message);
  } finally {
    button.disabled = false;
  }
});

// LOGOUT
logoutBtn.addEventListener("click", async function() {
  if (!confirm("Apakah Anda yakin ingin keluar?")) return;

  logoutBtn.disabled = true;

  try {
    await apiRequest("/api/logout", {
      method: "POST"
    });

    articlesCache = [];
    articleForm.reset();
    document.getElementById("articleId").value = "";

    showLogin();
    loginForm.reset();

    showMessage(loginMessage, "Anda berhasil logout.", true);

  } catch (error) {
    alert(error.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

// MEMUAT DAFTAR ARTIKEL
async function loadArticles() {
  articleList.textContent = "Memuat daftar artikel...";

  try {
    const data = await apiRequest(API);
    articlesCache = data.articles || [];
    renderArticles();

  } catch (error) {
    articleList.textContent = "Gagal memuat artikel: " + error.message;
    console.error("Load articles error:", error);
  }
}

// MENAMPILKAN DAFTAR ARTIKEL
function renderArticles() {
  articleList.replaceChildren();

  if (articlesCache.length === 0) {
    articleList.textContent = "Belum ada artikel.";
    return;
  }

  articlesCache.forEach(article => {
    const item = document.createElement("div");

    item.style.padding = "16px";
    item.style.marginBottom = "12px";
    item.style.border = "1px solid #365344";
    item.style.borderRadius = "10px";

    const title = document.createElement("h3");
    title.textContent = article.title;
    title.style.margin = "0 0 8px";

    const info = document.createElement("p");

    info.textContent =
      (article.category || "Berita Tambang") +
      " • " +
      (article.status === "published" ? "Terbit" : "Draft");

    info.style.fontSize = "12px";
    info.style.color = "#a9b9ae";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit Artikel";
    editButton.className = "admin-btn";
    editButton.style.marginRight = "8px";

    editButton.addEventListener("click", function() {
      editArticle(article.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Hapus";
    deleteButton.className = "danger";

    deleteButton.addEventListener("click", function() {
      deleteArticle(article.id);
    });

    item.append(title, info, editButton, deleteButton);
    articleList.appendChild(item);
  });
}

// EDIT ARTIKEL
function editArticle(id) {
  const article = articlesCache.find(
    item => Number(item.id) === Number(id)
  );

  if (!article) {
    alert("Artikel tidak ditemukan.");
    return;
  }

  document.getElementById("articleId").value = article.id;
  document.getElementById("title").value = article.title || "";
  document.getElementById("category").value =
    article.category || "Berita Tambang";
  document.getElementById("summary").value = article.summary || "";
  imageUrl.value = article.image_url || "";
  document.getElementById("body").value = article.body || "";
  document.getElementById("status").value =
    article.status || "draft";

  imageFile.value = "";
  showMessage(uploadMessage, "");

  saveBtn.textContent = "PERBARUI ARTIKEL";

  showMessage(
    formMessage,
    "Mode edit artikel: " + article.title,
    true
  );

  articleForm.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// SIMPAN DAN PERBARUI ARTIKEL
articleForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const id = document.getElementById("articleId").value;

  const article = {
    title: document.getElementById("title").value.trim(),
    category: document.getElementById("category").value,
    summary: document.getElementById("summary").value.trim(),
    image_url: imageUrl.value.trim(),
    body: document.getElementById("body").value.trim(),
    status: document.getElementById("status").value
  };

  if (!article.title || !article.body) {
    showMessage(formMessage, "Judul dan isi berita wajib diisi.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "MENYIMPAN...";

  try {
    const data = await apiRequest(
      id ? API + "/" + encodeURIComponent(id) : API,
      {
        method: id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(article)
      }
    );

    showMessage(formMessage, data.message, true);

    articleForm.reset();
    document.getElementById("articleId").value = "";
    showMessage(uploadMessage, "");

    await loadArticles();

  } catch (error) {
    showMessage(formMessage, error.message);
    console.error("Save article error:", error);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "SIMPAN ARTIKEL";
  }
});

// HAPUS ARTIKEL
async function deleteArticle(id) {
  const article = articlesCache.find(
    item => Number(item.id) === Number(id)
  );

  if (!article) return;

  if (!confirm('Hapus artikel "' + article.title + '"?')) {
    return;
  }

  try {
    const data = await apiRequest(
      API + "/" + encodeURIComponent(id),
      {
        method: "DELETE"
      }
    );

    showMessage(formMessage, data.message, true);
    await loadArticles();

  } catch (error) {
    alert(error.message);
  }
}

// KOSONGKAN FORMULIR
resetBtn.addEventListener("click", function() {
  articleForm.reset();
  document.getElementById("articleId").value = "";
  showMessage(uploadMessage, "");
  saveBtn.textContent = "SIMPAN ARTIKEL";
  showMessage(formMessage, "");
});

// MULAI APLIKASI
checkSession();
