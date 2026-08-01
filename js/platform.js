
/*
 * platform.js — American Rumble platform shell
 * Same game codebase for desktop/mobile browser, installed PWA, and Telegram Mini Apps.
 */
(() => {
  const label = document.getElementById("platform-label");
  const installBtn = document.getElementById("btn-install");
  let deferredPrompt = null;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (typeof tg.disableVerticalSwipes === "function") tg.disableVerticalSwipes();

      const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
      if (label) label.textContent = user?.first_name
        ? `TELEGRAM • ${user.first_name.toUpperCase()}`
        : "TELEGRAM MINI APP";

      // Match the game's dark shell where supported.
      if (typeof tg.setHeaderColor === "function") tg.setHeaderColor("#0b1018");
      if (typeof tg.setBackgroundColor === "function") tg.setBackgroundColor("#0b1018");
    } catch (err) {
      console.warn("Telegram bridge unavailable:", err);
    }
  } else if (label) {
    label.textContent = isStandalone ? "INSTALLED APP" : "WEB / PWA";
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn && !tg && !isStandalone) installBtn.classList.remove("hidden");
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch (_) {}
      deferredPrompt = null;
      installBtn.classList.add("hidden");
    });
  }

  window.addEventListener("appinstalled", () => {
    if (installBtn) installBtn.classList.add("hidden");
    if (label && !tg) label.textContent = "INSTALLED APP";
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .catch(err => console.warn("Service worker registration failed:", err));
    });
  }

  // Lightweight platform API for future leaderboards/share/team invites.
  window.AmericanRumblePlatform = {
    type: tg ? "telegram" : (isStandalone ? "pwa" : "web"),
    telegram: tg,
    getUser() {
      if (tg?.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        return { id: u.id, firstName: u.first_name, lastName: u.last_name, username: u.username };
      }
      return null;
    },
    haptic(kind = "impact") {
      try {
        if (!tg?.HapticFeedback) return;
        if (kind === "success") tg.HapticFeedback.notificationOccurred("success");
        else tg.HapticFeedback.impactOccurred("medium");
      } catch (_) {}
    }
  };
})();
