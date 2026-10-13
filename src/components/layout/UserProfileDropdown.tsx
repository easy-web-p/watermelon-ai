import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { useRouter } from '../../lib/router';
import { useToast } from '../ui/Toast';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

export function UserProfileDropdown({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);
  const { navigate } = useRouter();
  const toast = useToast();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const initial = user.name ? user.name.slice(0, 1).toUpperCase() : 'U';

  function handleSignOut() {
    setIsOpen(false);
    signOut();
    toast.success('ออกจากระบบเรียบร้อยแล้ว');
    navigate('/');
  }

  function handleNavigate(path: string) {
    setIsOpen(false);
    navigate(path);
  }

  return (
    <div ref={dropdownRef} className={cn('relative shrink-0', className)}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`เมนูโปรไฟล์ของผู้ใช้ ${user.name}`}
        className={cn(
          'flex items-center gap-2 rounded-full p-1 sm:px-3 sm:py-1.5 transition-all cursor-pointer',
          'border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container active:scale-[0.98]',
          isOpen ? 'ring-2 ring-primary/40 bg-surface-container shadow-sm' : '',
        )}
      >
        <span className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-xs sm:text-sm shadow-xs">
          {initial}
        </span>
        <span className="hidden sm:inline max-w-[120px] truncate text-label-md font-semibold text-on-surface">
          {user.name}
        </span>
        <Icon
          name="expand_more"
          size={16}
          className={cn('text-on-surface-variant transition-transform duration-200 hidden sm:inline-block', isOpen ? 'rotate-180' : '')}
        />
      </button>

      {/* Dropdown Menu Card */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-72 rounded-3xl bg-surface-lowest p-3 shadow-2xl border border-outline-variant/30 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
        >
          {/* User Info Header Capsule */}
          <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-2.5 mb-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-title-sm shadow-xs">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title-sm font-bold text-on-surface">{user.name}</p>
              <p className="truncate text-caption text-on-surface-variant">
                {user.email || user.phone || (user.organization ? user.organization : 'เกษตรกรผู้ใช้งาน')}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1 py-1">
            {/* โปรไฟล์ User */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate('/settings?tab=profile')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-title-sm font-semibold text-on-surface hover:bg-surface-low transition-colors cursor-pointer text-left"
            >
              <Icon name="account_circle" size={20} className="text-secondary" />
              <span>โปรไฟล์ User</span>
            </button>

            {/* ตั้งค่า */}
            <button
              type="button"
              role="menuitem"
              onClick={() => handleNavigate('/settings')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-title-sm font-semibold text-on-surface hover:bg-surface-low transition-colors cursor-pointer text-left"
            >
              <Icon name="settings" size={20} className="text-outline" />
              <span>ตั้งค่า</span>
            </button>
          </div>

          {/* ออกจากระบบ Button (Pill outline) */}
          <div className="pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/60 py-2.5 px-4 text-label-lg font-bold text-on-surface hover:border-error hover:text-error hover:bg-error/5 transition-colors cursor-pointer"
            >
              <Icon name="logout" size={18} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
