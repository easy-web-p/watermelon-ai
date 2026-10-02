import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, FileText, Lock, Plus, ShieldCheck, Upload } from "lucide-react";
import { createKnowledge, getKnowledge } from "@/lib/api";
import { KnowledgeDocument } from "@/types/chat";

interface KnowledgeViewProps {
  onNavigate: (route: string) => void;
}

export function KnowledgeView({ onNavigate }: KnowledgeViewProps) {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("วิชาการ & วิจัย");
  const [scope, setScope] = useState<KnowledgeDocument["scope"]>("public");

  useEffect(() => {
    getKnowledge().then(setDocs);
  }, []);

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newD = await createKnowledge({
      title,
      description,
      category,
      scope,
      chunkCount: 18,
      fileSize: "1.2 MB",
    });

    setDocs([newD, ...docs]);
    setTitle("");
    setDescription("");
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
            <Upload size={16} />
            <span>อัปโหลดเอกสารเข้าคลัง</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-200 text-blue-900">
              <BookOpen size={20} />
            </span>
            <span>คลังความรู้แตงโม (Knowledge Base / RAG)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            เอกสารวิจัยทางวิชาการ มาตรฐานการเกษตร และคู่มือคลื่นเสียงเรโซแนนซ์ที่ AI นำมาใช้อ้างอิงในการตอบคำถาม
          </p>
        </div>

        <div className="space-y-4">
          {docs.map((doc) => (
            <article
              key={doc.id}
              className="rounded-3xl border border-lime-200 bg-white p-5 sm:p-6 shadow-xs hover:border-lime-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 flex-1">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {doc.category}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      ขอบเขต: {doc.scope === "public" ? "สาธารณะ" : "เฉพาะทีม"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-green-950 mt-1">{doc.title}</h3>
                  <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                    {doc.description}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 text-right shrink-0">
                <span className="text-xs text-gray-500 font-mono">
                  {doc.chunkCount} Chunks · {doc.fileSize}
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                  กำลังใช้งานในระบบ RAG
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-lime-100">
              <h2 className="text-lg font-bold text-green-950">อัปโหลดเอกสารเข้าคลังความรู้</h2>
              <form onSubmit={handleAddDoc} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่อเอกสาร
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น คู่มือวิเคราะห์เสียงเคาะแตงโม มหาวิทยาลัยเกษตรศาสตร์"
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    คำอธิบายโดยย่อ
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ระบุสาระสำคัญ เช่น เกณฑ์ความหวาน Brix และกราฟคลื่นเสียง..."
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ขอบเขตการเข้าถึง (Access Scope)
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as KnowledgeDocument["scope"])}
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  >
                    <option value="public">สาธารณะ (เปิดให้ผู้ใช้ทุกคน)</option>
                    <option value="team">เฉพาะทีมวิจัย (Team only)</option>
                    <option value="private">ส่วนตัว (Private)</option>
                  </select>
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
                    บันทึกเข้าคลัง
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
