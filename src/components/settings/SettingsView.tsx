import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Shield,
  Trash2,
  ShieldCheck,
  Key,
} from "lucide-react";
import { useConsentStore } from "@/stores/consent-store";
import { useChatStore } from "@/stores/chat-store";
import { deleteUserConversations, exportUserData } from "@/lib/api";
import { PdpaRightsModal } from "@/components/consent/PdpaRightsModal";
import { AuthModal } from "@/components/auth/AuthModal";

interface SettingsViewProps {
  onNavigate: (route: string) => void;
}

export function SettingsView({ onNavigate }: SettingsViewProps) {
  const consent = useConsentStore();
  const { clearAllConversations } = useChatStore();

  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [showPdpaModal, setShowPdpaModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  async function handleExportData() {
    try {
      const blob = await exportUserData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermelon-ai-user-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      alert("ดาวน์โหลดข้อมูลไม่สำเร็จ");
    }
  }

  async function handleDeleteChats() {
    if (
      !confirm(
        "คุณต้องการลบประวัติการแชททั้งหมดใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)",
      )
    ) {
      return;
    }

    await deleteUserConversations();
    clearAllConversations();
    setDeleteSuccess("ลบประวัติแชททั้งหมดสำเร็จ");
    setTimeout(() => setDeleteSuccess(null), 3000);
  }

  async function handleResetAccount() {
    if (
      !confirm(
        "คุณต้องการเพิกถอนความยินยอมทั้งหมดและรีเซ็ตบัญชีใช่หรือไม่? ระบบจะลบประวัติแชทและคืนค่าความยินยอมทั้งหมด",
      )
    ) {
      return;
    }

    await deleteUserConversations();
    clearAllConversations();
    consent.resetConsent();
    setDeleteSuccess("เพิกถอนความยินยอมและรีเซ็ตข้อมูลสำเร็จ");
    setTimeout(() => setDeleteSuccess(null), 3000);
  }

  return (
    <main className="min-h-screen bg-[#FFFBEF] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate("/chat")}
            className="flex items-center gap-2 text-sm font-semibold text-green-900 hover:text-green-700 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>กลับสู่หน้าแชท</span>
          </button>

          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
            PDPA Act Compliance 2026
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 tracking-tight flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-xl">
            🍉
          </span>
          <span>การตั้งค่าและความเป็นส่วนตัว</span>
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          ควบคุมสิทธิ์การเข้าถึงข้อมูล ไฟล์เสียง รูปภาพ และการยินยอมนำข้อมูลไปพัฒนาแบบจำลอง AI
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setShowPdpaModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
          >
            <ShieldCheck size={16} className="text-emerald-700" />
            <span>ตรวจสอบสิทธิ PDPA & ข้อมูล DPO 📋</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-lime-300 bg-lime-50 px-3.5 py-2 text-xs font-bold text-green-900 shadow-2xs hover:bg-lime-100 transition cursor-pointer"
          >
            <Key size={16} className="text-green-700" />
            <span>เข้าสู่ระบบด้วยเบอร์โทร (OTP) / Social 📲</span>
          </button>
        </div>

        {deleteSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{deleteSuccess}</span>
          </div>
        )}

        {/* Data & Privacy Consent Section */}
        <section className="mt-6 rounded-3xl border border-lime-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-green-950 font-bold text-lg mb-1">
            <Shield size={20} className="text-green-700" />
            <h2>ข้อมูลและความยินยอม (Opt-in Consent)</h2>
          </div>
          <p className="text-xs text-gray-500 mb-6 leading-5">
            ตามมาตรฐาน PDPA คุณมีสิทธิ์เลือกเปิดหรือปิดความยินยอมแต่ละประเภทได้อย่างอิสระ การปิดความยินยอมจะไม่ส่งผลต่อการใช้งานแชทพื้นฐาน
          </p>

          <div className="space-y-6 divide-y divide-lime-100">
            <div className="pt-2">
              <SettingSwitch
                title="อนุญาตให้นำแชทและเสียงไปปรับปรุง AI (Opt-in)"
                description="ข้อมูลที่เลือกจะต้องผ่านกระบวนการคัดกรอง ลบข้อมูลระบุตัวบุคคล (De-identification) และตรวจสอบคุณภาพโดยผู้เชี่ยวชาญก่อนนำเข้าสู่ชุดฝึกโมเดลแตงโมรุ่นถัดไป"
                checked={consent.allowTraining}
                onChange={(checked) =>
                  consent.updateConsent({ allowTraining: checked })
                }
                highlight
              />
            </div>

            <div className="pt-6">
              <SettingSwitch
                title="อนุญาตจัดเก็บไฟล์เสียงเคาะและเสียงพูด"
                description="จัดเก็บไฟล์เสียงเคาะเพื่อใช้แสดงผลในประวัติแชทของคุณ และตรวจสอบผลการวิเคราะห์คลื่นเสียงย้อนหลัง"
                checked={consent.allowAudioStorage}
                onChange={(checked) =>
                  consent.updateConsent({ allowAudioStorage: checked })
                }
              />
            </div>

            <div className="pt-6">
              <SettingSwitch
                title="อนุญาตจัดเก็บรูปภาพแตงโม"
                description="จัดเก็บรูปภาพผิวแตงโม รอยแต้มดิน และขั้วผลเพื่อความต่อเนื่องในประวัติแชท"
                checked={consent.allowImageStorage}
                onChange={(checked) =>
                  consent.updateConsent({ allowImageStorage: checked })
                }
              />
            </div>

            <div className="pt-6">
              <SettingSwitch
                title="คุกกี้วิเคราะห์การใช้งาน (Analytics Cookies)"
                description="ช่วยให้ทีมงานเข้าใจความเสถียรของระบบ เวลาตอบสนอง และข้อผิดพลาด เพื่อนำไปปรับปรุงประสบการณ์การใช้งาน"
                checked={consent.analyticsCookies}
                onChange={(checked) =>
                  consent.updateConsent({
                    analyticsCookies: checked,
                    hasSelectedCookies: true,
                  })
                }
              />
            </div>

            <div className="pt-6">
              <SettingSwitch
                title="อนุญาตให้ใช้ข้อมูลเพื่อการวิจัยทางวิชาการ"
                description="เปิดให้สถาบันวิจัยการเกษตรร่วมพัฒนาฐานข้อมูลเสียงเรโซแนนซ์ผลไม้โดยไม่เปิดเผยตัวตน"
                checked={consent.allowResearch}
                onChange={(checked) =>
                  consent.updateConsent({ allowResearch: checked })
                }
              />
            </div>
          </div>
        </section>

        {/* Data Rights & Management Section */}
        <section className="mt-6 rounded-3xl border border-red-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2.5 text-red-900 font-bold text-lg mb-1">
            <Lock size={20} className="text-red-600" />
            <h2>การจัดการข้อมูลบัญชีตามสิทธิ PDPA</h2>
          </div>
          <p className="text-xs text-gray-500 mb-6 leading-5">
            สิทธิในการเข้าถึง ดาวน์โหลด สำเนา และลบข้อมูลส่วนบุคคล (Right to be Forgotten)
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors shadow-2xs"
            >
              <Download size={16} className="text-gray-600" />
              <span>ดาวน์โหลดข้อมูลของฉัน (JSON)</span>
            </button>

            <button
              onClick={handleDeleteChats}
              className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors shadow-2xs"
            >
              <Trash2 size={16} />
              <span>ลบประวัติแชททั้งหมด</span>
            </button>

            <button
              onClick={handleResetAccount}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-xs"
            >
              <RefreshCw size={16} />
              <span>เพิกถอนสิทธิ์ & รีเซ็ตบัญชี</span>
            </button>
          </div>

          {downloadSuccess && (
            <p className="mt-3 text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={15} />
              ดาวน์โหลดไฟล์สำเนาข้อมูลเรียบร้อยแล้ว
            </p>
          )}
        </section>

        <PdpaRightsModal
          isOpen={showPdpaModal}
          onClose={() => setShowPdpaModal(false)}
        />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </main>
  );
}

function SettingSwitch({
  title,
  description,
  checked,
  onChange,
  highlight = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  highlight?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-5 group">
      <span className="flex-1">
        <span
          className={`block font-bold text-sm ${
            highlight ? "text-green-950" : "text-gray-900"
          }`}
        >
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-green-700 rounded-md cursor-pointer"
      />
    </label>
  );
}
