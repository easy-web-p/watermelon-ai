import {
  BookOpen,
  Compass,
  FlaskConical,
  Folder,
  HelpCircle,
  LayoutDashboard,
  MessageCirclePlus,
  Pin,
  PinOff,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { Conversation } from "@/types/chat";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { RoleBadgeSelector } from "@/components/auth/RoleBadgeSelector";
import { hasPermission } from "@/lib/route-permissions";

interface Props {
  conversations: Conversation[];
  onNewChat: () => void;
  onSearch: (value: string) => void;
  onNavigate: (route: string) => void;
  currentRoute: string;
}

export function ChatSidebar({
  conversations,
  onNewChat,
  onSearch,
  onNavigate,
  currentRoute,
}: Props) {
  const {
    sidebarOpen,
    setSidebarOpen,
    currentConversationId,
    setCurrentConversation,
    deleteConversation,
    togglePinConversation,
  } = useChatStore();

  const { currentUser } = useAuthStore();
  const isAdminOrSuper = currentUser.role === "admin" || currentUser.role === "super_admin";
  const isGuest = currentUser.role === "guest";

  const pinned = conversations.filter((c) => c.isPinned);
  const others = conversations.filter((c) => !c.isPinned);

  function handleSelectConversation(id: string) {
    setCurrentConversation(id);
    onNavigate(`/chat/${id}`);
    setSidebarOpen(false);
  }

  function handleNav(route: string) {
    onNavigate(route);
    setSidebarOpen(false);
  }

  return (
    <>
      {/* Backdrop overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-lime-200 bg-[#FFFBEF] transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0 shadow-lg lg:shadow-none flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-full flex-col p-4">
          {/* Brand header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => handleNav("/")}
              className="flex items-center gap-2.5 text-left font-bold text-green-950 hover:opacity-90 transition-opacity"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-xl shadow-xs">
                🍉
              </span>
              <div>
                <span className="block text-base tracking-tight leading-tight">
                  แตงโม AI
                </span>
                <span className="block text-[11px] font-normal text-green-700">
                  Acoustic Fruit Ripeness
                </span>
              </div>
            </button>

            <button
              type="button"
              className="rounded-xl p-2 text-gray-500 hover:bg-lime-100 lg:hidden transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="ปิดเมนู"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Role & Ownership Identity Selector */}
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/90 border border-lime-200 p-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <span className="text-xl">{currentUser.avatar}</span>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-gray-900 truncate">
                  {currentUser.name}
                </span>
                <span className="block text-[10px] text-gray-500 font-mono">
                  สิทธิ์: <strong className="text-green-800 uppercase">{currentUser.role}</strong>
                </span>
              </div>
            </div>
            <RoleBadgeSelector onNavigate={handleNav} />
          </div>

          {isGuest && (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-900 leading-tight">
              <span>💡 โหมด Guest: แชทของคุณจะไม่ถูกบันทึกในบัญชีถาวร</span>
            </div>
          )}

          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              onNewChat();
              setSidebarOpen(false);
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 py-3 font-semibold text-white shadow-xs hover:bg-green-800 transition-colors"
          >
            <MessageCirclePlus size={19} />
            <span>แชทใหม่</span>
          </button>

          {/* Search Box */}
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-lime-200 bg-white px-3 py-1 shadow-2xs focus-within:border-green-600">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              className="w-full bg-transparent py-1.5 text-xs text-gray-800 outline-none placeholder:text-gray-400"
              placeholder="ค้นหาประวัติการคุย..."
              onChange={(event) => onSearch(event.target.value)}
            />
          </label>

          {/* Core Feature Links */}
          <nav className="mt-3 space-y-1 text-sm border-b border-lime-200/70 pb-3">
            <SidebarButton
              active={currentRoute === "/disease"}
              onClick={() => handleNav("/disease")}
              icon={<ShieldAlert size={17} className="text-rose-600" />}
              label="AI ตรวจโรคพืชแตงโม 🌿"
            />
            <SidebarButton
              active={currentRoute === "/simulator"}
              onClick={() => handleNav("/simulator")}
              icon={<Waves size={17} className="text-cyan-600" />}
              label="จำลองเคาะแตงโม (Simulator)"
            />
            <SidebarButton
              active={currentRoute === "/lab"}
              onClick={() => handleNav("/lab")}
              icon={<FlaskConical size={17} className="text-pink-600" />}
              label="แล็บตรวจผลผ่าแตงโม"
            />
            <SidebarButton
              active={currentRoute === "/varieties"}
              onClick={() => handleNav("/varieties")}
              icon={<Compass size={17} className="text-lime-700" />}
              label="สารานุกรมสายพันธุ์"
            />
            <SidebarButton
              active={currentRoute === "/prompts"}
              onClick={() => handleNav("/prompts")}
              icon={<Sparkles size={17} className="text-amber-600" />}
              label="ชุดคำสั่งที่บันทึกไว้"
            />
            <SidebarButton
              active={currentRoute === "/folders"}
              onClick={() => handleNav("/folders")}
              icon={<Folder size={17} className="text-emerald-600" />}
              label="โฟลเดอร์จัดเก็บ"
            />
            <SidebarButton
              active={currentRoute === "/knowledge"}
              onClick={() => handleNav("/knowledge")}
              icon={<BookOpen size={17} className="text-blue-600" />}
              label="คลังความรู้แตงโม"
            />
          </nav>

          {/* Conversations List with Scroll */}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {pinned.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-green-800/80">
                  ปักหมุดไว้
                </p>
                <div className="space-y-1">
                  {pinned.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={currentConversationId === conversation.id}
                      onSelect={() => handleSelectConversation(conversation.id)}
                      onTogglePin={() => togglePinConversation(conversation.id)}
                      onDelete={() => deleteConversation(conversation.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                ประวัติแชทล่าสุด
              </p>
              {others.length === 0 && pinned.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-gray-400">
                  ยังไม่มีประวัติการแชท
                </p>
              ) : (
                <div className="space-y-1">
                  {others.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={currentConversationId === conversation.id}
                      onSelect={() => handleSelectConversation(conversation.id)}
                      onTogglePin={() => togglePinConversation(conversation.id)}
                      onDelete={() => deleteConversation(conversation.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Management & Privacy Links */}
          <nav className="mt-3 space-y-0.5 border-t border-lime-200 pt-3 text-sm">
            <SidebarButton
              active={currentRoute === "/help"}
              onClick={() => handleNav("/help")}
              icon={<HelpCircle size={17} className="text-gray-500" />}
              label="ช่วยเหลือ & ร้องเรียน"
            />
            <SidebarButton
              active={currentRoute === "/settings"}
              onClick={() => handleNav("/settings")}
              icon={<Settings size={17} className="text-gray-500" />}
              label="การตั้งค่า & ความเป็นส่วนตัว"
            />
            {isAdminOrSuper && (
              <SidebarButton
                active={currentRoute === "/admin"}
                onClick={() => handleNav("/admin")}
                icon={<LayoutDashboard size={17} className="text-purple-600" />}
                label="Admin Dashboard"
              />
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer ${
        active
          ? "bg-lime-200/90 text-green-950 font-semibold"
          : "text-gray-700 hover:bg-lime-100/70"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer ${
        isActive
          ? "bg-lime-200/90 text-green-950 font-semibold shadow-2xs"
          : "text-gray-700 hover:bg-lime-100/70"
      }`}
      onClick={onSelect}
    >
      <span className="truncate flex-1 pr-1">{conversation.title}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className="rounded-lg p-1 text-gray-500 hover:bg-black/10 hover:text-green-800"
          title={conversation.isPinned ? "ยกเลิกปักหมุด" : "ปักหมุดแชท"}
        >
          {conversation.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแชทนี้?")) {
              onDelete();
            }
          }}
          className="rounded-lg p-1 text-gray-500 hover:bg-red-100 hover:text-red-700"
          title="ลบแชท"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
