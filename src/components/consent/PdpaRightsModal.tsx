import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Download,
  AlertTriangle,
  Check,
  X,
  FileText,
  Lock,
} from "lucide-react";
import { useConsentStore } from "@/stores/consent-store";
import { useAuthStore } from "@/stores/auth-store";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PdpaRightsModal({ isOpen, onClose }: Props) {
  const [policyData, setPolicyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const { allowTraining, updateConsent } = useConsentStore();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetch("/api/v1/pdpa/policy")
        .then((r) => r.json())
        .then(setPolicyData)
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleForgetMe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/pdpa/forget-me", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser.id,
        },
      });
      if (res.ok) {
        setDeleteSuccess(true);
        setTimeout(() => {
          setDeleteSuccess(false);
          setDeleteConfirm(false);
          onClose();
          window.location.reload();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    window.open(`/api/v1/pdpa/export-my-data?userId=${currentUser.id}`, "_blank");
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-lime-100 bg-gradient-to-r from-emerald-800 to-green-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold sm:text-lg">การจัดการสิทธิและความเป็นส่วนตัว (PDPA)</h2>
              <p className="text-xs text-emerald-100">พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-slate-800 text-xs sm:text-sm">
          {/* Org & DPO Card */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-emerald-800 shrink-0" />
              <div>
                <h3 className="font-bold text-emerald-950">
                  {policyData?.organizationName || "สหกรณ์พัฒนาเทคโนโลยีแตงโมไทย จำกัด"}
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  เลขทะเบียนนิติบุคคล: {policyData?.registrationNo || "0105569001234"}
                </p>

                <div className="mt-3 grid gap-1.5 border-t border-emerald-200/60 pt-2.5 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-950">เจ้าหน้าที่คุ้มครองข้อมูล (DPO):</span>
                    <span>{policyData?.dpo?.name || "ดร.วิชาญ วิจัยพืชสวน"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-emerald-700" />
                    <a href={`mailto:${policyData?.dpo?.email}`} className="text-emerald-700 underline font-mono">
                      {policyData?.dpo?.email || "dpo@watermelon-ai.org"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{policyData?.dpo?.phone || "+66 2 999 8888"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{policyData?.dpo?.address || "อาคารวิจัยนวัตกรรมเกษตรอัจฉริยะ ชั้น 4 สุพรรณบุรี"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Bases */}
          <div>
            <h4 className="mb-2 font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-700" />
              ฐานทางกฎหมายในการประมวลผลข้อมูล
            </h4>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-700">1. การวิเคราะห์เสียงเคาะและความสุกของแตงโม</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                  ฐานความยินยอม (ม.19)
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-2">
                <span className="text-slate-700">2. บันทึกผลตรวจวัดและใบรับรองคุณภาพแตงโม</span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 shrink-0">
                  ฐานสัญญา & ประโยชน์ชอบธรรม
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-700">3. การวิจัยและพัฒนาแบบจำลอง AI น้องแตงโม (แบบนิรนาม)</span>
                <span className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 shrink-0">
                  ความยินยอมโดยชัดแจ้ง
                </span>
              </div>
            </div>
          </div>

          {/* AI Model Training Consent Toggle */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">การอนุญาตให้นำเสียงเคาะไปพัฒนาโมเดล AI</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  เสียงเคาะของคุณจะถูกตัดข้อมูลระบุตัวตน (Anonymized) ก่อนนำไปสอน AI ให้ฉลาดขึ้น
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={allowTraining}
                  onChange={(e) => updateConsent({ allowTraining: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-white after:bg-white after:transition-all"></div>
              </label>
            </div>
          </div>

          {/* Data Subject Rights Action Buttons */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-700" />
              การใช้สิทธิของเจ้าของข้อมูลส่วนบุคคล (Data Subject Rights)
            </h4>

            {/* Right to Data Portability */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  สิทธิในการขอรับหรือโอนย้ายข้อมูล (Right to Data Portability - ม.31)
                </p>
                <p className="text-xs text-slate-600">ดาวน์โหลดข้อมูลส่วนบุคคล ประวัติการเคาะ และบันทึกผลผ่าจริงทั้งหมดเป็น JSON</p>
              </div>
              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
                {exportSuccess ? "ดาวน์โหลดแล้ว" : "ส่งออกข้อมูล"}
              </button>
            </div>

            {/* Right to Erasure / Right to be Forgotten */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-rose-950 text-xs sm:text-sm">
                    สิทธิในการขอลบหรือทำลายข้อมูล (Right to Erasure / Right to be Forgotten - ม.33)
                  </p>
                  <p className="text-xs text-rose-800">
                    ลบประวัติการแชท ไฟล์เสียงเคาะ และข้อมูลบัญชีทั้งหมดของคุณอย่างถาวร
                  </p>
                </div>
                {!deleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ขอลบข้อมูล
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={handleForgetMe}
                      disabled={loading}
                      className="flex items-center gap-1 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-800"
                    >
                      {loading ? "กำลังลบ..." : "ยืนยันลบทั้งหมด"}
                    </button>
                  </div>
                )}
              </div>

              {deleteSuccess && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-100 p-2 text-xs font-semibold text-rose-900">
                  <Check className="h-4 w-4" />
                  ลบข้อมูลส่วนบุคคลและประวัติทั้งหมดตามสิทธิ์ PDPA สำเร็จแล้ว
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
