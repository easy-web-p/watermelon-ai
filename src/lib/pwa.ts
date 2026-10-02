/**
 * Progressive Web App (PWA) manager
 * Handles Service Worker registration and native App Install prompt
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners: Array<() => void> = [];

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener());
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((listener) => listener());
    console.log("🍉 Watermelon AI app was successfully installed!");
  });
}

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("🍉 Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}

export function isPwaInstallable(): boolean {
  return deferredPrompt !== null;
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) {
    return "unavailable";
  }
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((listener) => listener());
  return choice.outcome;
}

export function subscribeToInstallable(callback: () => void): () => void {
  installListeners.push(callback);
  return () => {
    const idx = installListeners.indexOf(callback);
    if (idx !== -1) installListeners.splice(idx, 1);
  };
}
