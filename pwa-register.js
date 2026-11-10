// Registrasi PWA khusus halaman admin.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
      .catch((error) => console.error("PWA service worker gagal:", error));
  });
}
