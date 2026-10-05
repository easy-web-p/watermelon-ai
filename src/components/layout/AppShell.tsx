import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Icon } from '../ui/Icon';
import { LogoMark } from '../brand/Logo';
import { Link, useRouter } from '../../lib/router';
import { cn } from '../../lib/cn';
import { useDisplayUser } from '../../store/auth';

/**
 * Signed-in chrome: a fixed 20rem sidebar on desktop that becomes a drawer
 * below `lg`, plus a translucent top bar carrying search and session state.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { path } = useRouter();
  const user = useDisplayUser();

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู"
              className="flex size-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
            >
              <Icon name="menu" size={22} />
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

/** Page title block: eyebrow chip, heading, supporting line, actions. */
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-[70ch]">
        {eyebrow ? <div className="mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="text-headline-lg font-bold text-on-surface">{title}</h1>
        {description ? <p className="mt-1.5 text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
