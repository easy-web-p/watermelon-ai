import { useEffect, useState } from 'react';
import { AuthShell } from '../../components/layout/MarketingShell';
import { Icon } from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { Link, useRouter } from '../../lib/router';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/cn';
import { GoogleSignInModal } from './GoogleSignInModal';

const PROVINCES = [
  { value: '', label: 'เลือกจังหวัดแปลงปลูกของคุณ' },
  { value: 'suphanburi', label: 'สุพรรณบุรี' },
  { value: 'kamphaengphet', label: 'กำแพงเพชร' },
  { value: 'nakhonpathom', label: 'นครปฐม' },
  { value: 'chonburi', label: 'ชลบุรี' },
  { value: 'khonkaen', label: 'ขอนแก่น' },
  { value: 'yasothon', label: 'ยโสธร' },
  { value: 'songkhla', label: 'สงขลา' },
  { value: 'other', label: 'จังหวัดอื่นๆ' },
] as const;

const CULTIVAR_OPTIONS = [
  { value: 'torpedo', label: 'ตอร์ปิโด' },
  { value: 'sonya', label: 'ซอนญ่า' },
  { value: 'maya', label: 'เมญ่า' },
  { value: 'bowing', label: 'โบวิ่ง' },
  { value: 'seedless', label: 'แตงโมไร้เมล็ด' },
  { value: 'kinnaree', label: 'กินรี' },
  { value: 'other', label: 'สายพันธุ์อื่นๆ' },
] as const;

export function AuthAside() {
  return (
    <>
      {/* Ambient Fruity Glow Accents */}
      <div className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 size-72 rounded-full bg-secondary-container/40 blur-3xl" />

      {/* Top Header & Brand Identity inside panel */}
      <div className="relative z-10 flex flex-col gap-4">
        <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-lowest px-3.5 py-1 text-label-md font-semibold text-secondary shadow-xs">
          <Icon name="verified" size={18} />
          <span>นวัตกรรม AI เกษตรแม่นยำแห่งแรกในไทย</span>
        </div>

        <div>
          <h1 className="text-headline-lg font-bold tracking-tight text-on-surface">
            สแกนวิเคราะห์
            <br />
            <span className="text-primary">โรคแตงโมอัจฉริยะ</span>
          </h1>
          <p className="mt-1.5 text-body-md leading-relaxed text-on-surface-variant">
            ระบบวินิจฉัยอาการใบจุด แอนแทรคโนส ราแป้ง และเพลี้ยไฟจากภาพถ่าย พร้อมคำแนะนำยารักษาตรงจุดตามหลักวิชาการ
          </p>
        </div>

        {/* Hero Image Card with Scan UI Overlay */}
        <div className="group relative mt-1 overflow-hidden rounded-xl shadow-md">
          <img
            src="/assets/mobile_app_scanning_field.png"
            alt="เกษตรกรกำลังใช้สมาร์ตโฟนสแกนใบแตงโมเพื่อตรวจโรคพืช"
            className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-transparent to-transparent" />

          {/* Realtime Scan Status Overlay Indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface-lowest/90 px-2.5 py-1 shadow-xs backdrop-blur-md">
            <span className="size-2 animate-pulse rounded-full bg-secondary" />
            <span className="text-caption font-semibold text-on-surface">AI Detection Active</span>
          </div>

          <div className="absolute right-3 bottom-3 left-3 flex items-center justify-between text-inverse-on-surface">
            <div className="flex items-center gap-1.5">
              <Icon name="psychology" size={18} className="text-secondary-fixed" />
              <span className="text-label-md font-medium">แม่นยำสูงระดับห้องปฏิบัติการ</span>
            </div>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-caption font-bold text-on-primary">
              v3.8 Neural
            </span>
          </div>
        </div>

        {/* 3 Feature Badges */}
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest/80 p-2.5 shadow-xs backdrop-blur-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="bolt" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-label-lg font-semibold text-on-surface">สแกนโรคพืชเสร็จใน 3 วินาที</p>
              <p className="truncate text-caption text-on-surface-variant">
                ประมวลผลทันทีผ่านกล้องมือถือ แม้สัญญาณอินเทอร์เน็ตต่ำ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest/80 p-2.5 shadow-xs backdrop-blur-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <Icon name="track_changes" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-label-lg font-semibold text-on-surface">แม่นยำ 98.4% ด้วย AI Computer Vision</p>
              <p className="truncate text-caption text-on-surface-variant">
                เทรนด้วยดาต้าเซ็ตใบแตงโมไทยกว่า 120,000 ภาพ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-surface-lowest/80 p-2.5 shadow-xs backdrop-blur-sm">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed-dim/30 text-tertiary">
              <Icon name="potted_plant" size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-label-lg font-semibold text-on-surface">ผู้ช่วยเกษตรกรไทยกว่า 8,500 แปลง</p>
              <p className="truncate text-caption text-on-surface-variant">
                ครอบคลุมทั้งแตงโมกินรี, ตอร์ปิโด, ซอนญ่า และทัมอัพ
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Farmer Testimonial & Security Credibility */}
      <div className="relative z-10 mt-6 flex flex-col gap-2 rounded-xl bg-surface-lowest/75 p-4 shadow-xs backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[#f59e0b]">
            {[1, 2, 3, 4, 5].map((i) => (
              <Icon key={i} name="star" size={16} filled />
            ))}
            <span className="ml-1 text-label-md font-bold text-on-surface">5.0 / 5.0</span>
          </div>
          <span className="text-caption font-semibold text-secondary">ใช้งานฟรีตลอดชีพ</span>
        </div>

        <p className="text-body-md italic text-on-surface">
          “สมัครครั้งเดียว สแกนตรวจโรคแตงโมฟรีตลอดชีพผ่านเว็บและ LINE สะดวกมาก เจออาการแอนแทรคโนสไว จัดการยาทัน ลดความเสียหายได้เกิน 80%”
        </p>

        <div className="flex items-center gap-3 pt-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-label-lg font-bold text-on-secondary-fixed">
            ส
          </div>
          <div>
            <p className="text-label-md font-semibold text-on-surface">นายสมพร สวนสุพรรณ</p>
            <p className="text-caption text-on-surface-variant">เกษตรกรดีเด่น จ.สุพรรณบุรี (แปลง 45 ไร่)</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function SignIn({ initialMode = 'signin' }: { initialMode?: 'signin' | 'register' }) {
  const { path, navigate } = useRouter();

  // Determine active tab from URL or initialMode
  const [mode, setMode] = useState<'signin' | 'register'>(() => {
    if (path.includes('register')) return 'register';
    return initialMode;
  });

  // Keep state synchronized with URL hash changes (back/forward navigation)
  useEffect(() => {
    if (path.includes('register')) {
      setMode('register');
    } else if (path.includes('signin') || path.includes('login')) {
      setMode('signin');
    }
  }, [path]);

  // Dynamically update document title based on the active tab
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title =
        mode === 'signin'
          ? 'เข้าสู่ระบบ | Watermelon AI - ผู้ช่วยอัจฉริยะเรื่องแตงโม'
          : 'สมัครสมาชิกใหม่ | Watermelon AI - ผู้ช่วยอัจฉริยะเรื่องแตงโม';
    }
  }, [mode]);

  // Sign in form state
  const [identifier, setIdentifier] = useState('084-592-8190');
  const [signInPassword, setSignInPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [province, setProvince] = useState('suphanburi');
  const [cultivar, setCultivar] = useState('torpedo');
  const [plotSize, setPlotSize] = useState('15');
  const [agreed, setAgreed] = useState(true);

  // Common UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const toast = useToast();
  const loginWithPassword = useAuth((state) => state.loginWithPassword);
  const registerFarmer = useAuth((state) => state.register);
  const socialLogin = useAuth((state) => state.socialLogin);
  const busy = useAuth((state) => state.status === 'loading');

  function handleSwitchTab(newMode: 'signin' | 'register') {
    setMode(newMode);
    navigate(newMode === 'register' ? '/register' : '/signin', { replace: true });
  }

  async function handleSignInSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim()) {
      toast.error('กรุณาระบุเบอร์โทรศัพท์มือถือ หรือ อีเมล');
      return;
    }

    try {
      const user = await loginWithPassword(identifier, signInPassword);
      toast.success(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.name}`);
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!agreed) {
      toast.error('กรุณายอมรับเงื่อนไขการให้บริการและนโยบาย PDPA');
      return;
    }

    if (registerPassword && confirmPassword && registerPassword !== confirmPassword) {
      toast.error('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    const cleanPhone = registerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      toast.error('กรุณาระบุหมายเลขโทรศัพท์มือถือให้ถูกต้อง (9-10 หลัก)');
      return;
    }

    try {
      const user = await registerFarmer({
        name: fullName || `เกษตรกร (${cleanPhone.slice(-4)})`,
        phone: registerPhone,
        password: registerPassword,
        province,
        cultivar,
        plotSize,
      });
      toast.success(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับคุณ ${user.name}`);
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'สมัครสมาชิกไม่สำเร็จ');
    }
  }

  async function handleSocial(provider: 'google' | 'line') {
    if (provider === 'google') {
      try {
        const user = await socialLogin('google');
        toast.success(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.name}`);
        navigate('/chat');
      } catch (error: any) {
        if (error?.message === 'ยกเลิกการเข้าสู่ระบบ') return;
        setShowGoogleModal(true);
      }
      return;
    }

    try {
      const user = await socialLogin('line');
      toast.success(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.name}`);
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  async function handleSelectGoogleAccount(details: { email: string; name: string }) {
    const user = await socialLogin('google', details);
    setShowGoogleModal(false);
    toast.success(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.name}`);
    navigate('/chat');
  }

  return (
    <AuthShell aside={<AuthAside />}>
      <div className="flex flex-col">
        {/* Seamless Segmented Tab Navigation for Sign In / Register */}
        <div className="mb-6 flex rounded-full bg-surface-container-low p-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleSwitchTab('signin')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-label-lg font-semibold transition-all duration-200 select-none cursor-pointer',
              mode === 'signin'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon name="login" size={18} />
            <span>เข้าสู่ระบบ (Sign In)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('register')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-label-lg font-semibold transition-all duration-200 select-none cursor-pointer',
              mode === 'register'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Icon name="person_add" size={18} />
            <span>สมัครสมาชิกใหม่ (Register)</span>
          </button>
        </div>

        {/* Instant Fast Social Options */}
        <div className="flex flex-col gap-2.5">
          {/* LINE Button */}
          <button
            type="button"
            onClick={() => void handleSocial('line')}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#06C755] px-4 py-2.5 text-label-lg font-bold text-white shadow-xs transition-all hover:bg-[#05b34c] active:scale-[0.98] cursor-pointer"
          >
            <svg className="size-6 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.584.39.085.922.259 1.057.595.121.303.079.778.039 1.084l-.171 1.028c-.053.315-.246 1.233 1.081.672 1.327-.561 7.156-4.214 9.764-7.214 1.503-1.637 2.211-3.489 2.211-5.747zm-14.73 2.879h-2.193a.625.625 0 0 1-.625-.625v-4.508a.625.625 0 1 1 1.25 0v3.883h1.568a.625.625 0 1 1 0 1.25zm2.868-.625a.625.625 0 0 1-1.25 0v-4.508a.625.625 0 1 1 1.25 0v4.508zm5.029 0a.625.625 0 0 1-.49.613.628.628 0 0 1-.611-.237l-2.052-2.735v2.359a.625.625 0 1 1-1.25 0v-4.508a.625.625 0 0 1 .49-.613.626.626 0 0 1 .611.237l2.052 2.735v-2.359a.625.625 0 1 1 1.25 0v4.508zm3.628-2.633h-1.568v1.071h1.568a.625.625 0 1 1 0 1.25h-2.193a.625.625 0 0 1-.625-.625v-4.508a.625.625 0 0 1 .625-.625h2.193a.625.625 0 1 1 0 1.25h-1.568v.938h1.568a.625.625 0 1 1 0 1.249z" />
            </svg>
            <span>{mode === 'signin' ? 'เข้าสู่ระบบด่วนด้วย LINE Official' : 'สมัครด่วนด้วย LINE Official'}</span>
          </button>

          {/* Google Button */}
          <button
            type="button"
            onClick={() => void handleSocial('google')}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-full bg-surface-container px-4 py-2.5 text-label-lg font-semibold text-on-surface transition-all hover:bg-surface-variant active:scale-[0.98] cursor-pointer"
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{mode === 'signin' ? 'เข้าสู่ระบบด้วย Google' : 'สมัครสมาชิกด้วย Google'}</span>
          </button>
        </div>

        {/* Crisp Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="h-px w-full bg-surface-container-high" />
          <span className="absolute bg-surface-lowest px-3 text-caption text-on-surface-variant">
            {mode === 'signin' ? 'หรือ ระบุเบอร์โทรศัพท์ / อีเมลเพื่อเข้าสู่ระบบ' : 'หรือ กรอกข้อมูลสมัครสมาชิกใหม่ด้านล่าง'}
          </span>
        </div>

        {/* MODE 1: SIGN IN FORM */}
        {mode === 'signin' ? (
          <form className="flex flex-col gap-4 animate-in fade-in duration-200" onSubmit={handleSignInSubmit}>
            {/* Identifier Field */}
            <div>
              <label className="mb-1 block text-label-md font-semibold text-on-surface">
                เบอร์โทรศัพท์มือถือ หรือ อีเมล
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                  <Icon name="call" size={20} />
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="08X-XXX-XXXX หรือ email@example.com"
                  className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-label-md font-semibold text-on-surface">รหัสผ่าน</label>
                <Link to="/recover" className="text-caption text-primary hover:underline">
                  ลืมรหัสผ่าน?
                </Link>
              </div>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                  <Icon name="lock" size={20} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-full bg-surface-container-low py-2.5 pr-12 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 flex items-center justify-center p-1 text-on-surface-variant transition-colors hover:text-on-surface cursor-pointer"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                </button>
              </div>
            </div>

            {/* Remember me & Security */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 cursor-pointer rounded accent-[#1b6b44]"
                />
                <span className="text-label-md text-on-surface-variant">จดจำการเข้าสู่ระบบบนอุปกรณ์นี้</span>
              </label>
              <div className="flex items-center gap-1 text-caption text-secondary">
                <Icon name="lock" size={16} />
                <span>256-bit SSL</span>
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-headline-sm font-semibold text-on-primary shadow-md transition-all hover:bg-[#a0002d] active:scale-[0.98] cursor-pointer"
            >
              <span>{busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบเพื่อเริ่มวินิจฉัยโรคพืช'}</span>
              <span className="text-xl">🍉</span>
            </button>
          </form>
        ) : (
          /* MODE 2: REGISTER FORM */
          <form className="flex flex-col gap-4 animate-in fade-in duration-200" onSubmit={handleRegisterSubmit}>
            {/* Full Name / Farm Name */}
            <div>
              <label className="mb-1 block text-label-md font-semibold text-on-surface">
                ชื่อ - นามสกุลเกษตรกร / เจ้าของแปลง <span className="text-primary">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                  <Icon name="badge" size={20} />
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="เช่น สมศักดิ์ เกษตรมั่งคั่ง (สวนแตงโมสายน้ำผึ้ง)"
                  className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="mb-1 block text-label-md font-semibold text-on-surface">
                เบอร์โทรศัพท์มือถือ สำหรับรับการแจ้งเตือน <span className="text-primary">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                  <Icon name="call" size={20} />
                </span>
                <input
                  type="tel"
                  required
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-label-md font-semibold text-on-surface">
                  ตั้งรหัสผ่าน <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                    <Icon name="lock" size={20} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="w-full rounded-full bg-surface-container-low py-2.5 pr-12 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 flex items-center justify-center p-1 text-on-surface-variant transition-colors hover:text-on-surface cursor-pointer"
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-label-md font-semibold text-on-surface">
                  ยืนยันรหัสผ่าน <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-4 text-on-surface-variant">
                    <Icon name="lock_reset" size={20} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    className="w-full rounded-full bg-surface-container-low py-2.5 pr-4 pl-12 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Farm Parcel Details Box */}
            <div className="mt-1 flex flex-col gap-2 rounded-xl bg-surface-container-low/70 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-label-md font-bold text-secondary">
                <Icon name="agriculture" size={18} />
                <span>ข้อมูลแปลงแตงโม เพื่อ AI ประมวลผลแม่นยำขึ้น</span>
              </div>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-caption font-semibold text-on-surface-variant">จังหวัดที่ปลูก</label>
                  <div className="relative flex items-center">
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full appearance-none rounded-full bg-surface-lowest py-2 pr-8 pl-3.5 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none cursor-pointer"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 text-on-surface-variant">
                      <Icon name="expand_more" size={18} />
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-caption font-semibold text-on-surface-variant">
                    สายพันธุ์แตงโมหลัก
                  </label>
                  <div className="relative flex items-center">
                    <select
                      value={cultivar}
                      onChange={(e) => setCultivar(e.target.value)}
                      className="w-full appearance-none rounded-full bg-surface-lowest py-2 pr-8 pl-3.5 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none cursor-pointer"
                    >
                      {CULTIVAR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 text-on-surface-variant">
                      <Icon name="expand_more" size={18} />
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-caption font-semibold text-on-surface-variant">
                    ขนาดพื้นที่แปลง (ไร่)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={plotSize}
                      onChange={(e) => setPlotSize(e.target.value)}
                      placeholder="เช่น 15 ไร่"
                      className="w-full rounded-full bg-surface-lowest py-2 pr-3.5 pl-3.5 text-body-md text-on-surface transition-colors focus:bg-surface-container focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & PDPA Consent */}
            <div className="mt-1 flex items-start gap-2">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 cursor-pointer rounded accent-[#1b6b44]"
              />
              <label
                htmlFor="agreeTerms"
                className="cursor-pointer text-caption leading-relaxed text-on-surface-variant select-none"
              >
                ยอมรับ
                <Link to="/terms" className="ml-1 text-primary underline">
                  เงื่อนไขการให้บริการ
                </Link>{' '}
                และ{' '}
                <Link to="/privacy" className="text-primary underline">
                  นโยบายความเป็นส่วนตัว (PDPA)
                </Link>{' '}
                สำหรับข้อมูลผลผลิตและโรคพืช
              </label>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-headline-sm font-semibold text-on-primary shadow-md transition-all hover:bg-[#a0002d] active:scale-[0.98] cursor-pointer"
            >
              <span>{busy ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันสมัครสมาชิกเกษตรกรฟรี'}</span>
              <span className="text-xl">🍉</span>
            </button>
          </form>
        )}

        {/* Free Perk Guarantee Banner */}
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-secondary-container/40 p-4">
          <Icon name="stars" size={22} className="mt-0.5 shrink-0 text-secondary" />
          <div className="text-on-secondary-container">
            <p className="text-label-md font-bold">
              {mode === 'signin' ? 'สิทธิพิเศษสำหรับเกษตรกรสมาชิก' : 'สิทธิพิเศษเฉพาะสมาชิกใหม่'}
            </p>
            <p className="mt-0.5 text-caption leading-relaxed">
              รับฟรีทันที: เครดิตสแกนวิเคราะห์โรคพืชไม่จำกัดจำนวนครั้ง + เข้าถึงคลังสูตรสารกำจัดศัตรูพืชปลอดภัยรับรองโดยกรมวิชาการเกษตร
            </p>
          </div>
        </div>

        {/* Bottom Switch Prompt */}
        <div className="mt-4 pt-2 text-center">
          {mode === 'signin' ? (
            <p className="text-body-md text-on-surface-variant">
              ยังไม่มีบัญชี Watermelon AI?{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('register')}
                className="ml-1 font-semibold text-primary hover:underline cursor-pointer"
              >
                สมัครสมาชิกเกษตรกรฟรี →
              </button>
            </p>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              มีบัญชี Watermelon AI อยู่แล้ว?{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('signin')}
                className="ml-1 font-semibold text-primary hover:underline cursor-pointer"
              >
                เข้าสู่ระบบที่นี่ →
              </button>
            </p>
          )}
        </div>

        {/* Help / Farmer Support Direct Contact */}
        <div className="mt-2 text-center">
          <p className="text-caption text-on-surface-variant/80">
            พบปัญหาการเข้าสู่ระบบ? ติดต่อฝ่ายบริการเกษตรกร โทร{' '}
            <a href="tel:021234567" className="text-on-surface underline">
              02-123-4567
            </a>{' '}
            หรือ LINE:{' '}
            <span className="font-semibold text-secondary">@WatermelonAI</span>
          </p>
        </div>

        {/* Google Sign In Modal */}
        <GoogleSignInModal
          open={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          onSelectAccount={handleSelectGoogleAccount}
          loading={busy}
        />
      </div>
    </AuthShell>
  );
}
