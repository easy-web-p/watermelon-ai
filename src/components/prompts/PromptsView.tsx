import { useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, Plus, Sparkles, Tag } from "lucide-react";
import { createPrompt, getPrompts } from "@/lib/api";
import { PromptTemplate } from "@/types/chat";

interface PromptsViewProps {
  onNavigate: (route: string) => void;
  onUsePrompt: (text: string) => void;
}

export function PromptsView({ onNavigate, onUsePrompt }: PromptsViewProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PromptTemplate["category"]>("วิเคราะห์เสียง");

  useEffect(() => {
    getPrompts().then(setPrompts);
  }, []);

  async function handleAddPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newP = await createPrompt({
      title,
      content,
      category,
      isShared: true,
    });
    setPrompts([newP, ...prompts]);
    setTitle("");
    setContent("");
    setShowAddModal(false);
  }

  return (
    <main className="min-h-screen bg-[#FFFBEF] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => onNavigate("/chat")}
            className="flex items-center gap-2 text-sm font-semibold text-green-900 hover:text-green-700 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>กลับสู่หน้าแชท</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-green-800 transition-colors"
          >
            <Plus size={16} />
            <span>สร้างชุดคำสั่งใหม่</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-200 text-amber-900">
              <Sparkles size={20} />
            </span>
            <span>ชุดคำสั่งที่บันทึกไว้ (Prompt Templates)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            เทมเพลตคำสั่งมาตรฐานสำหรับการวิเคราะห์เสียงเคาะ ตรวจดูลักษณะผิว และสูตรการคำนวณความหวาน
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {prompts.map((p) => (
            <article
              key={p.id}
              className="rounded-3xl border border-lime-200 bg-white p-5 shadow-xs hover:border-lime-400 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-green-800 bg-lime-100 px-2.5 py-0.5 rounded-full">
                    {p.category}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                    ใช้ไป {p.usageCount} ครั้ง
                  </span>
                </div>

                <h3 className="font-bold text-base text-green-950 mt-3">{p.title}</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed bg-lime-50/50 p-3 rounded-2xl border border-lime-100/60">
                  "{p.content}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-lime-100 flex justify-end">
                <button
                  onClick={() => {
                    onUsePrompt(p.content);
                    onNavigate("/chat");
                  }}
                  className="rounded-xl bg-green-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-green-800 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare size={13} />
                  <span>นำไปใช้ในแชท</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-lime-100">
              <h2 className="text-lg font-bold text-green-950">สร้างชุดคำสั่งใหม่</h2>
              <form onSubmit={handleAddPrompt} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่อชุดคำสั่ง
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ตรวจสอบความสุกแตงโมพันธุ์กินรี"
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PromptTemplate["category"])}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  >
                    <option value="วิเคราะห์เสียง">วิเคราะห์เสียง</option>
                    <option value="ดูลักษณะภายนอก">ดูลักษณะภายนอก</option>
                    <option value="พันธุ์แตงโม">พันธุ์แตงโม</option>
                    <option value="การเก็บเกี่ยวและรักษา">การเก็บเกี่ยวและรักษา</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    เนื้อหาคำสั่ง
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="พิมพ์ชุดคำสั่งที่ต้องการส่งให้ AI..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-700 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    บันทึกชุดคำสั่ง
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
