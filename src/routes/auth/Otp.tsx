import { useEffect, useRef, useState } from 'react';
import { AuthShell } from '../../components/layout/MarketingShell';
import { AuthAside } from './SignIn';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { Link, useRouter } from '../../lib/router';
import { cn } from '../../lib/cn';
import { maskPhone } from '../../lib/calc';
import { useAuth } from '../../store/auth';

const LENGTH = 6;
const COUNTDOWN_SECONDS = 300;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Otp() {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(''));
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const { navigate } = useRouter();
  const toast = useToast();
  const pending = useAuth((state) => state.pendingOtp);
  const busy = useAuth((state) => state.status === 'loading');
  const verifyOtp = useAuth((state) => state.verifyOtp);
  const requestOtp = useAuth((state) => state.requestOtp);

  // Landing here without requesting a code means the session was lost.
  useEffect(() => {
    if (!pending) navigate('/signin', { replace: true });
  }, [pending, navigate]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setDigits((prev) => prev.map((digit, i) => (i === index ? '' : digit)));
      return;
    }

    setError('');
    setDigits((prev) => {
      const next = [...prev];
      // Support pasting the whole code into any box.
      clean.split('').forEach((char, offset) => {
        if (index + offset < LENGTH) next[index + offset] = char;
      });
      return next;
    });

    const nextIndex = Math.min(LENGTH - 1, index + clean.length);
    inputs.current[nextIndex]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = digits.join('');
    if (code.length !== LENGTH) {
      setError('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก');
      return;
    }

    try {
      const user = await verifyOtp(code);
      toast.success(`ยินดีต้อนรับ ${user.name}`);
      navigate('/chat');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'ยืนยันรหัสไม่สำเร็จ';
      setError(message);
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
  }

  async function handleResend() {
    if (!pending) return;
    try {
      await requestOtp(pending.phone);
      setRemaining(COUNTDOWN_SECONDS);
      setDigits(Array(LENGTH).fill(''));
      setError('');
      inputs.current[0]?.focus();
      toast.success('ส่งรหัส OTP ใหม่เรียบร้อยแล้ว');
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'ส่งรหัสใหม่ไม่สำเร็จ');
    }
  }

  const complete = digits.join('').length === LENGTH;

  return (
    <AuthShell aside={<AuthAside />}>
      <form className="flex h-full flex-col justify-between gap-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
          <div>
            <Badge tone="primary">
              <Icon name="sms" size={14} />
              SMS VERIFICATION
            </Badge>
            <h1 className="mt-2 text-headline-lg font-bold text-on-surface">ยืนยันรหัส OTP</h1>
            <p className="mt-1 text-body-md text-on-surface-variant">
              เราได้ส่งรหัสความปลอดภัย 6 หลักไปที่เบอร์{' '}
              <span className="font-semibold text-on-surface">{maskPhone(pending?.phone ?? '')}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-md bg-surface-low p-4">
            <span className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
              <Icon name="pin" size={18} className="text-primary" />
              รหัสอ้างอิง (Ref Code):
            </span>
            <span className="rounded-full bg-surface-lowest px-3 py-1 font-mono text-label-lg font-bold text-on-surface shadow-sm">
              {(pending?.sessionToken ?? '').slice(5, 13).toUpperCase() || 'WMA-0000'}
            </span>
            <span className="text-caption text-on-surface-variant">
              ตรวจสอบให้ตรงกับที่ปรากฏใน SMS เพื่อป้องกันการสวมรอย
            </span>
          </div>

          {/* The dev server returns the generated code so the flow is testable without an SMS gateway. */}
          {pending?.demoCode ? (
            <div className="flex items-center gap-2 rounded-md bg-primary-fixed p-3 text-on-primary-fixed-variant">
              <Icon name="developer_mode" size={18} />
              <span className="text-body-md">
                โหมดทดสอบ — รหัส OTP คือ{' '}
                <button
                  type="button"
                  onClick={() => setDigits(pending.demoCode!.split(''))}
                  className="cursor-pointer font-mono text-label-lg font-bold underline"
                >
                  {pending.demoCode}
                </button>{' '}
                (กดเพื่อกรอกอัตโนมัติ)
              </span>
            </div>
          ) : null}

          <div>
            <p className="mb-3 text-label-lg font-medium text-on-surface">
              กรอกรหัส OTP 6 หลัก <span className="text-primary">*</span>
            </p>
            <div className="flex gap-2 sm:gap-3" role="group" aria-label="รหัส OTP 6 หลัก">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={LENGTH}
                  value={digit}
                  disabled={busy}
                  aria-label={`หลักที่ ${index + 1}`}
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  className={cn(
                    'h-16 w-full min-w-0 rounded-lg bg-surface-low text-center text-headline-md font-bold text-on-surface outline-none transition-all focus:bg-surface-lowest focus:ring-2 focus:ring-primary disabled:opacity-60',
                    digit && 'bg-surface-lowest ring-2 ring-secondary',
                    error && 'ring-2 ring-error',
                  )}
                />
              ))}
            </div>
            {error ? (
              <p className="mt-2 flex items-center gap-1 text-caption text-error" role="alert">
                <Icon name="error" size={13} />
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
              <Icon name="timer" size={18} className={remaining > 0 ? 'text-secondary' : 'text-error'} />
              {remaining > 0 ? (
                <>
                  รหัสหมดอายุใน{' '}
                  <span className="font-mono font-bold text-on-surface">{formatCountdown(remaining)}</span>
                </>
              ) : (
                'รหัสหมดอายุแล้ว กรุณาขอรหัสใหม่'
              )}
            </span>
            <button
              type="button"
              disabled={remaining > 0 || busy}
              onClick={() => void handleResend()}
              className="cursor-pointer text-label-lg font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-outline disabled:no-underline"
            >
              ส่งรหัสใหม่อีกครั้ง
            </button>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={!complete || busy}>
            <Icon
              name={busy ? 'progress_activity' : 'verified_user'}
              size={20}
              className={busy ? 'animate-spin' : undefined}
            />
            {busy ? 'กำลังยืนยัน...' : 'ยืนยันรหัสและเข้าสู่ระบบ'}
          </Button>

          <div className="flex items-start gap-2 rounded-md bg-mint-mist p-4">
            <Icon name="shield" size={18} className="mt-0.5 shrink-0 text-secondary" />
            <p className="text-caption text-on-surface-variant">
              เจ้าหน้าที่ Watermelon AI จะไม่ขอรหัส OTP จากคุณทางโทรศัพท์หรือข้อความเด็ดขาด
              หากมีผู้แอบอ้างขอรหัส กรุณาวางสายและแจ้งเราทันที
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between">
          <Link
            to="/signin"
            className="inline-flex items-center gap-1 text-label-lg text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="arrow_back" size={16} />
            เปลี่ยนเบอร์โทรศัพท์
          </Link>
          <Link to="/support" className="text-label-lg font-semibold text-primary hover:underline">
            ไม่ได้รับรหัส? ติดต่อเจ้าหน้าที่
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
