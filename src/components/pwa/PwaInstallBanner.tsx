import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone, Sparkles } from "lucide-react";
import { isPwaInstallable, promptPwaInstall, subscribeToInstallable, isStandaloneApp } from "@/lib/pwa";

export function PwaInstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandaloneApp()) {
      return; // Already installed as standalone app!
    }

    const dismissed = localStorage.getItem("watermelon_pwa_dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 86400000 * 3) {
      setIsDismissed(true);
    }

    setCanInstall(isPwaInstallable());
    const unsubscribe = subscribeToInstallable(() => {
      setCanInstall(isPwaInstallable());
    });

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    const result = await promptPwaInstall();
    if (result === "accepted") {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("watermelon_pwa_dismissed", Date.now().toString());
  };

  if (isDismissed || isStandaloneApp()) {
    return null;
  }

  // If on iOS or installable browser
  if (!canInstall && !isIos) {
    return null;
  }

  return (
    <>
      <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-xs">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">
                ติดตั้ง Watermelon AI บนหน้าจอมือถือ (PWA)
              </p>
              <p className="hidden text-xs text-emerald-100 sm:block">
                ใช้งานในแปลงเกษตรได้ทันที รวดเร็ว ไม่ต้องโหลดจาก Store รองรับโหมดออฟไลน์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
            >
              {isIos ? (
                <>
                  <Share className="h-3.5 w-3.5" />
                  วิธีติดตั้งบน iPhone
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  เพิ่มลงหน้าจอโฮม
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1.5 text-emerald-100 hover:bg-white/10 hover:text-white"
              title="ปิดการแจ้งเตือน"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700">
                <Sparkles className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900">ติดตั้งบน iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  1
                </span>
                <span>
                  แตะปุ่ม <strong>แชร์ (Share)</strong> <Share className="inline h-4 w-4 text-sky-600" /> ที่แถบเมนูด้านล่างของ Safari
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  2
                </span>
                <span>
                  เลื่อนลงมาแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  3
                </span>
                <span>
                  กดปุ่ม <strong>"เพิ่ม (Add)"</strong> มุมขวาบน เพื่อเริ่มใช้งานแบบแอปเต็มหน้าจอในแปลงปลูกได้ทันที!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
