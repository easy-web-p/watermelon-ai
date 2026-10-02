import { useEffect, useState } from "react";
import { ArrowLeft, Folder, FolderPlus, MessageSquare, Plus } from "lucide-react";
import { createFolder, getFolders } from "@/lib/api";
import { FolderItem } from "@/types/chat";

interface FoldersViewProps {
  onNavigate: (route: string) => void;
}

export function FoldersView({ onNavigate }: FoldersViewProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#16A34A");

  useEffect(() => {
    getFolders().then(setFolders);
  }, []);

  async function handleAddFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newF = await createFolder(name, color);
    setFolders([newF, ...folders]);
    setName("");
    setShowAddModal(false);
  }

  const colors = ["#16A34A", "#E11D48", "#D97706", "#2563EB", "#7C3AED", "#059669"];

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
            <FolderPlus size={16} />
            <span>สร้างโฟลเดอร์ใหม่</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-green-950 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-200 text-emerald-900">
              <Folder size={20} />
            </span>
            <span>โฟลเดอร์จัดเก็บแชท (Folders)</span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            จัดหมวดหมู่ประวัติการวิเคราะห์แตงโมตามแปลงปลูก รอบเก็บเกี่ยว หรือเกรดคุณภาพ
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {folders.map((f) => (
            <article
              key={f.id}
              className="rounded-3xl border border-lime-200 bg-white p-5 shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-2xs"
                  style={{ backgroundColor: f.color }}
                >
                  <Folder size={24} />
                </div>
                <span className="text-xs text-gray-400 font-mono">
                  สร้างเมื่อ {f.createdAt}
                </span>
              </div>

              <h3 className="font-bold text-base text-green-950 mt-4">{f.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                รวมบทสนทนา {f.conversationCount} ห้อง
              </p>

              <button
                onClick={() => onNavigate("/chat")}
                className="mt-4 w-full rounded-xl border border-lime-200 bg-lime-50/50 py-2 text-xs font-semibold text-green-900 hover:bg-lime-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={13} />
                <span>เปิดดูแชทในโฟลเดอร์นี้</span>
              </button>
            </article>
          ))}
        </div>

        {/* Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-lime-100">
              <h2 className="text-lg font-bold text-green-950">สร้างโฟลเดอร์ใหม่</h2>
              <form onSubmit={handleAddFolder} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่อโฟลเดอร์
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น แปลงทดลองสุพรรณบุรี รอบ 2"
                    className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-green-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    สีประจำโฟลเดอร์
                  </label>
                  <div className="flex gap-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          color === c ? "ring-2 ring-offset-2 ring-green-600 scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    สร้าง
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
