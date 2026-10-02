import { useState } from "react";
import { AlertCircle, CheckCircle2, Flag, X } from "lucide-react";
import { reportMessage } from "@/lib/api";

interface ReportDialogProps {
  messageId: string;
  onClose: () => void;
}

export function ReportDialog({ messageId, onClose }: ReportDialogProps) {
  const [category, setCategory] = useState("ผลวิเคราะห์ความสุกผิดพลาด");
  const [detail, setDetail] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = [
    "ผลวิเคราะห์ความสุกผิดพลาด (เช่น บอกว่าสุกแต่ผ่าจริงยังอ่อน)",
    "ข้อมูลสายพันธุ์หรือลักษณะแตงโมไม่ตรงตามความจริง",
    "ถอดเสียงเคาะหรือเสียงพูดผิดพลาด",
    "พบข้อมูลระบุตัวตนหรือความเป็นส่วนตัว",
    "คำแนะนำไม่ปลอดภัยหรือไม่เหมาะสม",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.trim()) return;

    setIsSubmitting(true);
    try {
      await reportMessage({
        messageId,
        category,
        detail,
        expectedAnswer,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-3xl border border-lime-100 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-green-900 font-bold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-red-100 text-red-600">
              <Flag size={18} />
            </span>
            <h2 id="report-dialog-title">รายงานข้อมูลผิดพลาด</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-green-950">
              ส่งรายงานเรียบร้อยแล้ว
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ทีมผู้เชี่ยวชาญจะนำข้อมูลไปตรวจสอบก่อนพิจารณาปรับปรุงชุดข้อมูลต่อไป
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                รายงานนี้ช่วยคัดกรองข้อมูลไม่ถูกต้องออกจากโมเดล AI (ระบบจะไม่นำข้อความที่ถูกร้องเรียนไปฝึกโมเดลจนกว่าจะมีผู้เชี่ยวชาญรับรอง)
              </span>
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                ประเภทปัญหา
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-2.5 text-sm text-gray-800 outline-none focus:border-green-600 focus:bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                รายละเอียดสิ่งที่ผิดพลาด <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="ระบุข้อผิดพลาด เช่น ผ่าแตงโมออกมาแล้วพบว่าเนื้อยังซีดขาว หรือเสียงเคาะไม่ตรงกับที่ระบุ..."
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 outline-none focus:border-green-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                คำตอบหรือข้อเท็จจริงที่ถูกต้อง (ถ้าทราบ)
              </label>
              <textarea
                rows={2}
                value={expectedAnswer}
                onChange={(e) => setExpectedAnswer(e.target.value)}
                placeholder="เช่น แตงโมลูกนี้เป็นพันธุ์ตอร์ปิโด หรือความหวานวัดจริงได้ 10 °Brix..."
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm text-gray-800 outline-none focus:border-green-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !detail.trim()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "กำลังส่ง..." : "ส่งรายงาน"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
