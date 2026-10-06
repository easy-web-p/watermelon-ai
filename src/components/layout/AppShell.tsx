import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../brand/Logo';
import { Link, useRouter } from '../../lib/router';
import { cn } from '../../lib/cn';
import { useAuth, useDisplayUser } from '../../store/auth';
import { useToast } from '../ui/Toast';

/**
 * Signed-in chrome: a fixed 20rem sidebar on desktop that becomes a drawer
 * below `lg`, plus a translucent top bar carrying search and session state.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { path, navigate } = useRouter();
  const user = useDisplayUser();
  const authUser = useAuth((state) => state.user);
  const toast = useToast();

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  }

  useEffect(() => {
    if (!authUser) {
      toast.info('กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน');
      const search = typeof window !== 'undefined' ? window.location.search || '' : '';
      navigate(`/signin?redirect=${encodeURIComponent(path + search)}`, { replace: true });
    }
  }, [authUser, path, navigate, toast]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!authUser) {
    const redirectUrl = `/signin?redirect=${encodeURIComponent(path + (typeof window !== 'undefined' ? window.location.search || '' : ''))}`;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12 text-center" role="alert">
        <div className="relative mb-6">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-inner">
            <Icon name="lock" size={40} />
          </div>
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-surface-lowest text-lg shadow-sm">
            🍉
          </span>
        </div>
        <h1 className="text-headline-sm font-bold text-on-surface sm:text-headline-md">
          กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน
        </h1>
        <p className="mt-2 max-w-md text-body-md text-on-surface-variant">
          เนื้อหาและฟังก์ชันส่วนนี้สงวนไว้สำหรับสมาชิก กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อเริ่มต้นใช้งาน Watermelon AI
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(redirectUrl)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-label-lg font-semibold text-on-primary shadow-sm transition-transform active:scale-95"
          >
            <Icon name="login" size={18} />
            เข้าสู่ระบบ / ลงทะเบียน
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-outline-variant/50 bg-surface-lowest px-6 py-2.5 text-label-lg font-semibold text-on-surface transition-all hover:bg-surface-container active:scale-95"
          >
            <Icon name="arrow_back" size={18} />
            กลับสู่หน้าแรก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop rail */}
      <aside className="fixed top-0 left-0 z-50 hidden h-screen w-80 shadow-rind lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-60 lg:hidden',
          drawerOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={() => setDrawerOpen(false)}
          className={cn(
            'absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[20rem] max-w-[86vw] shadow-dock transition-transform duration-200 ease-tactile',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>

      <div className="flex min-h-screen flex-col lg:pl-80">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-outline-variant/30 bg-surface/85 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู"
              className="flex size-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
            >
              <Icon name="menu" size={22} />
            </button>

            <button
              type="button"
              onClick={handleBack}
              aria-label="ย้อนกลับ"
              title="ย้อนกลับ"
              className="flex items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1.5 text-label-md font-semibold text-on-surface-variant transition-all duration-150 hover:bg-surface-container hover:text-on-surface active:scale-95 cursor-pointer shrink-0"
            >
              <Icon name="arrow_back" size={18} />
              <span className="hidden sm:inline">ย้อนกลับ</span>
            </button>

            <Link to="/chat" className="lg:hidden" aria-label="Watermelon AI">
              <LogoMark size={28} />
            </Link>

            <label className="hidden min-w-0 items-center gap-2 rounded-full bg-surface-lowest px-4 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.04)] md:flex md:w-72">
              <Icon name="search" size={18} className="text-outline" />
              <input
                type="search"
                placeholder="ค้นหาคำถาม, สายพันธุ์, ปัญหาแตงโม..."
                className="w-full min-w-0 border-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-outline"
              />
            </label>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1 text-label-md text-on-secondary-fixed-variant xl:inline-flex">
              <span className="size-2 animate-pulse rounded-full bg-secondary" />
              AI Online พร้อมตอบคำถาม
            </span>

            <Link
              to="/alerts"
              className="relative flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label="การแจ้งเตือน"
            >
              <Icon name="notifications" size={22} />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-surface" />
            </Link>

            <Link
              to="/support"
              className="hidden size-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface sm:flex"
              aria-label="ศูนย์ช่วยเหลือ"
            >
              <Icon name="help" size={22} />
            </Link>

            <Link
              to="/settings"
              className="flex size-9 items-center justify-center rounded-full bg-secondary-fixed text-label-lg font-bold text-on-secondary-fixed-variant"
              aria-label="บัญชีของฉัน"
            >
              {user.initial}
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Standard page padding + max width for content screens inside the shell. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8', className)}>{children}</div>;
}

/** Page title block: back button, eyebrow chip, heading, supporting line, actions. */
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
  hideBack = false,
  backUrl,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  hideBack?: boolean;
  backUrl?: string;
}) {
  const { navigate } = useRouter();

  function handleBack() {
    if (backUrl) {
      navigate(backUrl);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-[70ch]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {!hideBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="ย้อนกลับ"
              title="ย้อนกลับ"
              className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-surface-container-low px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <Icon name="arrow_back" size={16} />
              <span>ย้อนกลับ</span>
            </button>
          )}
          {eyebrow}
        </div>
        <h1 className="text-headline-lg font-bold text-on-surface">{title}</h1>
        {description ? <p className="mt-1.5 text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
