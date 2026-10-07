import { useEffect, useState } from 'react';
import { Logo } from '../brand/Logo';
import { Icon } from '../ui/Icon';
import { Link, useRouter } from '../../lib/router';
import { cn } from '../../lib/cn';
import { PRIMARY_NAV, RECENT_CHATS, SECONDARY_NAV, type NavItem } from '../../data/nav';
import { useDisplayUser, useAuth } from '../../store/auth';
import { useChat } from '../../store/chat';
import { useToast } from '../ui/Toast';
import { verifyConversationOwnership } from '../../lib/chatHistory';

const ICON_TONE = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  tertiary: 'text-tertiary',
} as const;

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-4 py-2.5 transition-all duration-150 ease-tactile',
        active
          ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm'
          : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface',
      )}
    >
      <Icon name={item.icon} size={20} className={active ? 'text-on-primary-container' : ICON_TONE[item.tone]} />
      <span className="text-label-lg">{item.label}</span>
    </Link>
  );
}

function SectionLabel({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2">
      <span className="text-caption font-semibold tracking-wider text-outline uppercase">{children}</span>
      {action}
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { path, query, navigate } = useRouter();
  const user = useDisplayUser();
  const authUser = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const toast = useToast();
  const [filterMineOnly, setFilterMineOnly] = useState(false);

  const conversations = useChat((state) => state.conversations);
  // Without this, a failed load left `conversations` empty and the list
  // below said "ยังไม่มีประวัติการสนทนา" — telling a farmer their history
  // is gone when the real answer is that it could not be fetched.
  const listError = useChat((state) => state.error);
  const listLoading = useChat((state) => state.loading);
  const loadConversations = useChat((state) => state.loadConversations);
  const startNewChat = useChat((state) => state.startNewChat);
  const deleteChat = useChat((state) => state.deleteChat);

  const ownershipList = (conversations ?? []).map((chat) => ({
    chat,
    ownership: verifyConversationOwnership(chat, authUser),
  }));

  const otherChatsCount = ownershipList.filter((item) => !item.ownership.isOwner).length;
  const displayedChats = filterMineOnly
    ? ownershipList.filter((item) => item.ownership.isOwner).map((item) => item.chat)
    : conversations;

  function handleClearOtherChats() {
    const toDelete = ownershipList.filter((item) => !item.ownership.isOwner).map((item) => item.chat);
    if (!toDelete.length) return;
    const confirmed = window.confirm(
      `ยืนยันการล้างประวัติการสนทนาที่ไม่ใช่ของบัญชีนี้จำนวน ${toDelete.length} รายการออกจากเครื่อง?`,
    );
    if (!confirmed) return;
    for (const c of toDelete) {
      void deleteChat(c.id);
    }
    toast.success(`ล้างประวัติอื่นเรียบร้อยแล้ว (${toDelete.length} รายการ)`);
  }

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  function handleSignOut() {
    signOut();
    toast.success('ออกจากระบบเรียบร้อยแล้ว');
    navigate('/');
    onNavigate?.();
  }

  function handleNewChat() {
    const threadId = startNewChat();
    navigate(`/chat?thread=${threadId}`);
    onNavigate?.();
  }

  async function handleDeleteChat(e: React.MouseEvent, chatId: string) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteChat(chatId);
      toast.success('ลบการสนทนาเรียบร้อย');
      if (query.get('thread') === chatId) {
        navigate('/chat');
      }
    } catch (error) {
      // The server's own reason ('ไม่มีสิทธิ์ลบรายการนี้', an offline
      // notice) is more use than a generic retry prompt.
      toast.error(error instanceof Error ? error.message : 'ลบไม่สำเร็จ กรุณาลองใหม่');
    }
  }

  return (
    <div className="flex h-full flex-col justify-between gap-4 overflow-y-auto bg-surface-lowest p-4 no-scrollbar">
      <div className="flex flex-col gap-4">
        <Link to="/chat" className="px-1 py-1" aria-label="Watermelon AI — หน้าแชท">
          <Logo />
        </Link>

        <div className="px-1">
          <button
            type="button"
            onClick={handleNewChat}
            className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-label-lg font-semibold text-on-primary shadow-cta transition-all duration-150 ease-tactile hover:bg-primary-container active:scale-[0.96]"
          >
            <Icon name="add_circle" size={20} className="transition-transform group-hover:rotate-90" />
            เริ่มบทสนทนาใหม่
          </button>
        </div>

        <nav className="flex flex-col gap-2 px-1" aria-label="ระบบหลัก">
          <SectionLabel>ระบบหลัก</SectionLabel>
          <div className="flex flex-col gap-1" onClick={onNavigate}>
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.path} item={item} active={path === item.path} />
            ))}
          </div>
        </nav>

        <nav className="flex flex-col gap-2 px-1" aria-label="เครื่องมือเสริม">
          <SectionLabel>เครื่องมือเสริม</SectionLabel>
          <div className="flex flex-col gap-1" onClick={onNavigate}>
            {SECONDARY_NAV.map((item) => (
              <NavLink key={item.path} item={item} active={path === item.path} />
            ))}
          </div>
        </nav>

        <nav className="flex flex-col gap-2 px-1" aria-label="ประวัติการสนทนาล่าสุด">
          <SectionLabel
            action={
              <div className="flex items-center gap-1.5">
                {otherChatsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearOtherChats}
                    title={`ตรวจพบ ${otherChatsCount} แชทที่ไม่ใช่ของบัญชีคุณ — กดเพื่อลบออกจากเครื่องนี้`}
                    className="flex cursor-pointer items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 transition-colors"
                  >
                    <Icon name="cleaning_services" size={12} />
                    <span>ล้างแชทอื่น ({otherChatsCount})</span>
                  </button>
                )}
                {authUser && (
                  <button
                    type="button"
                    onClick={() => setFilterMineOnly((prev) => !prev)}
                    title={filterMineOnly ? 'กำลังแสดงเฉพาะแชทของคุณ (กดเพื่อแสดงทั้งหมด)' : 'กำลังแสดงทั้งหมด (กดเพื่อกรองเฉพาะของคุณ)'}
                    className={cn(
                      'cursor-pointer rounded p-0.5 transition-colors',
                      filterMineOnly ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary',
                    )}
                  >
                    <Icon name={filterMineOnly ? 'filter_alt' : 'filter_alt_off'} size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void loadConversations()}
                  title="รีเฟรชประวัติ"
                  className="cursor-pointer text-on-surface-variant hover:text-primary transition-colors"
                >
                  <Icon name="refresh" size={14} />
                </button>
              </div>
            }
          >
            ประวัติการสนทนาล่าสุด
          </SectionLabel>
          <div className="flex flex-col gap-0.5">
            {(!conversations || conversations.length === 0) &&
            listError &&
            !listError.includes('ยังไม่เปิดให้บริการ') ? (
              <p className="px-3 py-2 text-caption text-error">
                <Icon name="error" size={13} className="mr-1 inline align-text-bottom" />
                โหลดประวัติไม่สำเร็จ — {listError} กดปุ่มรีเฟรชด้านบนเพื่อลองใหม่
              </p>
            ) : !displayedChats || displayedChats.length === 0 ? (
              <p className="px-3 py-2 text-caption text-outline">
                {listLoading
                  ? 'กำลังโหลดประวัติ...'
                  : filterMineOnly
                    ? 'ยังไม่มีประวัติที่เป็นของบัญชีนี้'
                    : 'ยังไม่มีประวัติการสนทนา'}
              </p>
            ) : (
              displayedChats.slice(0, 10).map((chat) => {
                const isActive = path === '/chat' && query.get('thread') === chat.id;
                const ownership = verifyConversationOwnership(chat, authUser);

                return (
                  <div key={chat.id} className="group relative flex items-center">
                    <Link
                      to={`/chat?thread=${chat.id}`}
                      onClick={onNavigate}
                      className={cn(
                        'flex flex-1 items-center gap-2 rounded-md px-2 py-2 pr-7 text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface',
                        isActive && 'bg-primary-container/60 font-semibold text-on-primary-container',
                      )}
                    >
                      <span className="relative flex shrink-0 items-center justify-center">
                        <Icon name="chat_bubble" size={14} className={isActive ? 'text-primary' : 'text-outline'} />
                        {ownership.isOwner ? (
                          <span
                            className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-secondary"
                            title={`ยืนยันแล้ว: ${ownership.ownerLabel}`}
                          />
                        ) : (
                          <span
                            className="absolute -top-1 -right-1 text-amber-500 font-bold text-[9px]"
                            title={`⚠️ แชทนี้ไม่ใช่ของบัญชีคุณ (${ownership.ownerLabel})`}
                          >
                            !
                          </span>
                        )}
                      </span>
                      <span className="truncate text-body-md">{chat.title || 'วิเคราะห์แตงโม 🍉'}</span>
                      {!ownership.isOwner && (
                        <span className="ml-auto shrink-0 rounded bg-amber-500/15 px-1 py-0.2 text-[10px] font-semibold text-amber-700">
                          {ownership.isGuest ? 'Guest' : 'บัญชีอื่น'}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => void handleDeleteChat(e, chat.id)}
                      title="ลบการสนทนานี้"
                      className="absolute right-1 hidden size-6 cursor-pointer items-center justify-center rounded text-outline hover:bg-error-container/40 hover:text-error group-hover:flex"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </nav>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-surface-low p-2 shadow-[0_2px_8px_rgba(27,107,68,0.04)]">
        <Link
          to={user.role === 'ยังไม่ได้เข้าสู่ระบบ' ? '/signin' : '/settings'}
          className="flex min-w-0 items-center gap-2"
          onClick={onNavigate}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-label-lg font-bold text-on-secondary-fixed-variant">
            {user.initial}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-label-lg font-semibold text-on-surface">{user.name}</span>
            <span
              className={cn(
                'w-fit rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold',
                user.role === 'ยังไม่ได้เข้าสู่ระบบ'
                  ? 'bg-surface-container-high text-on-surface-variant'
                  : 'bg-secondary text-on-secondary',
              )}
            >
              {user.role}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          {user.role === 'ยังไม่ได้เข้าสู่ระบบ' ? (
            <Link
              to="/signin"
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-label-md font-semibold text-primary transition-colors hover:bg-primary hover:text-on-primary"
              title="เข้าสู่ระบบ"
              onClick={onNavigate}
            >
              <Icon name="login" size={16} />
              <span>เข้าสู่ระบบ</span>
            </Link>
          ) : (
            <>
              <Link
                to="/settings"
                className="flex size-8 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-high hover:text-primary"
                aria-label="ตั้งค่าบัญชี"
                title="ตั้งค่าบัญชี"
                onClick={onNavigate}
              >
                <Icon name="settings" size={18} />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error"
                aria-label="ออกจากระบบ"
                title="ออกจากระบบ"
              >
                <Icon name="logout" size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
