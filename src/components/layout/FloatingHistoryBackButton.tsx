import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../../lib/router';
import { Icon } from '../ui/Icon';
import { cn } from '../../lib/cn';

export const ROUTE_META: Record<string, { title: string; icon: string }> = {
  '/': { title: 'หน้าแรก', icon: 'home' },
  '/chat': { title: 'แชทน้องแตงโม AI', icon: 'forum' },
  '/disease-scan': { title: 'ตรวจโรคใบด้วย AI', icon: 'biotech' },
  '/evaluation': { title: 'การวัดผลโมเดล AI', icon: 'insights' },
  '/diseases': { title: 'โรคแตงโมที่รองรับ', icon: 'coronavirus' },
  '/cultivation': { title: 'คู่มือปลูก & ดูแล', icon: 'potted_plant' },
  '/market': { title: 'เช็กราคาตลาดแตงโม', icon: 'trending_up' },
  '/fertilizer': { title: 'ปุ๋ย & สารอารักขา', icon: 'science' },
  '/recipes': { title: 'สูตรแปรรูปแตงโม', icon: 'local_bar' },
  '/plots': { title: 'จัดการแปลงเพาะปลูก', icon: 'map' },
  '/alerts': { title: 'แจ้งเตือนผ่าน LINE', icon: 'notifications_active' },
  '/about': { title: 'ข้อมูลเกี่ยวกับเรา', icon: 'info' },
  '/research': { title: 'งานวิจัย & Dataset', icon: 'menu_book' },
  '/pricing': { title: 'แพ็กเกจและราคา', icon: 'workspace_premium' },
  '/support': { title: 'ศูนย์ช่วยเหลือ', icon: 'support_agent' },
  '/settings': { title: 'ตั้งค่าบัญชี', icon: 'settings' },
  '/security': { title: 'ความปลอดภัย', icon: 'shield' },
  '/signin': { title: 'เข้าสู่ระบบ', icon: 'login' },
  '/register': { title: 'สมัครสมาชิก', icon: 'person_add' },
  '/api-docs': { title: 'API Documentation', icon: 'code' },
  '/data-dispute': { title: 'แจ้งข้อมูลคลาดเคลื่อน', icon: 'report_problem' },
  '/privacy': { title: 'นโยบายความเป็นส่วนตัว', icon: 'policy' },
  '/terms': { title: 'ข้อกำหนดการใช้งาน', icon: 'gavel' },
};

function getRouteMeta(path: string): { title: string; icon: string } {
  if (ROUTE_META[path]) return ROUTE_META[path];
  if (path.startsWith('/chat/')) return { title: 'ห้องสนทนา', icon: 'forum' };
  if (path.startsWith('/status/')) return { title: 'สถานะระบบ', icon: 'info' };
  return { title: 'หน้าที่เข้าชม', icon: 'explore' };
}

const STORAGE_KEY = 'wm_navigation_history_v1';
const MAX_HISTORY = 5;

// Circle sizes ordered from largest (most recent) to smallest (older)
const SIZES = [
  { size: 'size-[52px]', iconSize: 22, ring: 'ring-2 ring-primary/40', badge: 'ล่าสุด' },
  { size: 'size-[44px]', iconSize: 20, ring: 'ring-1 ring-secondary/30', badge: 'ก่อนหน้า' },
  { size: 'size-[38px]', iconSize: 18, ring: 'ring-1 ring-outline-variant/30', badge: '' },
  { size: 'size-[32px]', iconSize: 16, ring: 'ring-1 ring-outline-variant/20', badge: '' },
  { size: 'size-[28px]', iconSize: 14, ring: '', badge: '' },
] as const;

export function FloatingHistoryBackButton() {
  const { path, navigate } = useRouter();
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isOpen, setIsOpen] = useState(false);
  const prevPathRef = useRef<string>(path);

  // Track page transitions
  useEffect(() => {
    const prev = prevPathRef.current;
    if (prev && prev !== path) {
      setHistory((current) => {
        // Remove occurrences of prev to avoid duplicates, then prepend to make it most recent
        const filtered = current.filter((item) => item !== prev && item !== path);
        const updated = [prev, ...filtered].slice(0, MAX_HISTORY);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore storage quota error
        }
        return updated;
      });
    }
    prevPathRef.current = path;
    setIsOpen(false);
  }, [path]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  function handleSelect(targetPath: string) {
    setIsOpen(false);
    navigate(targetPath);
  }

  // If no history exists yet, offer home if not already on home
  const displayHistory = history.length > 0 ? history : path !== '/' ? ['/'] : [];

  return (
    <>
      {/* Click outside backdrop when expanded */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity animate-in fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Container anchored at bottom-left */}
      <div
        className="fixed bottom-5 left-5 z-50 flex flex-col items-center select-none"
        role="region"
        aria-label="เมนูย้อนกลับและประวัติการเข้าชม"
      >
        {/* History items stacking UPWARDS from largest to smallest */}
        {isOpen && (
          <div
            className="mb-3 flex flex-col-reverse items-center gap-2.5 animate-in slide-in-from-bottom-3 fade-in duration-200"
            role="menu"
            aria-label="ประวัติหน้าที่เคยเข้าชม"
          >
            {displayHistory.map((itemPath, index) => {
              const meta = getRouteMeta(itemPath);
              const config = SIZES[Math.min(index, SIZES.length - 1)];

              return (
                <div key={`${itemPath}-${index}`} className="relative flex items-center group">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleSelect(itemPath)}
                    className={cn(
                      'cursor-pointer flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 shadow-md',
                      'bg-surface-lowest text-on-surface hover:bg-primary-container hover:text-primary hover:scale-110',
                      config.size,
                      config.ring,
                      index === 0 ? 'bg-primary text-on-primary shadow-lg ring-primary' : '',
                    )}
                    aria-label={`ย้อนกลับไปหน้า ${meta.title}`}
                    title={meta.title}
                  >
                    <Icon
                      name={meta.icon}
                      size={config.iconSize}
                      className={index === 0 ? 'text-on-primary' : 'text-primary'}
                    />
                  </button>

                  {/* Tooltip on hover on the right side */}
                  <div className="pointer-events-none absolute left-full ml-3 hidden items-center gap-1.5 rounded-xl bg-inverse-surface/95 px-3 py-1.5 text-label-xs font-semibold text-inverse-on-surface shadow-xl backdrop-blur-md whitespace-nowrap group-hover:flex z-60 animate-in fade-in duration-100">
                    <span>{meta.title}</span>
                    {config.badge ? (
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] text-primary-fixed">
                        {config.badge}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {displayHistory.length === 0 && (
              <div className="rounded-xl bg-surface-lowest/90 px-3 py-1.5 text-caption font-semibold text-on-surface-variant shadow-md border border-outline-variant/30 mb-1">
                ยังไม่มีประวัติหน้าก่อนหน้า
              </div>
            )}
          </div>
        )}

        {/* Main circular back button */}
        <div className="relative flex items-center group">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="ย้อนกลับ"
            aria-expanded={isOpen}
            className={cn(
              'flex size-13 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-lowest text-primary shadow-xl',
              'transition-all duration-200 ease-tactile hover:scale-105 hover:bg-surface-container hover:shadow-2xl active:scale-95 cursor-pointer',
              isOpen ? 'bg-primary-container text-primary ring-2 ring-primary shadow-2xl' : '',
            )}
          >
            <Icon
              name={isOpen ? 'close' : 'arrow_back'}
              size={22}
              className={cn('transition-transform duration-200', isOpen ? 'rotate-90' : 'group-hover:-translate-x-0.5')}
            />
          </button>

          {/* Tooltip on hover when menu is closed */}
          {!isOpen && (
            <div className="pointer-events-none absolute left-full ml-3 hidden items-center rounded-xl bg-inverse-surface/95 px-3 py-1.5 text-label-xs font-semibold text-inverse-on-surface shadow-xl backdrop-blur-md whitespace-nowrap group-hover:flex z-60 animate-in fade-in duration-100">
              ย้อนกลับ (ดูประวัติ)
            </div>
          )}
        </div>
      </div>
    </>
  );
}
