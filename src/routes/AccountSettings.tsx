import { useEffect, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { Meter } from '../components/ui/Meter';
import { useRouter } from '../lib/router';
import { cn } from '../lib/cn';
import { api, type AccountSettingsResponse } from '../lib/api';
import { scorePassword, passwordStrengthLabel } from '../lib/calc';
import { useAuth, useDisplayUser } from '../store/auth';

type Tab = 'profile' | 'farm' | 'privacy' | 'security' | 'line';
type EditableProfile = { name: string; organization: string; province: string; plotSize: string };

const TABS: readonly { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'ข้อมูลส่วนตัว', icon: 'person' },
  { id: 'farm', label: 'ข้อมูลแปลงและการเกษตร', icon: 'agriculture' },
  { id: 'privacy', label: 'ความเป็นส่วนตัว (PDPA)', icon: 'policy' },
  { id: 'security', label: 'ความปลอดภัยและรหัสผ่าน', icon: 'lock' },
  { id: 'line', label: 'การแจ้งเตือน LINE', icon: 'notifications' },
];

function profileFields(user: AccountSettingsResponse['user']): EditableProfile {
  return {
    name: user.name ?? '',
    organization: user.organization ?? '',
    province: user.province ?? '',
    plotSize: user.plotSize ?? '',
  };
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <CardHeader icon="info" title={title} subtitle="ยังไม่เปิดให้ใช้งานในระบบนี้" />
      <p role="status" className="text-body-md text-on-surface-variant">{detail}</p>
    </Card>
  );
}

export function AccountSettings({ initialTab = 'profile' }: { initialTab?: Tab }) {
  const { navigate, query } = useRouter();
  const queryTab = query.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(queryTab && TABS.some((item) => item.id === queryTab) ? queryTab : initialTab);
  const [account, setAccount] = useState<AccountSettingsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<EditableProfile>({ name: '', organization: '', province: '', plotSize: '' });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const toast = useToast();
  const user = useAuth((state) => state.user);
  const consent = useAuth((state) => state.consent);
  const refreshAccount = useAuth((state) => state.refreshAccount);
  const saveProfile = useAuth((state) => state.saveProfile);
  const setConsent = useAuth((state) => state.setConsent);
  const signOut = useAuth((state) => state.signOut);
  const display = useDisplayUser();

  useEffect(() => {
    if (!user) {
      setAccount(null);
      return;
    }
    let active = true;
    setLoadError(null);
    void refreshAccount().then((result) => {
      if (!active) return;
      setAccount(result);
      setForm(profileFields(result.user));
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'โหลดการตั้งค่าบัญชีไม่สำเร็จ');
    });
    return () => { active = false; };
  }, [user?.id, refreshAccount]);

  function updateField(key: keyof EditableProfile, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!account) return;
    setSaving(true);
    try {
      const updated = await saveProfile(form);
      setAccount({ ...account, user: updated });
      setForm(profileFields(updated));
      toast.success('บันทึกข้อมูลบัญชีลงระบบแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกข้อมูลบัญชีไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  async function handleModelConsent(next: boolean) {
    setConsentBusy(true);
    try {
      await setConsent({ improveModel: next });
      toast.success(next ? 'บันทึกความยินยอมพัฒนาโมเดลแล้ว' : 'ถอนความยินยอมพัฒนาโมเดลแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'บันทึกความยินยอมไม่สำเร็จ');
    } finally {
      setConsentBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const payload = await api.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermelon-ai-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('เตรียมไฟล์ข้อมูลบัญชีของคุณแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ส่งออกข้อมูลไม่สำเร็จ');
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm('ลบบัญชีและข้อมูลของคุณทันทีหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;
    setDeleting(true);
    try {
      await api.forgetMe({ confirm: true });
      signOut();
      navigate('/');
      toast.success('ลบบัญชีและข้อมูลในระบบแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ลบบัญชีไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8 || newPassword.length > 128) {
      toast.error('รหัสผ่านใหม่ต้องยาว 8–128 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านยืนยันไม่ตรงกัน');
      return;
    }
    setChangingPass(true);
    try {
      await api.changePassword({ currentPassword: oldPassword, newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      signOut();
      navigate('/signin');
      toast.success('เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={<Badge tone="secondary"><Icon name="manage_accounts" size={14} />การตั้งค่าบัญชี</Badge>}
          title="ตั้งค่าบัญชี & ระบบ"
          description="ข้อมูลบัญชีที่บันทึกจริง ความยินยอม และความปลอดภัยของคุณ"
        />

        {!user ? (
          <Card>
            <CardHeader icon="login" title="กรุณาเข้าสู่ระบบ" subtitle="การตั้งค่าบัญชีต้องใช้เซสชันที่ยืนยันกับเซิร์ฟเวอร์" />
            <Button onClick={() => navigate('/signin')}>เข้าสู่ระบบ</Button>
          </Card>
        ) : loadError ? (
          <Card>
            <CardHeader icon="error" title="โหลดข้อมูลบัญชีไม่สำเร็จ" subtitle={loadError} />
            <Button onClick={() => {
              setLoadError(null);
              void refreshAccount().then((result) => {
                setAccount(result);
                setForm(profileFields(result.user));
              }).catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ'));
            }}>ลองใหม่</Button>
          </Card>
        ) : !account ? (
          <p role="status" className="text-body-md text-on-surface-variant">กำลังโหลดข้อมูลบัญชีจากเซิร์ฟเวอร์...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <nav className="lg:col-span-4 xl:col-span-3.5" aria-label="หมวดการตั้งค่า">
              <div className="rounded-3xl bg-surface-lowest p-3 border border-outline-variant/20 shadow-sm flex flex-col gap-1.5">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={tab === item.id ? 'page' : undefined}
                    className={cn('flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-body-lg font-semibold transition-all duration-150 cursor-pointer', tab === item.id ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface hover:bg-surface-container')}
                  >
                    <Icon name={item.icon} size={22} />{item.label}
                  </button>
                ))}
                <div className="my-1.5 border-t border-outline-variant/20" />
                <button type="button" onClick={() => { signOut(); navigate('/'); }} className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left text-body-lg font-semibold text-error hover:bg-error-container/20 transition-all duration-150 cursor-pointer">
                  <Icon name="logout" size={22} />ออกจากระบบ
                </button>
              </div>
            </nav>

            <div className="flex flex-col gap-4 lg:col-span-8 xl:col-span-8.5">
              {tab === 'profile' && (
                <>
                  <Card>
                    <CardHeader icon="badge" title="โปรไฟล์ผู้ใช้งาน" subtitle="อ่านจากบัญชีของคุณและบันทึกกลับเซิร์ฟเวอร์" />
                    <div className="mb-5 flex items-center gap-4">
                      <span className="flex size-16 items-center justify-center rounded-full bg-secondary-fixed text-display-sm font-bold text-on-secondary-fixed-variant">{display.initial}</span>
                      <div><p className="text-title-md font-bold text-on-surface">{account.user.name}</p><p className="text-caption text-on-surface-variant">{display.role}</p></div>
                    </div>
                    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                      <Field label="ชื่อที่แสดงในบัญชี" required><TextInput value={form.name} onChange={(event) => updateField('name', event.target.value)} required maxLength={120} /></Field>
                      <Field label="ชื่อสวน / กิจการ"><TextInput value={form.organization} onChange={(event) => updateField('organization', event.target.value)} maxLength={120} /></Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="เบอร์โทรศัพท์" hint="การเปลี่ยนเบอร์ต้องยืนยันตัวตนเพิ่มเติม"><TextInput value={account.user.phone ?? 'ยังไม่ได้ระบุ'} readOnly /></Field>
                        <Field label="อีเมล" hint="การเปลี่ยนอีเมลยังไม่เปิดให้ใช้งาน"><TextInput value={account.user.email ?? 'ยังไม่ได้ระบุ'} readOnly /></Field>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="quiet" onClick={() => setForm(profileFields(account.user))}>ยกเลิกการแก้ไข</Button>
                        <Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}</Button>
                      </div>
                    </form>
                  </Card>
                  <Unavailable title="ภาษาและหน่วยแสดงผล" detail="ขณะนี้หน้าเว็บรองรับภาษาไทยและหน่วยไร่ การสลับภาษา/หน่วยทั่วระบบยังไม่เปิดใช้งาน จึงไม่บันทึกตัวเลือกที่ไม่มีผลจริง" />
                </>
              )}

              {tab === 'farm' && (
                <>
                  <Card>
                    <CardHeader icon="agriculture" title="ข้อมูลแปลงหลัก" subtitle="บันทึกจังหวัดและพื้นที่ที่คุณระบุเอง ไม่สร้างเลขทะเบียนหรือใบรับรอง" />
                    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                      <Field label="จังหวัดที่ตั้งแปลงหลัก"><TextInput value={form.province} onChange={(event) => updateField('province', event.target.value)} maxLength={80} placeholder="เช่น สุพรรณบุรี" /></Field>
                      <Field label="พื้นที่เพาะปลูกรวม (ไร่)"><TextInput type="number" value={form.plotSize} onChange={(event) => updateField('plotSize', event.target.value)} min="0.01" max="100000" step="0.01" placeholder="กรอกพื้นที่ที่วัดจริง" /></Field>
                      <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลแปลงหลัก'}</Button></div>
                    </form>
                  </Card>
                  <Card><CardHeader icon="map" title="แปลงที่ลงทะเบียน" subtitle="จัดการรายการแปลงในหน้าข้อมูลแปลง" /><Button variant="ghost" onClick={() => navigate('/plots')}>ไปหน้าจัดการแปลง</Button></Card>
                </>
              )}

              {tab === 'privacy' && (
                <>
                  <Card>
                    <CardHeader icon="policy" title="ความยินยอมพัฒนาโมเดล AI" subtitle="ค่าจริงที่บันทึกในบัญชีและใช้ตัดสินใจรับภาพเข้าชุดพัฒนาโมเดล" />
                    <div className="flex items-center justify-between gap-4 rounded-md bg-surface-low p-4">
                      <div><p className="text-label-lg font-semibold text-on-surface">อนุญาตใช้ภาพที่ฉันส่งเพื่อพัฒนาโมเดล</p><p className="text-caption text-on-surface-variant">ค่าเริ่มต้นคือไม่ยินยอม เปลี่ยนแล้วต้องบันทึกกับเซิร์ฟเวอร์สำเร็จจึงมีผล</p></div>
                      <button type="button" role="switch" aria-label="ยินยอมใช้ภาพพัฒนาโมเดล" aria-checked={consent.improveModel} disabled={consentBusy} onClick={() => void handleModelConsent(!consent.improveModel)} className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', consent.improveModel ? 'bg-secondary' : 'bg-surface-highest')}>
                        <span className={cn('absolute top-1 size-5 rounded-full bg-surface-lowest shadow-sm', consent.improveModel ? 'left-6' : 'left-1')} />
                      </button>
                    </div>
                    <p className="mt-3 text-caption text-on-surface-variant">การติดตามสถิติ การตลาด การแชร์ผลผลิต และการแจ้งเตือนตามพิกัดยังไม่มีบริการที่เชื่อมกับตัวเลือกในหน้านี้ จึงไม่เปิดสวิตช์ที่ดูเหมือนมีผล</p>
                  </Card>
                  <Card>
                    <CardHeader icon="download" title="ข้อมูลและสิทธิของเจ้าของข้อมูล" subtitle="ส่งออกข้อมูลบัญชีของคุณ หรือขอลบข้อมูลจากระบบ" />
                    <div className="flex flex-wrap gap-3"><Button variant="ghost" disabled={exporting} onClick={() => void handleExport()}>{exporting ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลดข้อมูลของฉัน (JSON)'}</Button><Button variant="quiet" onClick={() => navigate('/privacy/requests')}>ยื่นคำร้อง PDPA</Button></div>
                    <div className="mt-5 border-t border-outline-variant/30 pt-5"><p className="mb-3 text-body-md text-error">ลบบัญชีและข้อมูลที่ผูกกับบัญชีทันที ย้อนกลับไม่ได้</p><Button variant="quiet" disabled={deleting} onClick={() => void handleDeleteAccount()}>{deleting ? 'กำลังลบ...' : 'ลบบัญชีของฉัน'}</Button></div>
                  </Card>
                </>
              )}

              {tab === 'security' && (
                <>
                  {account.capabilities.passwordChange ? (
                    <Card>
                      <CardHeader icon="lock_reset" title="เปลี่ยนรหัสผ่าน" subtitle="ยืนยันรหัสผ่านปัจจุบันก่อนเปลี่ยน และออกจากทุกเซสชันหลังสำเร็จ" />
                      <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                        <Field label="รหัสผ่านปัจจุบัน" required><TextInput type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required autoComplete="current-password" /></Field>
                        <Field label="รหัสผ่านใหม่" required hint="8–128 ตัวอักษร"><TextInput type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" minLength={8} maxLength={128} /></Field>
                        {newPassword && <div className="rounded-lg bg-surface-low p-3"><p className="mb-2 text-caption text-on-surface-variant">ความแข็งแรง: {passwordStrengthLabel(scorePassword(newPassword))}</p><Meter value={(scorePassword(newPassword) / 4) * 100} tone={scorePassword(newPassword) < 3 ? 'primary' : 'secondary'} /></div>}
                        <Field label="ยืนยันรหัสผ่านใหม่" required><TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" /></Field>
                        <div className="flex justify-end"><Button type="submit" disabled={changingPass}>{changingPass ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}</Button></div>
                      </form>
                    </Card>
                  ) : <Unavailable title="บัญชีนี้ไม่มีรหัสผ่าน" detail="บัญชีที่เข้าด้วย OTP หรือผู้ให้บริการภายนอกยังตั้งรหัสผ่านจากหน้านี้ไม่ได้ ต้องมีขั้นตอนยืนยันตัวตนเพิ่มเติม" />}
                  <Unavailable title="การยืนยันสองชั้นและเซสชันอื่น" detail="ระบบยังไม่รองรับการเปิด/ปิด 2FA หรือแสดงอุปกรณ์อื่นอย่างยืนยันได้ จึงไม่แสดงสถานะสมมติ เจ้าหน้าที่จะไม่ขอ OTP จากคุณ" />
                </>
              )}

              {tab === 'line' && <Unavailable title="การแจ้งเตือนผ่าน LINE" detail="ยังไม่มีการเชื่อม LINE Official Account กับบัญชีนี้ ไม่มีการส่งข้อความทดสอบหรือแจ้งเตือนอัตโนมัติในขณะนี้" />}
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
