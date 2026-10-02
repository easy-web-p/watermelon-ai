import { ShieldAlert, ArrowLeft, HelpCircle, Users, RefreshCw } from "lucide-react";
import { useAuthStore, PRESET_USERS } from "@/stores/auth-store";
import { UserRole } from "@/lib/route-permissions";

interface Props {
  onNavigate: (route: string) => void;
}

export function ForbiddenView({ onNavigate }: Props) {
  const { currentUser, switchRole } = useAuthStore();

  return (
    <main className="grid min-h-screen place-items-center bg-[#FFFBEF] p-6 text-gray-900">
      <section className="max-w-lg text-center bg-white p-8 sm:p-10 rounded-3xl border border-orange-200 shadow-md">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-orange-50 border border-orange-200">
          <ShieldAlert size={56} className="text-orange-500" />
        </div>

        <p className="mt-5 text-sm font-black uppercase tracking-wider text-orange-600">
          ERROR 403 • FORBIDDEN
        </p>

        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-green-950">
          ตะกร้านี้ยังไม่เปิดให้คุณนะ
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          บัญชีปัจจุบันของคุณคือ{" "}
          <strong className="text-gray-900 font-bold">
            {currentUser.name} (บทบาท: {currentUser.role})
          </strong>{" "}
          ซึ่งไม่มีสิทธิ์ (RBAC Permission) เข้าถึงหน้านี้
          หากคิดว่าเป็นข้อผิดพลาด สามารถติดต่อผู้ดูแลระบบได้
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate("/chat")}
            className="rounded-2xl bg-green-700 px-5 py-3 text-sm font-bold text-white shadow-xs hover:bg-green-800 transition-colors cursor-pointer"
          >
            กลับหน้าแชท
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/help")}
            className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            ติดต่อผู้ดูแล
          </button>
        </div>

        {/* Quick Role Switcher for Testing & Demonstration */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-left">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 text-center">
            สลับบทบาทเพื่อทดสอบสิทธิ์ (RBAC Role Switcher):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(Object.keys(PRESET_USERS) as UserRole[]).map((r) => {
              const u = PRESET_USERS[r];
              const isCurrent = currentUser.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRole(r)}
                  className={`rounded-xl p-2 text-xs font-semibold text-left transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? "bg-green-800 text-white font-bold"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>{u.avatar}</span>
                  <span className="truncate">{r}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
