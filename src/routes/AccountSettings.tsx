import { useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { Link, useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { api } from '../lib/api';
import { useAuth, useDisplayUser } from '../store/auth';

type Tab = 'profile' | 'farm' | 'privacy';

const TABS: readonly { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: 'person' },
  { id: 'farm', label: 'ข้อมูลแปลงและการเกษตร', icon: 'agriculture' },
  { id: 'privacy', label: 'ความเป็นส่วนตัว (PDPA)', icon: 'policy' },
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
  const [tab, setTab] = useState<Tab>('profile');
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const certInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { navigate } = useRouter();

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
          title="ตั้งค่าบัญชี"
          description="จัดการข้อมูลส่วนตัว ข้อมูลแปลงเพาะปลูก และสิทธิ์ความเป็นส่วนตัวของข้อมูลคุณ"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <nav className="lg:col-span-3" aria-label="หมวดการตั้งค่า">
            <div className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={tab === item.id ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 cursor-pointer items-center gap-2.5 rounded-md px-4 py-3 text-left text-label-lg transition-all duration-150 ease-tactile lg:w-full',
                    tab === item.id
                      ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                  )}
                >
                  <Icon name={item.icon} size={20} />
                  {item.label}
                </button>
              ))}

              <Link
                to="/security"
                className="flex shrink-0 items-center gap-2.5 rounded-md px-4 py-3 text-label-lg text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface lg:w-full"
              >
                <Icon name="lock" size={20} />
                ความปลอดภัยและรหัสผ่าน
              </Link>
              <Link
                to="/alerts"
                className="flex shrink-0 items-center gap-2.5 rounded-md px-4 py-3 text-label-lg text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface lg:w-full"
              >
                <Icon name="notifications" size={20} />
                การแจ้งเตือน LINE
              </Link>
              <Link
                to="/billing"
                className="flex shrink-0 items-center gap-2.5 rounded-md px-4 py-3 text-label-lg text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface lg:w-full"
              >
                <Icon name="receipt_long" size={20} />
                การสมัครสมาชิก
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="mt-2 flex shrink-0 cursor-pointer items-center gap-2.5 rounded-md border-t border-outline-variant/30 px-4 pt-4 pb-3 text-left text-label-lg font-semibold text-error transition-all hover:bg-error-container/30 lg:w-full"
              >
                <Icon name="logout" size={20} className="text-error" />
                ออกจากระบบ
              </button>
            </div>
          </nav>

          <div className="flex flex-col gap-4 lg:col-span-9">
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
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
