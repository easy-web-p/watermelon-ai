import { useState } from "react";
import { useConsentStore } from "@/stores/consent-store";
import { Cookie, Shield, ShieldCheck } from "lucide-react";
import { PdpaRightsModal } from "@/components/consent/PdpaRightsModal";

interface CookieBannerProps {
  onNavigateSettings?: () => void;
}

export function CookieBanner({ onNavigateSettings }: CookieBannerProps) {
  const [showPdpaModal, setShowPdpaModal] = useState(false);
  const {
    hasSelectedCookies,
    acceptAllCookies,
    rejectOptionalCookies,
  } = useConsentStore();

  if (hasSelectedCookies && !showPdpaModal) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="การตั้งค่าคุกกี้และความเป็นส่วนตัว"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-3xl border border-lime-200 bg-white/95 p-5 shadow-2xl backdrop-blur-md transition-all duration-300"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3 flex-1">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lime-100 text-green-800">
            <Cookie size={20} />
          </div>
          <div>
            <h2 className="font-bold text-green-950 flex items-center gap-1.5 text-base">
              <span>คุกกี้ชิ้นนี้ไม่ใช่แตงโมนะ</span>
              <button
                type="button"
                onClick={() => setShowPdpaModal(true)}
                className="cursor-pointer text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full border border-emerald-300 transition"
              >
                สิทธิ PDPA 📋
              </button>
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              เราใช้คุกกี้ที่จำเป็นเพื่อให้ระบบทำงาน และใช้คุกกี้วิเคราะห์เมื่อคุณอนุญาตเท่านั้น โดยไม่นำข้อมูลแชทไปฝึกโมเดล AI หากไม่ได้รับความยินยอมล่วงหน้า{" "}
              <button
                type="button"
                onClick={() => setShowPdpaModal(true)}
                className="font-semibold text-green-700 underline hover:text-green-800 cursor-pointer"
              >
                ตรวจสอบสิทธิ & ข้อมูล DPO
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={rejectOptionalCookies}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            เฉพาะที่จำเป็น
          </button>

          <button
            onClick={acceptAllCookies}
            className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Shield size={15} />
            ยอมรับทั้งหมด
          </button>
        </div>
      </div>

      <PdpaRightsModal
        isOpen={showPdpaModal}
        onClose={() => setShowPdpaModal(false)}
      />
    </aside>
  );
}
