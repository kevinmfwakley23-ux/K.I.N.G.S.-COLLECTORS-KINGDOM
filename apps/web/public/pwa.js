(() => {
  const installButtons = () => Array.from(document.querySelectorAll("[data-install-kingdom]"));
  let installPrompt = null;

  function setInstallVisible(visible) {
    for (const button of installButtons()) button.hidden = !visible;
  }

  function isStandalone() {
    return window.matchMedia?.("(display-mode: standalone)").matches === true || window.navigator.standalone === true;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (!isStandalone()) setInstallVisible(true);
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    setInstallVisible(false);
  });

  window.addEventListener("DOMContentLoaded", () => {
    if (isStandalone()) setInstallVisible(false);

    for (const button of installButtons()) {
      button.addEventListener("click", async () => {
        if (!installPrompt) return;
        const prompt = installPrompt;
        installPrompt = null;
        setInstallVisible(false);
        await prompt.prompt();
        await prompt.userChoice.catch(() => null);
      });
    }
  });

  const localSecureOrigin = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && (window.isSecureContext || localSecureOrigin)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
        // Installation support is progressive. Runtime functionality does not depend on the service worker.
      });
    });
  }
})();
