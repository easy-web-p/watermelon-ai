import { useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { Meter } from '../components/ui/Meter';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { api } from '../lib/api';
import { scorePassword, passwordStrengthLabel } from '../lib/calc';
import { useAuth, useDisplayUser } from '../store/auth';

type Tab = 'profile' | 'farm' | 'privacy' | 'security' | 'line' | 'billing';

const TABS: readonly { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: 'person' },
  { id: 'farm', label: 'ข้อมูลแปลงและการเกษตร', icon: 'agriculture' },
  { id: 'privacy', label: 'ความเป็นส่วนตัว (PDPA)', icon: 'policy' },
  { id: 'security', label: 'ความปลอดภัยและรหัสผ่าน', icon: 'lock' },
  { id: 'line', label: 'การแจ้งเตือน LINE', icon: 'notifications' },
  { id: 'billing', label: 'การสมัครสมาชิก', icon: 'receipt_long' },
];

/** Pill-shaped switch used for all the preference rows on this screen. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-secondary' : 'bg-surface-highest',
      )}
    >
      <span
        className={cn(
          'absolute top-1 size-5 rounded-full bg-surface-lowest shadow-sm transition-all duration-200 ease-tactile',
          checked ? 'left-6' : 'left-1',
        )}
      />
    </button>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md bg-surface-low p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-on-surface-variant">
          <Icon name={icon} size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-label-lg font-semibold text-on-surface">{title}</p>
          <p className="mt-0.5 text-caption text-on-surface-variant">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function AccountSettings() {
  const { navigate, query } = useRouter();
  const queryTab = query.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(
    queryTab && TABS.some((t) => t.id === queryTab) ? queryTab : 'profile',
  );
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const certInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Security state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactor, setTwoFactor] = useState(true);
  const [changingPass, setChangingPass] = useState(false);

  // LINE alert state
  const [lineConnected, setLineConnected] = useState(true);
  const [lineWeather, setLineWeather] = useState(true);
  const [lineDisease, setLineDisease] = useState(true);
  const [lineMarket, setLineMarket] = useState(false);

  const prefs = useAuth((state) => state.consent);
  const setConsent = useAuth((state) => state.setConsent);
  const signOut = useAuth((state) => state.signOut);
  const user = useAuth((state) => state.user);
  const display = useDisplayUser();

  const set = (key: keyof typeof prefs) => (value: boolean) => setConsent({ [key]: value });

  /** Downloads the PDPA data export as a JSON file the farmer can keep. */
  async function handleExport() {
    setExporting(true);
    try {
      const payload = await api.exportMyData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermelon-ai-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('ดาวน์โหลดข้อมูลของคุณเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ขอข้อมูลไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'ยืนยันการลบบัญชีและข้อมูลทั้งหมด? การลบไม่สามารถย้อนกลับได้ ข้อมูลแปลง ภาพถ่าย และประวัติทั้งหมดจะถูกลบถาวรภายใน 30 วัน',
    );
    if (!confirmed) return;

    try {
      await api.forgetMe({ confirm: true });
      signOut();
      toast.success('ส่งคำขอลบบัญชีเรียบร้อย ระบบจะดำเนินการภายใน 30 วัน');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งคำขอลบบัญชีไม่สำเร็จ');
    }
  }

  function handleSignOut() {
    signOut();
    toast.success('ออกจากระบบเรียบร้อยแล้ว');
    navigate('/');
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }
    setChangingPass(true);
    setTimeout(() => {
      setChangingPass(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
    }, 700);
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="workspace_premium" size={14} />
              PRO เกษตรกรดิจิทัล
            </Badge>
          }
          title="ตั้งค่าบัญชี &amp; ระบบ"
          description="จัดการข้อมูลส่วนตัว ข้อมูลแปลงเพาะปลูก ความปลอดภัย และการแจ้งเตือนของคุณ"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Settings Sidebar Card matching image design 100% */}
          <nav className="lg:col-span-4 xl:col-span-3.5" aria-label="หมวดการตั้งค่า">
            <div className="rounded-3xl bg-surface-lowest p-3 border border-outline-variant/20 shadow-sm flex flex-col gap-1.5">
              {TABS.map((item) => {
                const isActive = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-body-lg font-semibold transition-all duration-150 cursor-pointer',
                      isActive
                        ? 'bg-primary text-on-primary shadow-md'
                        : 'text-on-surface hover:bg-surface-container',
                    )}
                  >
                    <Icon
                      name={item.icon}
                      size={22}
                      className={isActive ? 'text-on-primary' : 'text-on-surface'}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <div className="my-1.5 border-t border-outline-variant/20" />

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-body-lg font-semibold text-error hover:bg-error-container/20 transition-all duration-150 cursor-pointer"
              >
                <Icon name="logout" size={22} className="text-error" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </nav>

          <div className="flex flex-col gap-4 lg:col-span-8 xl:col-span-8.5">
            {tab === 'profile' ? (
              <>
                <Card>
                  <CardHeader icon="badge" title="โปรไฟล์ผู้ใช้งาน" subtitle="ข้อมูลนี้จะแสดงในบัญชีและรายงานของคุณ" />

                  <div className="mb-6 flex flex-wrap items-center gap-4">
                    <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary-fixed text-display-sm font-bold text-on-secondary-fixed-variant">
                      {display.initial}
                    </span>
                    <div>
                      <p className="text-title-md font-bold text-on-surface">{display.name}</p>
                      <p className="text-caption text-on-surface-variant">
                        {user ? `${display.role} • ${user.organization ?? 'แปลงเกษตรกรไทย'}` : 'สมาชิกตั้งแต่ 12 มีนาคม 2566'}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          ref={avatarInput}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => {
                            if (event.target.files?.[0]) toast.success('อัปเดตรูปโปรไฟล์แล้ว');
                            event.target.value = '';
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => avatarInput.current?.click()}>
                          <Icon name="photo_camera" size={16} />
                          เปลี่ยนรูปโปรไฟล์
                        </Button>
                        <Button variant="quiet" size="sm" onClick={() => toast.info('ลบรูปโปรไฟล์แล้ว')}>
                          ลบรูป
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="ชื่อ" required>
                      <TextInput defaultValue={user?.name?.split(' ')[0] ?? 'สมศักดิ์'} />
                    </Field>
                    <Field label="นามสกุล" required>
                      <TextInput defaultValue="เกษตรมั่งคั่ง" />
                    </Field>
                    <Field label="ชื่อสวน / กิจการ">
                      <TextInput defaultValue="สวนแตงโมไชโย" />
                    </Field>
                    <Field
                      label="เบอร์โทรศัพท์"
                      hint={
                        <>
                          <Icon name="verified" size={13} className="text-secondary" />
                          ยืนยันแล้ว
                        </>
                      }
                    >
                      <TextInput type="tel" defaultValue={user?.phone ?? '084-592-8190'} />
                    </Field>
                    <Field
                      label="อีเมล"
                      className="sm:col-span-2"
                      hint={
                        <>
                          <Icon name="verified" size={13} className="text-secondary" />
                          ยืนยันแล้ว — ใช้รับใบเสร็จและรายงานรายเดือน
                        </>
                      }
                    >
                      <TextInput type="email" defaultValue={user?.email ?? 'somsak.farm@gmail.com'} />
                    </Field>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 pt-5">
                    <Button variant="quiet" size="md" onClick={() => toast.info('ยกเลิกการแก้ไขแล้ว')}>
                      ยกเลิก
                    </Button>
                    <Button
                      size="md"
                      disabled={saving}
                      onClick={() => {
                        setSaving(true);
                        window.setTimeout(() => {
                          setSaving(false);
                          toast.success('บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
                        }, 600);
                      }}
                    >
                      <Icon name={saving ? 'progress_activity' : 'save'} size={18} className={saving ? 'animate-spin' : undefined} />
                      {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                    </Button>
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    icon="language"
                    iconTone="secondary"
                    title="ภาษาและการแสดงผล"
                    subtitle="ตั้งค่าภาษาและหน่วยวัดที่ใช้ในระบบ"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="ภาษาที่ใช้งาน">
                      <select className="w-full cursor-pointer rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary">
                        <option>ไทย (Thai)</option>
                        <option>English</option>
                      </select>
                    </Field>
                    <Field label="หน่วยพื้นที่">
                      <select className="w-full cursor-pointer rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary">
                        <option>ไร่ / งาน / ตารางวา</option>
                        <option>เฮกตาร์ (Hectare)</option>
                        <option>ตารางเมตร</option>
                      </select>
                    </Field>
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    icon="logout"
                    iconTone="primary"
                    title="ออกจากระบบ"
                    subtitle="ออกจากระบบบนอุปกรณ์นี้ คุณสามารถเข้าสู่ระบบกลับมาได้ตลอดเวลา"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-body-md text-on-surface-variant">
                      หากต้องการสลับบัญชีเกษตรกร หรือสิ้นสุดการใช้งานบนอุปกรณ์เครื่องนี้
                    </p>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-error/40 bg-surface-lowest px-5 text-label-md font-semibold text-error transition-all duration-150 ease-tactile hover:bg-error hover:text-on-error active:scale-[0.96]"
                    >
                      <Icon name="logout" size={18} />
                      ออกจากระบบ
                    </button>
                  </div>
                </Card>
              </>
            ) : null}

            {tab === 'farm' ? (
              <>
                <Card>
                  <CardHeader
                    icon="agriculture"
                    iconTone="tertiary"
                    title="ข้อมูลการเกษตร"
                    subtitle="ใช้ปรับคำแนะนำของ AI ให้ตรงกับบริบทแปลงของคุณ"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="จังหวัดที่ตั้งแปลงหลัก">
                      <select className="w-full cursor-pointer rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary">
                        <option>สุพรรณบุรี</option>
                        <option>กาญจนบุรี</option>
                        <option>ราชบุรี</option>
                        <option>ขอนแก่น</option>
                      </select>
                    </Field>
                    <Field label="พื้นที่เพาะปลูกรวม (ไร่)">
                      <TextInput type="number" defaultValue={24.75} step="0.25" />
                    </Field>
                    <Field label="ประเภทการเพาะปลูก">
                      <select className="w-full cursor-pointer rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary">
                        <option>เชิงพาณิชย์ (ส่งตลาดค้าส่ง)</option>
                        <option>เกษตรอินทรีย์ / GAP</option>
                        <option>ปลูกเพื่อบริโภคในครัวเรือน</option>
                      </select>
                    </Field>
                    <Field label="ระบบให้น้ำที่ใช้">
                      <select className="w-full cursor-pointer rounded-full bg-surface-low px-5 py-3 text-body-lg text-on-surface outline-none focus:bg-surface-lowest focus:ring-2 focus:ring-primary">
                        <option>น้ำหยด (Drip irrigation)</option>
                        <option>สปริงเกอร์</option>
                        <option>ร่องน้ำ / ปล่อยตามร่อง</option>
                      </select>
                    </Field>
                    <Field label="เลขทะเบียนเกษตรกร (ทบก.)" className="sm:col-span-2" hint="ใช้ยืนยันสิทธิ์โครงการภาครัฐ">
                      <TextInput defaultValue="72-01-15-0892-14" />
                    </Field>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md bg-mint-mist p-4">
                    <div className="flex items-start gap-2">
                      <Icon name="verified_user" size={20} className="mt-0.5 shrink-0 text-secondary" />
                      <div>
                        <p className="text-label-lg font-bold text-on-surface">ได้รับการรับรองมาตรฐาน GAP</p>
                        <p className="text-caption text-on-surface-variant">
                          ใบรับรองเลขที่ GAP-2568-7721 • หมดอายุ 30 ก.ย. 2570
                        </p>
                      </div>
                    </div>
                    <>
                      <input
                        ref={certInput}
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        onChange={(event) => {
                          if (event.target.files?.[0]) toast.success('อัปโหลดใบรับรอง GAP แล้ว — รอเจ้าหน้าที่ตรวจสอบ');
                          event.target.value = '';
                        }}
                      />
                      <Button variant="ghost" size="sm" onClick={() => certInput.current?.click()}>
                        อัปโหลดใบรับรองใหม่
                      </Button>
                    </>
                  </div>
                </Card>

                <Card>
                  <CardHeader icon="map" title="แปลงที่ลงทะเบียน" subtitle="4 แปลง รวม 24.75 ไร่" />
                  <Link
                    to="/plots"
                    className="flex items-center justify-between gap-3 rounded-md bg-surface-low p-4 transition-colors hover:bg-surface-container"
                  >
                    <span className="flex items-center gap-3">
                      <Icon name="landscape" size={22} className="text-tertiary" />
                      <span className="text-body-lg text-on-surface">จัดการแปลงเพาะปลูกทั้งหมด</span>
                    </span>
                    <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
                  </Link>
                </Card>
              </>
            ) : null}

            {tab === 'privacy' ? (
              <>
                <Card>
                  <CardHeader
                    icon="policy"
                    title="สิทธิ์ความเป็นส่วนตัวของข้อมูล"
                    subtitle="ควบคุมว่าข้อมูลของคุณจะถูกใช้อย่างไร ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)"
                  />
                  <div className="flex flex-col gap-3">
                    <PreferenceRow
                      icon="analytics"
                      title="อนุญาตให้เก็บสถิติการใช้งาน"
                      description="ช่วยให้เราปรับปรุงประสบการณ์การใช้งานให้ดีขึ้น"
                      checked={prefs.analytics}
                      onChange={set('analytics')}
                    />
                    <PreferenceRow
                      icon="model_training"
                      title="ใช้ภาพถ่ายของฉันพัฒนาโมเดล AI"
                      description="ภาพจะถูกลบข้อมูลระบุตัวตนและพิกัดก่อนนำไปใช้ฝึกโมเดลเสมอ"
                      checked={prefs.improveModel}
                      onChange={set('improveModel')}
                    />
                    <PreferenceRow
                      icon="share"
                      title="แชร์ข้อมูลผลผลิตแบบไม่ระบุตัวตน"
                      description="รวมเป็นสถิติภาพรวมของพื้นที่ เพื่อช่วยเกษตรกรรายอื่นวางแผนการปลูก"
                      checked={prefs.shareAnonymised}
                      onChange={set('shareAnonymised')}
                    />
                    <PreferenceRow
                      icon="location_on"
                      title="ใช้พิกัดแปลงสำหรับการเตือนโรคระบาด"
                      description="แจ้งเตือนเมื่อพบการระบาดในรัศมี 10 กม. จากแปลงของคุณ"
                      checked={prefs.locationAlerts}
                      onChange={set('locationAlerts')}
                    />
                    <PreferenceRow
                      icon="campaign"
                      title="รับข่าวสารและโปรโมชัน"
                      description="อีเมลและ SMS เกี่ยวกับฟีเจอร์ใหม่และส่วนลดแพ็กเกจ"
                      checked={prefs.marketing}
                      onChange={set('marketing')}
                    />
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    icon="download"
                    iconTone="secondary"
                    title="สิทธิ์ของเจ้าของข้อมูล"
                    subtitle="คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลของคุณได้ตลอดเวลา"
                  />
                  <div className="flex flex-col gap-3">
                    {[
                      {
                        icon: 'file_download',
                        title: 'ขอสำเนาข้อมูลทั้งหมด',
                        body: 'ดาวน์โหลดข้อมูลบัญชี แปลง ภาพถ่าย และประวัติการวิเคราะห์เป็นไฟล์ JSON',
                        cta: exporting ? 'กำลังเตรียม...' : 'ขอข้อมูล',
                        tone: 'ghost' as const,
                        onClick: handleExport,
                        disabled: exporting,
                      },
                      {
                        icon: 'edit_note',
                        title: 'แจ้งแก้ไขผล AI ที่คลาดเคลื่อน',
                        body: 'หากผลวิเคราะห์โรคหรือความหวานคลาดเคลื่อน แจ้งเพื่อตรวจสอบและปรับปรุงโมเดล',
                        cta: 'แจ้งแก้ไข AI',
                        tone: 'ghost' as const,
                        onClick: () => navigate('/data-dispute'),
                        disabled: false,
                      },
                      {
                        icon: 'gavel',
                        title: 'ยื่นคำร้องขอใช้สิทธิตามกฎหมาย PDPA',
                        body: 'ขอลบข้อมูล ระงับการประมวลผล หรือใช้สิทธิเจ้าของข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล',
                        cta: 'ยื่นคำร้อง',
                        tone: 'ghost' as const,
                        onClick: () => navigate('/privacy/requests'),
                        disabled: false,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-low p-4"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <Icon name={item.icon} size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
                          <div className="min-w-0">
                            <p className="text-label-lg font-semibold text-on-surface">{item.title}</p>
                            <p className="mt-0.5 text-caption text-on-surface-variant">{item.body}</p>
                          </div>
                        </div>
                        <Button
                          variant={item.tone}
                          size="sm"
                          disabled={item.disabled}
                          onClick={() => void item.onClick()}
                        >
                          {item.cta}
                        </Button>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error/30 bg-error-container/40 p-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <Icon name="delete_forever" size={20} className="mt-0.5 shrink-0 text-error" />
                        <div className="min-w-0">
                          <p className="text-label-lg font-semibold text-on-error-container">ลบบัญชีและข้อมูลทั้งหมด</p>
                          <p className="mt-0.5 max-w-[60ch] text-caption text-on-surface-variant">
                            การลบบัญชีไม่สามารถย้อนกลับได้ ข้อมูลแปลง ภาพถ่าย และประวัติทั้งหมดจะถูกลบถาวรภายใน 30 วัน
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteAccount()}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-error px-3 text-label-md font-semibold text-error transition-all duration-150 ease-tactile hover:bg-error hover:text-on-error active:scale-[0.96]"
                      >
                        ลบบัญชี
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            ) : null}

            {tab === 'security' ? (
              <>
                <Card>
                  <CardHeader
                    icon="lock_reset"
                    title="เปลี่ยนรหัสผ่าน"
                    subtitle="แนะนำให้เปลี่ยนรหัสผ่านทุก 6 เดือนเพื่อความปลอดภัยสูงสุด"
                  />
                  <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <Field label="รหัสผ่านปัจจุบัน" required>
                      <TextInput
                        type="password"
                        placeholder="••••••••"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="รหัสผ่านใหม่" required hint="ความยาวอย่างน้อย 8 ตัวอักษร">
                      <TextInput
                        type="password"
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </Field>
                    {newPassword && (
                      <div className="flex flex-col gap-1.5 rounded-lg bg-surface-low p-3">
                        <div className="flex items-center justify-between text-caption">
                          <span className="text-on-surface-variant">ความปลอดภัยของรหัสผ่าน:</span>
                          <span className="font-semibold text-on-surface">
                            {passwordStrengthLabel(scorePassword(newPassword))}
                          </span>
                        </div>
                        <Meter
                          value={scorePassword(newPassword)}
                          max={4}
                          tone={
                            scorePassword(newPassword) < 2
                              ? 'error'
                              : scorePassword(newPassword) < 3
                                ? 'primary'
                                : 'secondary'
                          }
                        />
                      </div>
                    )}
                    <Field label="ยืนยันรหัสผ่านใหม่" required>
                      <TextInput
                        type="password"
                        placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </Field>
                    <div className="mt-2 flex justify-end">
                      <Button type="submit" disabled={changingPass}>
                        <Icon name={changingPass ? 'progress_activity' : 'save'} size={18} className={changingPass ? 'animate-spin' : undefined} />
                        {changingPass ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                      </Button>
                    </div>
                  </form>
                </Card>

                <Card>
                  <CardHeader
                    icon="phonelink_lock"
                    iconTone="secondary"
                    title="การยืนยันตัวตนสองชั้น (2FA)"
                    subtitle="เพิ่มความปลอดภัยอีกขั้นด้วยการรับรหัส OTP ทาง SMS ทุกครั้งที่เข้าสู่ระบบ"
                  />
                  <div className="flex items-center justify-between gap-4 rounded-md bg-surface-low p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-secondary">
                        <Icon name="sms" size={18} />
                      </span>
                      <div>
                        <p className="text-label-lg font-semibold text-on-surface">ยืนยันผ่านเบอร์โทรศัพท์ (SMS OTP)</p>
                        <p className="text-caption text-on-surface-variant">
                          ส่งรหัส 6 หลักไปยัง {user?.phone ? user.phone : '084-592-xxxx'}
                        </p>
                      </div>
                    </div>
                    <Toggle
                      checked={twoFactor}
                      onChange={(next) => {
                        setTwoFactor(next);
                        toast.success(next ? 'เปิดใช้งาน 2FA แล้ว' : 'ปิดใช้งาน 2FA แล้ว');
                      }}
                      label="ยืนยันตัวตนสองชั้น"
                    />
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    icon="devices"
                    title="อุปกรณ์ที่เข้าสู่ระบบอยู่ในขณะนี้"
                    subtitle="เซสชันที่กำลังใช้งานบัญชีของคุณ"
                  />
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-low p-3.5">
                      <div className="flex items-center gap-3">
                        <Icon name="computer" size={24} className="text-primary" />
                        <div>
                          <p className="text-label-md font-semibold text-on-surface">Chrome บน Windows (เครื่องปัจจุบัน)</p>
                          <p className="text-caption text-on-surface-variant">กำลังใช้งานอยู่ • ประเทศไทย</p>
                        </div>
                      </div>
                      <Badge tone="secondary">เซสชันนี้</Badge>
                    </div>
                  </div>
                </Card>
              </>
            ) : null}

            {tab === 'line' ? (
              <>
                <Card>
                  <CardHeader
                    icon="notifications"
                    title="การแจ้งเตือนผ่าน LINE"
                    subtitle="รับข้อมูลด่วน คำเตือนสภาพอากาศ และผลวิเคราะห์โรคผ่าน LINE Official Account"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-secondary/30 bg-mint-mist p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white">
                        <Icon name="chat" size={22} />
                      </div>
                      <div>
                        <p className="text-title-sm font-bold text-on-surface">LINE Official Account</p>
                        <p className="text-caption text-on-surface-variant">
                          {lineConnected ? 'เชื่อมต่อเรียบร้อยแล้ว (@watermelon-ai)' : 'ยังไม่ได้เชื่อมต่อ'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={lineConnected ? 'quiet' : 'primary'}
                      size="sm"
                      onClick={() => {
                        if (lineConnected) {
                          toast.info('ส่งข้อความทดสอบไปยัง LINE เรียบร้อยแล้ว');
                        } else {
                          setLineConnected(true);
                          toast.success('เชื่อมต่อ LINE สำเร็จ');
                        }
                      }}
                    >
                      <Icon name={lineConnected ? 'send' : 'link'} size={16} />
                      {lineConnected ? 'ส่งข้อความทดสอบ' : 'เชื่อมต่อ LINE'}
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    <PreferenceRow
                      icon="cloud"
                      title="แจ้งเตือนสภาพอากาศและฝนตกฉับพลัน"
                      description="เตือนล่วงหน้า 3 ชั่วโมง เมื่อคาดว่าจะมีฝนตกหนักกระทบแปลงแตงโม"
                      checked={lineWeather}
                      onChange={(next) => {
                        setLineWeather(next);
                        toast.success(next ? 'เปิดเตือนสภาพอากาศแล้ว' : 'ปิดเตือนสภาพอากาศแล้ว');
                      }}
                    />
                    <PreferenceRow
                      icon="coronavirus"
                      title="เตือนเฝ้าระวังโรคระบาดในพื้นที่"
                      description="แจ้งเตือนเมื่อพบโรคราน้ำค้างหรือเพลี้ยไฟระบาดในรัศมี 15 กม."
                      checked={lineDisease}
                      onChange={(next) => {
                        setLineDisease(next);
                        toast.success(next ? 'เปิดเตือนโรคระบาดแล้ว' : 'ปิดเตือนโรคระบาดแล้ว');
                      }}
                    />
                    <PreferenceRow
                      icon="trending_up"
                      title="สรุปราคาตลาดแตงโมประจำวัน (07:00 น.)"
                      description="รายงานราคาแตงโม ตลาดไท ตลาดสี่มุมเมือง ทุกเช้า"
                      checked={lineMarket}
                      onChange={(next) => {
                        setLineMarket(next);
                        toast.success(next ? 'เปิดเตือนราคาตลาดแล้ว' : 'ปิดเตือนราคาตลาดแล้ว');
                      }}
                    />
                  </div>
                </Card>
              </>
            ) : null}

            {tab === 'billing' ? (
              <>
                <Card>
                  <CardHeader
                    icon="receipt_long"
                    title="การสมัครสมาชิก &amp; แพ็กเกจ"
                    subtitle="สถานะแพ็กเกจและสิทธิประโยชน์การใช้งานของคุณ"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/5 p-5 border border-primary/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="primary">PRO เกษตรกรดิจิทัล</Badge>
                        <span className="text-caption font-semibold text-secondary">ใช้งานได้ไม่จำกัด</span>
                      </div>
                      <p className="mt-2 text-title-md font-bold text-on-surface">แพ็กเกจรายปี (390 บาท / ปี)</p>
                      <p className="text-caption text-on-surface-variant">ต่ออายุอัตโนมัติในวันที่ 15 กันยายน 2570</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
                      ดูแพ็กเกจทั้งหมด
                    </Button>
                  </div>

                  <div className="mt-5">
                    <p className="text-label-lg font-bold text-on-surface mb-3">สิทธิประโยชน์ที่ได้รับ:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-body-md text-on-surface-variant">
                      <li className="flex items-center gap-2">
                        <Icon name="check_circle" size={18} className="text-secondary" />
                        <span>วิเคราะห์โรคใบด้วย AI ไม่จำกัดจำนวนครั้ง</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon name="check_circle" size={18} className="text-secondary" />
                        <span>ตรวจเสียงเคาะวัดความสุกแตงโมตลอด 24 ชม.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon name="check_circle" size={18} className="text-secondary" />
                        <span>แจ้งเตือนสภาพอากาศและโรคผ่าน LINE</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Icon name="check_circle" size={18} className="text-secondary" />
                        <span>บันทึกแปลงเพาะปลูกได้สูงสุด 20 แปลง</span>
                      </li>
                    </ul>
                  </div>
                </Card>

                <Card>
                  <CardHeader
                    icon="receipt"
                    title="ประวัติการชำระเงิน"
                    subtitle="ดาวน์โหลดใบเสร็จรับเงินสำหรับบัญชีฟาร์ม"
                  />
                  <div className="flex items-center justify-between rounded-md bg-surface-low p-4">
                    <div className="flex items-center gap-3">
                      <Icon name="description" size={22} className="text-on-surface-variant" />
                      <div>
                        <p className="text-label-md font-semibold text-on-surface">ใบเสร็จ #WM-2026-0915</p>
                        <p className="text-caption text-on-surface-variant">15 ก.ย. 2569 • ฿390.00 (พร้อมเพย์)</p>
                      </div>
                    </div>
                    <Button variant="quiet" size="sm" onClick={() => toast.info('ดาวน์โหลดใบเสร็จรับเงินเรียบร้อย')}>
                      <Icon name="download" size={16} />
                      ดาวน์โหลด PDF
                    </Button>
                  </div>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
