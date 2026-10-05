import { useState } from 'react';
import { AuthShell } from '../../components/layout/MarketingShell';
import { AuthAside } from './SignIn';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Field, TextInput } from '../../components/ui/Field';
import { Segmented } from '../../components/ui/Segmented';
import { useToast } from '../../components/ui/Toast';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../store/auth';

type Method = 'phone' | 'gmail';

const METHODS = [
  { value: 'phone', label: 'ค้นหาเบอร์โทร' },
  { value: 'gmail', label: 'ค้นหา Gmail' },
] as const;

type FoundAccount = {
  id: string;
  name: string;
  tag: string;
  tagTone: 'secondary' | 'neutral';
  email: string;
  detail: string;
  lastSeen: string;
  icon: string;
  iconTone: string;
  primary: boolean;
};

const ACCOUNTS: readonly FoundAccount[] = [
  {
    id: 'main',
    name: 'นายสมศักดิ์ เกษตรมั่งคั่ง',
    tag: 'สวนแตงโมสายน้ำผึ้ง',
    tagTone: 'secondary',
    email: 's***k.farm@gmail.com',
    detail: 'แปลงสุพรรณบุรี (15 ไร่) • สมาชิกตั้งแต่ปี 2566',
    lastSeen: 'ใช้งานล่าสุด 2 วันที่แล้ว',
    icon: 'person',
    iconTone: 'bg-primary-fixed text-primary',
    primary: true,
  },
  {
    id: 'group',
    name: 'สวนแตงโมลุงสมศักดิ์',
    tag: 'แปลงสำรอง / กลุ่มวิสาหกิจ',
    tagTone: 'neutral',
    email: 'w***ai.farm2@gmail.com',
    detail: 'แปลงกาญจนบุรี (8 ไร่) • สมาชิกตั้งแต่ปี 2567',
    lastSeen: 'ใช้งานล่าสุด 1 เดือนที่แล้ว',
    icon: 'potted_plant',
    iconTone: 'bg-secondary-container text-secondary',
    primary: false,
  },
];

export function AccountRecovery() {
  const [method, setMethod] = useState<Method>('phone');
  const [searched, setSearched] = useState(false);
  const [phone, setPhone] = useState('084-592-8190');
  const { navigate } = useRouter();
  const toast = useToast();
  const requestOtp = useAuth((state) => state.requestOtp);
  const busy = useAuth((state) => state.status === 'loading');

  async function startRecovery() {
    if (method !== 'phone') {
      toast.info('การกู้คืนผ่าน Gmail จะเปิดให้ใช้งานเร็ว ๆ นี้ — กรุณาใช้เบอร์โทรศัพท์');
      return;
    }
    try {
      await requestOtp(phone);
      navigate('/otp');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งรหัส OTP ไม่สำเร็จ');
    }
  }

  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="flex flex-col gap-5">
          <div>
            <Badge tone="primary">
              <Icon name="lock_reset" size={14} />
              ACCOUNT SECURITY SERVICE
            </Badge>
            <h1 className="mt-2 text-headline-lg font-bold text-on-surface">ลืมรหัสผ่าน?</h1>
            <p className="mt-0.5 text-body-md text-on-surface-variant">
              ค้นหาบัญชีและรับรหัส OTP เพื่อรีเซ็ตรหัสผ่านผ่านเบอร์โทรศัพท์หรืออีเมลที่ลงทะเบียนไว้
            </p>
          </div>

          <Segmented
            options={METHODS}
            value={method}
            onChange={(next) => {
              setMethod(next);
              setSearched(false);
            }}
            label="วิธีค้นหาบัญชี"
            className="w-full max-w-sm [&>button]:flex-1"
          />

          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSearched(true);
            }}
          >
            {method === 'phone' ? (
              <Field
                label="หมายเลขโทรศัพท์มือถือที่ลงทะเบียน"
                required
                hint={
                  <>
                    <Icon name="info" size={13} className="text-secondary" />
                    ระบบจะส่งรหัสความปลอดภัย OTP 6 หลักไปยังกล่องข้อความ SMS ของคุณ
                  </>
                }
              >
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-5 flex items-center gap-1.5 select-none">
                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[11px] font-bold text-on-surface">
                      TH
                    </span>
                    <span className="text-label-md font-semibold text-on-surface">+66</span>
                    <span className="text-surface-variant">|</span>
                  </span>
                  <TextInput
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    className="pl-28"
                  />
                </div>
              </Field>
            ) : (
              <Field label="อีเมล Gmail ที่ผูกกับบัญชี" required hint="ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปยังอีเมลนี้">
                <TextInput type="email" placeholder="you@gmail.com" autoComplete="email" />
              </Field>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              <Icon name="search" size={20} />
              {method === 'phone' ? 'ค้นหาเบอร์โทร' : 'ค้นหา Gmail'}
            </Button>
          </form>

          {searched ? (
            <section className="flex flex-col gap-3 rounded-lg border border-outline-variant/30 bg-surface-low/80 p-4">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-highest/60 pb-2">
                <div className="flex items-center gap-2">
                  <Icon name="account_circle" size={22} className="text-secondary" filled />
                  <div>
                    <h2 className="text-label-lg font-bold text-on-surface">พบบัญชีผู้ใช้งานที่ผูกกับข้อมูลนี้</h2>
                    <p className="text-caption text-on-surface-variant">
                      เลือกบัญชีที่คุณต้องการรับรหัส OTP เพื่อรีเซ็ตรหัสผ่าน
                    </p>
                  </div>
                </div>
                <Badge tone="secondary">
                  <span className="size-1.5 rounded-full bg-secondary" />
                  ค้นพบ {ACCOUNTS.length} บัญชี
                </Badge>
              </header>

              <div className="flex flex-col gap-3">
                {ACCOUNTS.map((account) => (
                  <article
                    key={account.id}
                    className={`flex flex-col justify-between gap-3 rounded-lg bg-surface-lowest p-4 shadow-sm transition-all sm:flex-row sm:items-center ${
                      account.primary ? 'border-2 border-primary/40' : 'border border-outline-variant/40'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full ${account.iconTone}`}
                      >
                        <Icon name={account.icon} size={24} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-label-lg font-bold text-on-surface">{account.name}</h3>
                          <Badge tone={account.tagTone}>{account.tag}</Badge>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-caption text-on-surface">
                          <Icon name="mail" size={13} className="text-on-surface-variant" />
                          {account.email}
                        </p>
                        <p className="text-caption text-on-surface-variant">{account.detail}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-secondary">
                          <Icon name="schedule" size={12} />
                          {account.lastSeen}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant={account.primary ? 'primary' : 'ghost'}
                      size="sm"
                      className="shrink-0"
                      disabled={busy}
                      onClick={() => void startRecovery()}
                    >
                      เลือกกู้คืนบัญชีนี้
                      <Icon name="arrow_forward" size={16} />
                    </Button>
                  </article>
                ))}
              </div>

              <footer className="flex flex-col items-center justify-between gap-2 border-t border-surface-highest/60 pt-3 text-caption text-on-surface-variant sm:flex-row">
                <span className="flex items-center gap-1">
                  <Icon name="help" size={16} className="text-primary" />
                  ไม่ใช่บัญชีของคุณ? หรือไม่พบบัญชีที่ต้องการ
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMethod(method === 'phone' ? 'gmail' : 'phone');
                      setSearched(false);
                    }}
                    className="flex cursor-pointer items-center gap-0.5 font-semibold text-secondary hover:underline"
                  >
                    <Icon name="swap_horiz" size={14} />
                    ลองค้นหาด้วย{method === 'phone' ? ' Gmail' : 'เบอร์โทร'}
                  </button>
                  <span className="text-surface-variant">•</span>
                  <Link to="/support" className="flex items-center gap-0.5 font-semibold text-primary hover:underline">
                    <Icon name="support_agent" size={14} />
                    ติดต่อเจ้าหน้าที่
                  </Link>
                </div>
              </footer>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row">
          <Link
            to="/signin"
            className="inline-flex items-center gap-1 text-label-lg text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="arrow_back" size={16} />
            จำรหัสผ่านได้แล้ว? กลับสู่หน้าเข้าสู่ระบบ
          </Link>
          <Link to="/register" className="text-label-lg font-semibold text-primary hover:underline">
            ยังไม่มีบัญชี? สมัครสมาชิกใหม่
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
