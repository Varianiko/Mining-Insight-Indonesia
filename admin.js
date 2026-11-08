

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutBtn = document.getElementById("logoutBtn");

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
    console.error("Session check failed:", error);
  }

  showLogin();
  return false;
}

function showDashboard() {
  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
}

function showLogin() {
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

loginForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const button = loginForm.querySelector("button");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginMessage.textContent = "Memeriksa akun administrator...";
  button.disabled = true;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Login gagal.");
    }

    document.getElementById("password").value = "";

    const authenticated = await checkSession();

    if (!authenticated) {
      throw new Error("Session belum berhasil dibuat.");
    }

  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

logoutBtn.addEventListener("click", async function() {
  if (!confirm("Apakah Anda yakin ingin keluar?")) return;

  logoutBtn.disabled = true;

  try {
    const response = await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin"
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Logout gagal.");
    }

    showLogin();
    loginForm.reset();
    loginMessage.textContent = "Anda berhasil logout.";

  } catch (error) {
    alert(error.message);
  } finally {
    logoutBtn.disabled = false;
  }
});

// Mencegah formulir artikel melakukan reload
// sebelum API pengelolaan artikel diperiksa.
document.getElementById("articleForm")
  .addEventListener("submit", function(e) {
    e.preventDefault();

    document.getElementById("formMessage").textContent =
      "API pengelolaan artikel belum dikonfigurasi.";
  });

document.getElementById("resetBtn")
  .addEventListener("click", function() {
    document.getElementById("articleForm").reset();
    document.getElementById("articleId").value = "";
    document.getElementById("formMessage").textContent = "";
  });

checkSession();
