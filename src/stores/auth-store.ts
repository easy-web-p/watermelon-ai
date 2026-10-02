import { create } from "zustand";
import { UserRole, ROLE_PERMISSIONS } from "@/lib/route-permissions";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  organization?: string;
}

export const PRESET_USERS: Record<UserRole, AuthUser> = {
  guest: {
    id: "guest",
    name: "ผู้เยี่ยมชม (Guest)",
    email: "guest@example.com",
    role: "guest",
    avatar: "👤",
  },
  user: {
    id: "usr-somchai-01",
    name: "คุณสมชาย เกษตรกรแตงโม",
    email: "somchai@farmsuphan.com",
    role: "user",
    avatar: "👨‍🌾",
    organization: "แปลงปลูกสุพรรณบุรี",
  },
  researcher: {
    id: "usr-dr-wichan-02",
    name: "ดร.วิชาญ วิจัยพืชสวน",
    email: "dr.wichan@horticulture.ac.th",
    role: "researcher",
    avatar: "🔬",
    organization: "สถาบันวิจัยพืชสวนแตงไทย",
  },
  support: {
    id: "usr-support-03",
    name: "เจ้าหน้าที่แตงโมแคร์ Support",
    email: "support@watermelon-ai.org",
    role: "support",
    avatar: "🎧",
    organization: "ศูนย์ช่วยเหลือผู้ใช้งาน",
  },
  admin: {
    id: "usr-admin-04",
    name: "ผู้ดูแลระบบกลาง (System Admin)",
    email: "admin@watermelon-ai.org",
    role: "admin",
    avatar: "🛡️",
    organization: "ทีมวิศวกรรมระบบ",
  },
  super_admin: {
    id: "usr-superadmin-05",
    name: "Super Administrator (สิทธิ์สูงสุด)",
    email: "root@watermelon-ai.org",
    role: "super_admin",
    avatar: "👑",
    organization: "คณะกรรมการความมั่นคงปลอดภัย",
  },
};

interface AuthState {
  currentUser: AuthUser;
  isAuthenticated: boolean;
  switchRole: (role: UserRole) => void;
  login: (role?: UserRole) => void;
  logout: () => void;
  getPermissions: () => readonly string[];
}

const STORAGE_KEY = "watermelon-ai-auth-role";

function getInitialRole(): UserRole {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY) as UserRole | null;
    if (saved && PRESET_USERS[saved]) {
      return saved;
    }
  }
  return "user"; // Default to logged in as regular user for rich out-of-the-box demo
}

const initialRole = getInitialRole();

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: PRESET_USERS[initialRole],
  isAuthenticated: initialRole !== "guest",

  switchRole: (role: UserRole) => {
    const user = PRESET_USERS[role];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, role);
    }
    set({
      currentUser: user,
      isAuthenticated: role !== "guest",
    });
  },

  login: (role = "user") => {
    get().switchRole(role);
  },

  logout: () => {
    get().switchRole("guest");
  },

  getPermissions: () => {
    const role = get().currentUser.role;
    return ROLE_PERMISSIONS[role] || [];
  },
}));
