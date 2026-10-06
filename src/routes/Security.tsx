import { useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Field, TextInput } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { Meter } from '../components/ui/Meter';
import { cn } from '../lib/cn';
import { MIN_PASSWORD_SCORE, passwordStrengthLabel, scorePassword } from '../lib/calc';

const SESSIONS = [
  {
    device: 'Chrome บน Windows 11',
    location: 'สุพรรณบุรี, ประเทศไทย',
    ip: '171.96.xxx.xxx',
    time: 'กำลังใช้งานอยู่',
    current: true,
    icon: 'computer',
  },
  {
    device: 'Watermelon AI บน Android',
    location: 'สุพรรณบุรี, ประเทศไทย',
    ip: '49.228.xxx.xxx',
    time: 'ใช้งานล่าสุด 3 ชั่วโมงที่แล้ว',
    current: false,
    icon: 'smartphone',
  },
  {
    device: 'Safari บน iPad',
    location: 'กาญจนบุรี, ประเทศไทย',
    ip: '184.22.xxx.xxx',
    time: 'ใช้งานล่าสุด 6 วันที่แล้ว',
    current: false,
    icon: 'tablet_mac',
  },
];

const ACTIVITY = [
  { icon: 'login', text: 'เข้าสู่ระบบสำเร็จจาก Chrome บน Windows', time: 'วันนี้ 09:14 น.', tone: 'text-secondary' },
  { icon: 'lock_reset', text: 'เปลี่ยนรหัสผ่านบัญชี', time: '12 ก.ย. 2569 14:22 น.', tone: 'text-on-surface-variant' },
  { icon: 'phonelink_lock', text: 'เปิดใช้งานการยืนยันตัวตนสองชั้น (2FA)', time: '12 ก.ย. 2569 14:18 น.', tone: 'text-secondary' },
  { icon: 'warning', text: 'พยายามเข้าสู่ระบบล้มเหลว 3 ครั้งจาก IP ที่ไม่รู้จัก', time: '28 ส.ค. 2569 02:41 น.', tone: 'text-error' },
];

export function Security() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessions, setSessions] = useState(SESSIONS);
  const toast = useToast();

  const strength = scorePassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <Badge tone="secondary">
              <Icon name="shield_person" size={14} />
              Watermelon AI Identity Guard
            </Badge>
          }
          title="ความปลอดภัยและรหัสผ่าน"
          description="จัดการรหัสผ่าน การยืนยันตัวตนสองชั้น และอุปกรณ์ที่เข้าสู่ระบบบัญชีของคุณ"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <Card>
              <CardHeader
                icon="lock_reset"
                title="เปลี่ยนรหัสผ่าน"
                subtitle="แนะนำให้เปลี่ยนรหัสผ่านทุก 6 เดือนเพื่อความปลอดภัย"
              />
              <form
                className="flex flex-col gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!password || mismatch || strength < MIN_PASSWORD_SCORE) return;
                  toast.success('บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว');
                  setPassword('');
                  setConfirm('');
                }}
              >
                <Field label="รหัสผ่านปัจจุบัน" required>
                  <TextInput type="password" autoComplete="current-password" placeholder="••••••••" />
                </Field>

                <Field label="รหัสผ่านใหม่" required>
                  <TextInput
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                  />
                </Field>

                {password ? (
                  <div className="-mt-2">
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-on-surface-variant">ความแข็งแรงของรหัสผ่าน</span>
                      <span
                        className={cn(
                          'font-bold',
                          strength < 35 ? 'text-error' : strength < 65 ? 'text-primary' : 'text-secondary',
                        )}
                      >
                        {passwordStrengthLabel(strength)}
                      </span>
                    </div>
                    <Meter
                      value={strength}
                      tone={strength < 65 ? 'primary' : 'secondary'}
                      className="mt-1.5 h-1.5"
                      label="ความแข็งแรงของรหัสผ่าน"
                    />
                  </div>
                ) : null}

                <Field label="ยืนยันรหัสผ่านใหม่" required error={mismatch ? 'รหัสผ่านไม่ตรงกัน' : undefined}>
                  <TextInput
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  />
                </Field>

                <ul className="flex flex-col gap-1.5 rounded-md bg-surface-low p-4">
                  {[
                    { label: 'ความยาวอย่างน้อย 8 ตัวอักษร', ok: password.length >= 8 },
                    { label: 'มีตัวพิมพ์ใหญ่และตัวพิมพ์เล็ก', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
                    { label: 'มีตัวเลขอย่างน้อย 1 ตัว', ok: /[0-9]/.test(password) },
                    { label: 'มีสัญลักษณ์พิเศษ เช่น ! @ # $', ok: /[^A-Za-z0-9]/.test(password) },
                  ].map((rule) => (
                    <li key={rule.label} className="flex items-center gap-2 text-body-md">
                      <Icon
                        name={rule.ok ? 'check_circle' : 'radio_button_unchecked'}
                        size={16}
                        className={rule.ok ? 'text-secondary' : 'text-outline/60'}
                      />
                      <span className={rule.ok ? 'text-on-surface' : 'text-on-surface-variant'}>{rule.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="quiet"
                    size="md"
                    onClick={() => {
                      setPassword('');
                      setConfirm('');
                    }}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="submit" size="md" disabled={!password || mismatch || strength < MIN_PASSWORD_SCORE}>
                    <Icon name="save" size={18} />
                    บันทึกรหัสผ่านใหม่
                  </Button>
                </div>
              </form>
            </Card>

            <Card>
              <CardHeader
                icon="phonelink_lock"
                iconTone="secondary"
                title="การยืนยันตัวตนสองชั้น (2FA)"
                subtitle="เพิ่มความปลอดภัยด้วยรหัส OTP ทุกครั้งที่เข้าสู่ระบบจากอุปกรณ์ใหม่"
                action={<Badge tone={twoFactor ? 'secondary' : 'neutral'}>{twoFactor ? 'เปิดใช้งาน' : 'ปิดอยู่'}</Badge>}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md bg-mint-mist p-4">
                <div className="flex items-start gap-3">
                  <Icon name="sms" size={22} className="mt-0.5 shrink-0 text-secondary" />
                  <div>
                    <p className="text-label-lg font-semibold text-on-surface">ยืนยันผ่าน SMS</p>
                    <p className="mt-0.5 text-caption text-on-surface-variant">
                      ส่งรหัส OTP 6 หลักไปที่ 084-592-8190
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={twoFactor}
                  aria-label="การยืนยันตัวตนสองชั้น"
                  onClick={() => setTwoFactor((value) => !value)}
                  className={cn(
                    'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                    twoFactor ? 'bg-secondary' : 'bg-surface-highest',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 size-5 rounded-full bg-surface-lowest shadow-sm transition-all duration-200 ease-tactile',
                      twoFactor ? 'left-6' : 'left-1',
                    )}
                  />
                </button>
              </div>

              {twoFactor ? (
                <div className="mt-3 flex items-start gap-2 rounded-md bg-surface-low p-4">
                  <Icon name="info" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
                  <p className="text-caption text-on-surface-variant">
                    เจ้าหน้าที่ Watermelon AI จะไม่ขอรหัส OTP จากคุณทางโทรศัพท์หรือข้อความเด็ดขาด
                    หากมีผู้แอบอ้าง กรุณาวางสายและแจ้งเราทันทีที่ 02-123-4567
                  </p>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card>
              <CardHeader
                icon="devices"
                iconTone="tertiary"
                title="อุปกรณ์ที่เข้าสู่ระบบ"
                subtitle={`${sessions.length} อุปกรณ์ที่ใช้งานบัญชีนี้`}
              />
              <div className="flex flex-col gap-3">
                {sessions.map((session) => (
                  <div
                    key={session.device}
                    className={cn(
                      'flex items-start justify-between gap-3 rounded-md p-4',
                      session.current ? 'bg-mint-mist' : 'bg-surface-low',
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-lowest text-on-surface-variant">
                        <Icon name={session.icon} size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-label-lg font-semibold text-on-surface">
                          {session.device}
                          {session.current ? <Badge tone="secondary">อุปกรณ์นี้</Badge> : null}
                        </p>
                        <p className="mt-0.5 text-caption text-on-surface-variant">
                          {session.location} • {session.ip}
                        </p>
                        <p className={cn('text-caption', session.current ? 'text-secondary' : 'text-on-surface-variant')}>
                          {session.time}
                        </p>
                      </div>
                    </div>
                    {!session.current ? (
                      <button
                        type="button"
                        aria-label={`ออกจากระบบ ${session.device}`}
                        onClick={() => {
                          setSessions((prev) => prev.filter((item) => item.device !== session.device));
                          toast.success(`ออกจากระบบ ${session.device} แล้ว`);
                        }}
                        className="shrink-0 cursor-pointer rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
                      >
                        <Icon name="logout" size={18} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="md"
                className="mt-4 w-full"
                disabled={sessions.length <= 1}
                onClick={() => {
                  const removed = sessions.length - 1;
                  setSessions((prev) => prev.filter((item) => item.current));
                  toast.success(`ออกจากระบบ ${removed} อุปกรณ์เรียบร้อยแล้ว`);
                }}
              >
                <Icon name="logout" size={18} />
                ออกจากระบบทุกอุปกรณ์อื่น
              </Button>
            </Card>

            <Card>
              <CardHeader icon="history" title="กิจกรรมด้านความปลอดภัยล่าสุด" />
              <ol className="flex flex-col gap-3">
                {ACTIVITY.map((item) => (
                  <li key={item.text} className="flex items-start gap-3">
                    <Icon name={item.icon} size={18} className={cn('mt-0.5 shrink-0', item.tone)} />
                    <div className="min-w-0">
                      <p className="text-body-md text-on-surface">{item.text}</p>
                      <p className="text-caption text-on-surface-variant">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
