import { SearchX, ArrowLeft } from "lucide-react";

interface Props {
  onNavigate: (route: string) => void;
}

export function NotFoundView({ onNavigate }: Props) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FFFBEF] p-6 text-gray-900">
      <section className="max-w-lg text-center bg-white p-8 sm:p-10 rounded-3xl border border-pink-200 shadow-md">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-[36px] bg-pink-100 text-6xl shadow-inner">
          🍉
        </div>

        <p className="mt-6 text-sm font-black tracking-wider uppercase text-pink-600">
          ERROR 404 • NOT FOUND
        </p>

        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-green-950">
          กลิ้งหาแล้ว แต่ไม่เจอหน้านี้
        </h1>

        <p className="mt-3 leading-relaxed text-sm text-gray-600">
          หน้านี้อาจถูกย้าย ถูกลบ หรือคุณอาจไม่มีสิทธิ์เข้าถึง (เพื่อความปลอดภัย
          ระบบจึงไม่เปิดเผยว่าข้อมูลนี้มีอยู่จริงหรือไม่)
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("/chat")}
            className="rounded-2xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800 transition-colors shadow-xs cursor-pointer"
          >
            กลับไปหน้าแชท
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/help")}
            className="flex items-center gap-2 rounded-2xl border border-green-700 bg-white px-5 py-3 text-sm font-semibold text-green-800 hover:bg-green-50 transition-colors cursor-pointer"
          >
            <SearchX size={17} />
            <span>แจ้งปัญหา</span>
          </button>
        </div>
      </section>
    </main>
  );
}
