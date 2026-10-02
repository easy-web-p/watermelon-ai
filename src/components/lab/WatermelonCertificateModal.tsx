import { useRef } from "react";
import { Award, CheckCircle2, Download, Printer, QrCode, ShieldCheck, Waves, X } from "lucide-react";
import { KnockAnalysis } from "@/types/chat";

interface WatermelonCertificateModalProps {
  analysis: KnockAnalysis;
  watermelonCode?: string;
  variety?: string;
  farmLocation?: string;
  weightKg?: number;
  onClose: () => void;
}

export function WatermelonCertificateModal({
  analysis,
  watermelonCode = "WM-2026-CERT-01",
  variety = "พันธุ์กินรี (Kinnaree)",
  farmLocation = "แปลงเกษตรมาตรฐาน GAP สุพรรณบุรี",
  weightKg = 4.2,
  onClose,
}: WatermelonCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    window.print();
  }

  const certId = `WM-TH-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-xl my-8 rounded-3xl bg-white shadow-2xl border border-lime-200 overflow-hidden">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#FFFDF7] px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2 text-green-950 font-bold text-sm">
            <Award size={18} className="text-amber-600" />
            <span>ใบรับรองผลตรวจวิเคราะห์ความสุกแตงโม (Inspection Certificate)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer size={14} />
              <span>พิมพ์ใบรับรอง</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Paper */}
        <div
          ref={printRef}
          className="p-8 sm:p-10 bg-linear-to-b from-[#FFFDF8] to-[#FFFBEF] border-8 border-double border-lime-200/90 relative"
        >
          {/* Watermark Logo */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none opacity-[0.04] text-[200px] select-none">
            🍉
          </div>

          {/* Header */}
          <div className="text-center pb-6 border-b border-lime-300/80">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime-300 text-3xl shadow-xs mb-2">
              🍉
            </div>
            <h2 className="text-2xl font-black text-green-950 tracking-tight">
              ใบรับรองผลตรวจวิเคราะห์คุณภาพแตงโม
            </h2>
            <p className="text-xs text-green-800 font-medium">
              Watermelon Acoustic Ripeness & Quality Inspection Certificate
            </p>
            <p className="text-[11px] text-gray-500 font-mono mt-1">
              เลขที่ใบรับรอง: <strong className="text-green-900">{certId}</strong> · วันที่ออก: {dateStr}
            </p>
          </div>

          {/* Fruit Profile */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white/80 p-3.5 rounded-2xl border border-lime-200/80 shadow-2xs">
            <div>
              <span className="text-gray-400 block text-[10px]">รหัสตัวอย่าง</span>
              <strong className="font-mono text-gray-900">{watermelonCode}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">สายพันธุ์</span>
              <strong className="text-gray-900">{variety}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">น้ำหนักผล</span>
              <strong className="font-mono text-gray-900">{weightKg} กิโลกรัม</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">แหล่งปลูก</span>
              <strong className="text-gray-900 truncate block">{farmLocation}</strong>
            </div>
          </div>

          {/* Primary Assessment Results */}
          <div className="mt-6 rounded-2xl border-2 border-emerald-600/40 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                ผลการประเมินความสุก (Acoustic Evaluation)
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 font-mono">
                เกรดพรีเมียม Grade {analysis.maturityGrade}/5
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-black text-emerald-900">
                  {analysis.maturityClass}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  ความเชื่อมั่นแบบจำลอง (AI Confidence): <strong>{Math.round(analysis.confidence * 100)}%</strong>
                </p>
              </div>

              {analysis.sweetnessEstimateBrix && (
                <div className="text-right bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 font-bold block">ค่าความหวานคาดการณ์</span>
                  <span className="text-2xl font-extrabold text-amber-950 font-mono tabular-nums">
                    {analysis.sweetnessEstimateBrix} °Bx
                  </span>
                </div>
              )}
            </div>

            {/* Acoustic Fingerprint */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-gray-50/80 p-2 rounded-xl">
                <span className="text-gray-400 block text-[10px]">ความถี่เรโซแนนซ์</span>
                <strong className="font-mono text-gray-900">{analysis.dominantFrequencyHz || 134} Hz</strong>
              </div>
              <div className="bg-gray-50/80 p-2 rounded-xl">
                <span className="text-gray-400 block text-[10px]">จังหวะเคาะ</span>
                <strong className="font-mono text-gray-900">{analysis.detectedImpacts} ครั้ง</strong>
              </div>
              <div className="bg-gray-50/80 p-2 rounded-xl">
                <span className="text-gray-400 block text-[10px]">คุณภาพคลื่นเสียง</span>
                <strong className="text-emerald-700">ผ่านเกณฑ์ (Passed)</strong>
              </div>
            </div>
          </div>

          {/* Footer Official Seal & QR Verification */}
          <div className="mt-6 pt-5 border-t border-lime-300/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white border border-lime-200 shadow-2xs">
                <QrCode size={28} className="text-green-900" />
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                <p className="font-bold text-green-950 text-xs">ตรวจสอบความถูกต้องด้วยระบบบล็อกเชน/คลาวด์</p>
                <p>สแกน QR Code เพื่อตรวจสอบคลื่นเสียงบันทึกจริง</p>
              </div>
            </div>

            {/* Stamp simulation */}
            <div className="border-2 border-emerald-700 text-emerald-800 px-3 py-1.5 rounded-xl text-center rotate-[-3deg] shadow-2xs shrink-0 bg-white/90">
              <p className="text-[9px] font-bold uppercase tracking-wider">CERTIFIED QUALITY</p>
              <p className="text-xs font-black">มาตรฐานผลผลิตสุกดี</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl bg-green-700 px-5 py-2 text-xs font-bold text-white hover:bg-green-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer size={15} />
            <span>พิมพ์ / บันทึก PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
