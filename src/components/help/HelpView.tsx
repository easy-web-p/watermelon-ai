import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Send,
} from "lucide-react";
import { SupportTicket } from "@/types/chat";

interface HelpViewProps {
  onNavigate: (route: string) => void;
}

export function HelpView({ onNavigate }: HelpViewProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicket["category"]>("วิเคราะห์ไม่แม่นยำ");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "tic-101",
      subject: "แตงโมพันธุ์กินรีเคาะแล้วผลออกเป็นอ่อน แต่ผ่าจริงสุกหวานมาก",
      category: "วิเคราะห์ไม่แม่นยำ",
      description: "เคาะ 4 ครั้งในห้องเปิดโล่ง อาจมีเสียงลมพัด",
      status: "investigating",
      createdAt: "2026-03-28",
    },
  ]);

  function handleSubmitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    const newTicket: SupportTicket = {
      id: "tic-" + Date.now(),
      subject,
      category,
      description,
      status: "open",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTickets([newTicket, ...tickets]);
    setSubmitted(true);
    setSubject("");
    setDescription("");
    setTimeout(() => setSubmitted(false), 4000);
  }

  const faqs = [
    {
      q: "ควรเคาะแตงโมอย่างไรให้ผลลัพธ์แม่นยำที่สุด?",
      a: "ใช้นิ้วชี้หรือข้อนิ้วเคาะบริเวณกึ่งกลางผล 3–5 ครั้ง โดยจ่อไมโครโฟนโทรศัพท์ห่างจากผิวแตงประมาณ 5–10 เซนติเมตร และบันทึกเสียงในสภาพแวดล้อมที่เงียบสงบ",
    },
    {
      q: "ทำไมระบบถึงไม่นำข้อมูลเสียงของฉันไปเทรนโมเดลอัตโนมัติ?",
      a: "เพื่อเคารพสิทธิความเป็นส่วนตัวตามกฎหมาย PDPA ระบบจะนำข้อมูลไปปรับปรุงโมเดลต่อเมื่อผู้ใช้กดยินยอมแบบ Opt-in ในหน้าตั้งค่าเท่านั้น และทุกข้อมูลจะถูกลบอัตลักษณ์บุคคลก่อนเสมอ",
    },
    {
      q: "ค่าความหวาน Brix ที่ AI ประเมินวัดจากอะไร?",
      a: "ประเมินจากความถี่เรโซแนนซ์ธรรมชาติ (Resonance Frequency) ร่วมกับอัตราการสลายตัวของแรงสั่นสะเทือน (Acoustic Damping Rate) ซึ่งสัมพันธ์กับความหนาแน่นของเซลล์เนื้อและปริมาณน้ำตาลสะสม",
    },
  ];

  return (
    <main className="min-h-screen bg-[#FFFBEF] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate("/chat")}
            className="flex items-center gap-2 text-sm font-semibold text-green-900 hover:text-green-700 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>กลับสู่หน้าแชท</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-200 text-amber-900">
              <LifeBuoy size={20} />
            </span>
            <span>ศูนย์ช่วยเหลือและรายงานปัญหา (Help & Support)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            แจ้งปัญหาการวิเคราะห์เสียงเคาะ ข้อผิดพลาดของระบบ หรือขอความช่วยเหลือจากทีมงาน
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* FAQ Section */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-green-950 flex items-center gap-2">
              <HelpCircle size={18} className="text-green-700" />
              <span>คำถามที่พบบ่อย (FAQ)</span>
            </h2>

            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-lime-200 bg-white p-4 shadow-2xs open:border-green-600 transition-all"
                >
                  <summary className="font-semibold text-xs sm:text-sm text-green-950 cursor-pointer list-none flex justify-between items-center">
                    <span>{f.q}</span>
                    <span className="text-green-700 font-bold ml-2 group-open:rotate-90 transition-transform">
                      ›
                    </span>
                  </summary>
                  <p className="mt-2.5 text-xs text-gray-600 leading-relaxed border-t border-lime-100 pt-2.5">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Ticket Form */}
          <section className="rounded-3xl border border-lime-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-green-950 mb-1 flex items-center gap-2">
              <MessageCircle size={18} className="text-green-700" />
              <span>ส่งคำร้องเรียนหรือแจ้งข้อผิดพลาด</span>
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              ทีมผู้เชี่ยวชาญจะทำการตรวจสอบและนำไปปรับปรุงระบบอย่างต่อเนื่อง
            </p>

            {submitted && (
              <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>ส่งคำร้องเรียบร้อยแล้ว ทีมงานจะดำเนินการตรวจสอบให้เร็วที่สุด</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  หัวข้อเรื่อง
                </label>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="เช่น เสียงเคาะไม่ชัด หรือประเมินความสุกผิดพลาด"
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs sm:text-sm outline-none focus:border-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ประเภทปัญหา
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupportTicket["category"])}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs sm:text-sm outline-none focus:border-green-600"
                >
                  <option value="วิเคราะห์ไม่แม่นยำ">วิเคราะห์ไม่แม่นยำ (Acoustic Inaccuracy)</option>
                  <option value="ระบบผิดพลาด">ระบบหรือไมโครโฟนผิดพลาด (Bug)</option>
                  <option value="ความเป็นส่วนตัว">ความเป็นส่วนตัวและสิทธิ PDPA</option>
                  <option value="ข้อเสนอแนะ">ข้อเสนอแนะเพื่อการพัฒนา</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="กรุณาระบุรายละเอียด เช่น พันธุ์แตงโม ผลจริงหลังผ่า..."
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-xs sm:text-sm outline-none focus:border-green-600"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-green-700 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-green-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Send size={15} />
                <span>ส่งคำร้อง</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
