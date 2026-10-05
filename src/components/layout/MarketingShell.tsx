import { useState } from 'react';
import type { ReactNode } from 'react';
import { Logo, LogoMark } from '../brand/Logo';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { Link, useRouter } from '../../lib/router';
import { cn } from '../../lib/cn';
import { MARKETING_NAV } from '../../data/nav';
import { useAuth } from '../../store/auth';

/** Public chrome for the landing page, pricing, policies and status screens. */
export function MarketingShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { path, navigate } = useRouter();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 bg-surface-lowest/85 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Watermelon AI หน้าแรก" className="shrink-0">
            <Logo />
          </Link>

          <nav
            className="hidden items-center rounded-full bg-surface-lowest p-1 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-outline-variant/20 lg:flex shrink-0 gap-0.5"
            aria-label="เมนูหลัก"
          >
            {MARKETING_NAV.map((item) => {
              const active = path === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-label-md xl:px-4.5 xl:py-2 xl:text-label-lg whitespace-nowrap transition-all duration-150 ease-tactile select-none shrink-0',
                    active
                      ? 'bg-surface-container font-bold text-primary shadow-xs'
                      : 'font-semibold text-on-surface-variant hover:bg-surface-low hover:text-on-surface',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/chat"
                  className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-label-md font-semibold text-on-surface hover:bg-surface-container transition-colors"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-xs">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => signOut()}>
                  ออกจากระบบ
                </Button>
              </div>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="hidden rounded-full px-3.5 py-2 text-label-md xl:text-label-lg whitespace-nowrap text-on-surface-variant transition-colors hover:text-on-surface md:inline-flex"
                >
                  เข้าสู่ระบบ
                </Link>
                <Button size="sm" className="hidden sm:inline-flex whitespace-nowrap" onClick={() => navigate('/register')}>
                  สมัครใช้ฟรี
                </Button>
              </>
            )}
            <button
              type="button"
              aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container lg:hidden"
            >
              <Icon name={open ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-outline-variant/30 bg-surface-lowest px-4 py-3 lg:hidden" aria-label="เมนูมือถือ">
            <ul className="flex flex-col gap-1">
              {MARKETING_NAV.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-full px-4 py-2.5 text-label-lg whitespace-nowrap transition-colors',
                      path === item.path
                        ? 'bg-surface-container font-bold text-primary'
                        : 'text-on-surface hover:bg-surface-low',
                    )}
                  >
                    {item.label}
                    <Icon name="chevron_right" size={18} className="text-outline" />
                  </Link>
                </li>
              ))}
              <li className="mt-2 flex gap-2 border-t border-outline-variant/30 pt-3">
                {user ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    ออกจากระบบ ({user.name})
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigate('/signin');
                        setOpen(false);
                      }}
                    >
                      เข้าสู่ระบบ
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        navigate('/register');
                        setOpen(false);
                      }}
                    >
                      สมัครใช้ฟรี
                    </Button>
                  </>
                )}
              </li>
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}

const FOOTER_GROUPS = [
  {
    title: 'ผลิตภัณฑ์',
    links: [
      { label: 'แชทปรึกษา AI', path: '/chat' },
      { label: 'สแกนโรคแตงโม', path: '/diseases' },
      { label: 'วัดความหวาน Brix', path: '/scanner' },
      { label: 'ราคาตลาดวันนี้', path: '/market' },
      { label: 'คู่มือปลูก & ดูแล', path: '/cultivation' },
      { label: 'สูตรแปรรูปแตงโม', path: '/recipes' },
    ],
  },
  {
    title: 'บริษัท',
    links: [
      { label: 'เกี่ยวกับเรา', path: '/about' },
      { label: 'งานวิจัย & สิ่งพิมพ์', path: '/research' },
      { label: 'เอกสารเชื่อมต่อ API', path: '/api-docs' },
      { label: 'แพ็กเกจและราคา', path: '/pricing' },
      { label: 'สถานะระบบ', path: '/status/200' },
    ],
  },
  {
    title: 'ความช่วยเหลือ',
    links: [
      { label: 'ศูนย์ช่วยเหลือ', path: '/support' },
      { label: 'แจ้งข้อมูล AI คลาดเคลื่อน', path: '/data-dispute' },
      { label: 'นโยบายความเป็นส่วนตัว (PDPA)', path: '/privacy' },
      { label: 'ข้อกำหนดการใช้งาน', path: '/terms' },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-lowest">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-body-md text-on-surface-variant">
              ผู้ช่วย AI สำหรับเกษตรกรแตงโมไทย วินิจฉัยโรคพืชจากภาพถ่าย ประเมินความหวาน Brix
              ติดตามราคาตลาด และวางแผนการดูแลแปลงตลอดฤดูกาล
            </p>
            <div className="mt-5 flex items-center gap-2">
              {['chat', 'mail', 'public'].map((icon) => (
                <span
                  key={icon}
                  className="flex size-9 items-center justify-center rounded-full bg-surface-low text-on-surface-variant"
                >
                  <Icon name={icon} size={18} />
                </span>
              ))}
            </div>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h3 className="text-label-lg font-bold text-on-surface">{group.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {group.links.map((link) => (
                  <li key={link.path + link.label}>
                    <Link
                      to={link.path}
                      className="text-body-md text-on-surface-variant transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-outline-variant/30 pt-6 text-caption text-on-surface-variant md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { icon: 'verified_user', label: 'ISO 27001 Certified' },
              { icon: 'security', label: 'PDPA Compliant' },
              { icon: 'lock', label: 'SSL 256-bit Encrypted' },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <Icon name={item.icon} size={16} className="text-secondary" />
                {item.label}
              </span>
            ))}
          </div>
          <p className="text-center">
            © 2026 Watermelon AI — ระบบวิเคราะห์โรคพืชและโรคแตงโมอัจฉริยะ สงวนลิขสิทธิ์ทุกประการ
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Centred card chrome for sign-in, registration, OTP and recovery screens matching Stitch watermelon_ai_auth_portal. */
export function AuthShell({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface font-body-md text-on-surface antialiased">
      <header className="sticky top-0 z-50 w-full border-b border-outline-variant/20 bg-surface/85 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Watermelon AI หน้าแรก" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/support"
              className="hidden items-center gap-1.5 text-label-md text-on-surface-variant transition-colors hover:text-primary sm:inline-flex"
            >
              <Icon name="support_agent" size={18} />
              <span>ติดต่อเจ้าหน้าที่</span>
            </Link>
            <div className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-xs">
              <Icon name="person" size={18} />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
            {aside ? (
              <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-low p-6 shadow-sm sm:p-8 lg:col-span-5">
                {aside}
              </div>
            ) : null}
            <div className={cn('flex flex-col justify-center', aside ? 'lg:col-span-7' : 'lg:col-span-12')}>
              <div className="relative w-full rounded-2xl bg-surface-lowest p-6 shadow-lg sm:p-8 md:p-10">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto w-full border-t border-outline-variant/20 bg-surface-lowest/80 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-caption text-on-surface-variant sm:px-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <Icon name="verified_user" size={16} className="text-secondary" />
              ISO 27001 Certified
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="gavel" size={16} className="text-secondary" />
              PDPA Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="lock" size={16} className="text-secondary" />
              SSL 256-bit Encrypted
            </span>
          </div>
          <p className="text-center md:text-right">
            © 2026 Watermelon AI. ระบบวิเคราะห์โรคพืชและโรคแตงโมอัจฉริยะ สงวนลิขสิทธิ์ทุกประการ
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Ambient rind-and-seed watermark behind the auth aside column. */
export function RindWatermark() {
  return (
    <div className="pointer-events-none absolute -top-16 -right-16 size-80 text-secondary opacity-15 select-none">
      <LogoMark size={320} className="opacity-40" />
    </div>
  );
}
