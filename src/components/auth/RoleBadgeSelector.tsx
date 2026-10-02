import { useState } from "react";
import { Shield, ChevronDown, User, LogOut, Check, Key } from "lucide-react";
import { useAuthStore, PRESET_USERS } from "@/stores/auth-store";
import { UserRole } from "@/lib/route-permissions";
import { AuthModal } from "@/components/auth/AuthModal";

interface Props {
  onNavigate?: (route: string) => void;
}

export function RoleBadgeSelector({ onNavigate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { currentUser, switchRole, logout } = useAuthStore();

  const roleColors: Record<UserRole, string> = {
    guest: "bg-gray-100 text-gray-700 border-gray-300",
    user: "bg-emerald-100 text-emerald-900 border-emerald-300",
    researcher: "bg-blue-100 text-blue-900 border-blue-300",
    support: "bg-purple-100 text-purple-900 border-purple-300",
    admin: "bg-amber-100 text-amber-900 border-amber-300",
    super_admin: "bg-rose-100 text-rose-900 border-rose-300",
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
          roleColors[currentUser.role]
        }`}
        title="คลิกเพื่อสลับบทบาท RBAC"
      >
        <span>{currentUser.avatar}</span>
        <span className="font-mono uppercase">{currentUser.role}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-3xl border border-gray-200 bg-white p-3 shadow-xl z-50 animate-in fade-in">
          <div className="border-b border-gray-100 pb-2 mb-2 px-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              ระบบจัดการสิทธิ์ (RBAC + Ownership)
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl">{currentUser.avatar}</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-gray-900 truncate">
                  {currentUser.name}
                </strong>
                <span className="text-[11px] text-gray-500 font-mono block truncate">
                  {currentUser.email}
                </span>
              </div>
            </div>
          </div>

          {/* Role Choice List */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 px-1 block mb-1">
              เลือกบทบาทเพื่อทดสอบสิทธิ์:
            </span>
            {(Object.keys(PRESET_USERS) as UserRole[]).map((r) => {
              const u = PRESET_USERS[r];
              const isSelected = currentUser.role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    switchRole(r);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-green-700 text-white font-bold"
                      : "hover:bg-gray-50 text-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{u.avatar}</span>
                    <div>
                      <span className="font-mono text-[11px] uppercase block">
                        {r}
                      </span>
                      <span
                        className={`text-[10px] truncate block ${
                          isSelected ? "text-green-100" : "text-gray-400"
                        }`}
                      >
                        {u.name}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </div>

          {/* Real Auth / OTP */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setShowAuthModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <Key size={14} />
              <span>เข้าสู่ระบบด้วย OTP / Social 📲</span>
            </button>
          </div>

          {/* Logout / Guest */}
          <div className="mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                logout();
                setIsOpen(false);
                if (onNavigate) onNavigate("/");
              }}
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>ออกจากระบบ (สลับเป็น Guest)</span>
            </button>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
