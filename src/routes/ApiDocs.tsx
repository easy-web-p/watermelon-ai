import { useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { Link } from '../lib/router';
import { cn } from '../lib/cn';
import { copyText } from '../lib/export';
import { API_BASE } from '../lib/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type Endpoint = {
  method: Method;
  path: string;
  summary: string;
  body?: string;
  returns: string;
};

type Group = { name: string; icon: string; blurb: string; endpoints: readonly Endpoint[] };

/** Mirrors the routes actually implemented in server.ts. */
const GROUPS: readonly Group[] = [
  {
    name: 'สถานะระบบ',
    icon: 'monitor_heart',
    blurb: 'ตรวจสอบว่าบริการพร้อมใช้งาน — ใช้กับ uptime monitor ได้',
    endpoints: [
      { method: 'GET', path: '/health', summary: 'สถานะและ uptime ของบริการ', returns: '{ status, service, uptimeSeconds, environment }' },
    ],
  },
  {
    name: 'วินิจฉัยโรคด้วยภาพ',
    icon: 'coronavirus',
    blurb: 'ส่งภาพใบหรือลำต้น รับผลวินิจฉัยพร้อมแผนการรักษา',
    endpoints: [
      {
        method: 'POST',
        path: '/watermelon/disease-detect',
        summary: 'วินิจฉัยโรคจากภาพถ่าย',
        body: '{ imageBase64: string, farmId?: string, notes?: string }',
        returns: '{ thai_name, scientific_name, severity_level, confidence_percentage, chemical_control[], organic_control[], prevention[], urgent_action }',
      },
      { method: 'GET', path: '/watermelon/disease-catalog', summary: 'รายการโรคทั้งหมดที่โมเดลรองรับ', returns: '{ success, count, diseases[] }' },
      { method: 'GET', path: '/watermelon/disease-history', summary: 'ประวัติการวินิจฉัยย้อนหลัง', returns: '{ success, count, records[] }' },
    ],
  },
  {
    name: 'วิเคราะห์เสียงเคาะ',
    icon: 'graphic_eq',
    // Documented as 503 because that is what they return: there is no
    // acoustic or speech model deployed, and the endpoints refuse rather
    // than return a plausible-looking frequency and Brix figure.
    blurb: 'ยังไม่พร้อมใช้งาน — ยังไม่มีโมเดลวิเคราะห์คลื่นเสียงในระบบ',
    endpoints: [
      { method: 'GET', path: '/watermelon/acoustic-model', summary: 'ตรวจสถานะโมเดลเสียง (เรียกก่อนเปิดปุ่มไมโครโฟน)', returns: '503 { success: false, online: false, error, code }' },
      { method: 'POST', path: '/audio/knock-analysis', summary: 'วิเคราะห์คลื่นเสียงเคาะผล (ยังไม่พร้อมใช้งาน)', body: '{ fileData: string }', returns: '503 { error, code: "ACOUSTIC_SERVICE_UNAVAILABLE" }' },
      { method: 'POST', path: '/audio/transcriptions', summary: 'ถอดข้อความจากเสียงพูด (ยังไม่พร้อมใช้งาน)', body: '{ fileData: string }', returns: '503 { error, code: "TRANSCRIPTION_SERVICE_UNAVAILABLE" }' },
      { method: 'GET', path: '/varieties', summary: 'เกณฑ์คลื่นเสียงรายสายพันธุ์', returns: 'ApiVariety[] { minRipeHz, maxRipeHz, targetBrix }' },
    ],
  },
  {
    name: 'แชทปรึกษา',
    icon: 'forum',
    blurb: 'สร้างบทสนทนาและส่งคำถามเข้าโมเดล',
    endpoints: [
      { method: 'GET', path: '/conversations', summary: 'รายการบทสนทนาของผู้ใช้', returns: 'ApiConversation[]' },
      { method: 'POST', path: '/conversations', summary: 'สร้างบทสนทนาใหม่', body: '{ title?, chatMode? }', returns: 'ApiConversation' },
      { method: 'GET', path: '/conversations/:id/messages', summary: 'ข้อความทั้งหมดในบทสนทนา', returns: 'ApiMessage[]' },
      { method: 'POST', path: '/conversations/:id/messages', summary: 'ส่งข้อความและรับคำตอบ', body: '{ content, mode, allow_training? }', returns: 'ApiMessage' },
      { method: 'DELETE', path: '/conversations/:id', summary: 'ลบบทสนทนา', returns: '{ success }' },
    ],
  },
  {
    name: 'ยืนยันตัวตน',
    icon: 'lock',
    blurb: 'OTP ทาง SMS และการเข้าสู่ระบบผ่านผู้ให้บริการภายนอก',
    endpoints: [
      { method: 'POST', path: '/auth/login', summary: 'เข้าสู่ระบบด้วยเบอร์/อีเมล และรหัสผ่าน', body: '{ identifier, password }', returns: '{ success, user, token }' },
      { method: 'POST', path: '/auth/register', summary: 'สมัครสมาชิกเกษตรกรใหม่', body: '{ name, phone, password?, province?, cultivar? }', returns: '{ success, user, token }' },
      { method: 'POST', path: '/auth/otp/send', summary: 'ขอรหัส OTP (หมดอายุ 5 นาที)', body: '{ phone }', returns: '{ sessionToken, message, demoCode? }' },
      { method: 'POST', path: '/auth/otp/verify', summary: 'ยืนยันรหัส OTP (ลองได้ 5 ครั้ง)', body: '{ sessionToken, code, phone }', returns: '{ user, token }' },
      { method: 'POST', path: '/auth/social', summary: 'เข้าสู่ระบบผ่าน Google / LINE Official', body: '{ provider, email?, name? }', returns: '{ user, token }' },
      { method: 'GET', path: '/auth/me', summary: 'ตรวจสอบข้อมูลผู้ใช้ปัจจุบันจาก JWT Token', returns: '{ success, user, payload }' },
    ],
  },
  {
    name: 'ไฟล์และพื้นที่จัดเก็บ',
    icon: 'cloud_upload',
    blurb: 'อัปโหลดภาพและเสียง พร้อม signed URL แบบมีอายุ',
    endpoints: [
      { method: 'POST', path: '/files', summary: 'อัปโหลดไฟล์ (base64)', body: '{ name, mimeType, fileData }', returns: 'ApiAttachment { id, url }' },
      { method: 'POST', path: '/storage/signed-url', summary: 'ขอ URL ที่เซ็น HMAC พร้อมอายุ', body: '{ filename, operation, expiresInSec }', returns: '{ url, token, expiresAt }' },
    ],
  },
  {
    name: 'PDPA',
    icon: 'policy',
    blurb: 'สิทธิ์ของเจ้าของข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล',
    endpoints: [
      { method: 'PATCH', path: '/users/me/consent', summary: 'อัปเดตความยินยอม', body: '{ analytics, improveModel, ... }', returns: 'consent object' },
      { method: 'GET', path: '/pdpa/export-my-data', summary: 'ขอสำเนาข้อมูลทั้งหมด (ม.30)', returns: 'ข้อมูลผู้ใช้ทั้งหมดเป็น JSON' },
      { method: 'POST', path: '/pdpa/forget-me', summary: 'ขอลบข้อมูล (ม.33)', body: '{ confirm: true }', returns: '{ success }' },
      { method: 'POST', path: '/feedback/reports', summary: 'แจ้งข้อมูลคลาดเคลื่อน (ม.35)', body: '{ category, description, ... }', returns: '{ reportId }' },
    ],
  },
];

const METHOD_TONE: Record<Method, string> = {
  GET: 'bg-secondary-container text-on-secondary-fixed-variant',
  POST: 'bg-primary-fixed text-on-primary-fixed-variant',
  PATCH: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  DELETE: 'bg-error-container text-on-error-container',
};

const CURL_EXAMPLE = `curl -X POST "https://api.watermelon.ai/api/v1/watermelon/disease-detect" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -d '{
    "imageBase64": "data:image/jpeg;base64,...",
    "farmId": "plot-01",
    "notes": "ใบล่างมีจุดน้ำตาล"
  }'`;

export function ApiDocs() {
  const [openGroup, setOpenGroup] = useState<string | null>(GROUPS[1].name);
  const toast = useToast();

  const total = GROUPS.reduce((sum, group) => sum + group.endpoints.length, 0);

  async function copy(text: string, what: string) {
    const ok = await copyText(text);
    if (ok) toast.success(`คัดลอก${what}แล้ว`);
    else toast.error('คัดลอกไม่สำเร็จ');
  }

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 -right-20 size-96 rounded-full bg-secondary-container/50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <Badge tone="secondary">
            <Icon name="api" size={14} />
            REST API v1
          </Badge>
          <h1 className="mt-3 max-w-3xl text-headline-lg text-on-surface lg:text-display-lg">
            เอกสารเชื่อมต่อ API สำหรับสหกรณ์และนักพัฒนา
          </h1>
          <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
            เชื่อมระบบของคุณเข้ากับโมเดลวินิจฉัยโรคและวิเคราะห์ความหวานของ Watermelon AI
            ใช้ได้กับแพ็กเกจวิสาหกิจชุมชนขึ้นไป
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge tone="outline">
              <Icon name="link" size={13} />
              Base URL: <code className="font-mono">{API_BASE || '/api/v1'}</code>
            </Badge>
            <Badge tone="outline">{total} endpoints</Badge>
            <Badge tone="outline">JSON over HTTPS</Badge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <h2 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
              <Icon name="key" size={20} className="text-primary" />
              การยืนยันตัวตน
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              ทุกคำขอต้องแนบ token ที่ได้จาก <code className="font-mono text-caption">/auth/otp/verify</code>
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-inverse-surface p-3 text-caption text-inverse-on-surface">
              <code>{'Authorization: Bearer <token>\nx-user-id: <user id>'}</code>
            </pre>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
              <Icon name="speed" size={20} className="text-secondary" />
              ข้อจำกัดการใช้งาน
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-body-md text-on-surface-variant">
              <li className="flex items-start gap-2">
                <Icon name="check_circle" size={15} className="mt-1 text-secondary" />
                ขนาดภาพสูงสุด 10 MB ต่อคำขอ
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check_circle" size={15} className="mt-1 text-secondary" />
                แนะนำย่อภาพให้ด้านยาวไม่เกิน 1600px
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check_circle" size={15} className="mt-1 text-secondary" />
                timeout ฝั่งเซิร์ฟเวอร์ 60 วินาที
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
              <Icon name="error" size={20} className="text-primary" />
              รูปแบบข้อผิดพลาด
            </h2>
            <p className="mt-2 text-body-md text-on-surface-variant">
              ทุก error คืน JSON ที่มี field <code className="font-mono text-caption">error</code> เป็นภาษาไทย
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-inverse-surface p-3 text-caption text-inverse-on-surface">
              <code>{'{\n  "error": "ไม่พบรายการ"\n}'}</code>
            </pre>
            <Link to="/status/400" className="mt-3 inline-flex items-center gap-1 text-label-md font-semibold text-primary hover:underline">
              ดูรหัสสถานะทั้งหมด
              <Icon name="arrow_forward" size={14} />
            </Link>
          </Card>
        </div>

        <Card className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-title-md font-bold text-on-surface">
              <Icon name="terminal" size={20} className="text-on-surface-variant" />
              ตัวอย่างการเรียกใช้
            </h2>
            <Button variant="quiet" size="sm" onClick={() => void copy(CURL_EXAMPLE, 'ตัวอย่างคำสั่ง')}>
              <Icon name="content_copy" size={16} />
              คัดลอก
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-md bg-inverse-surface p-4 text-caption leading-relaxed text-inverse-on-surface">
            <code>{CURL_EXAMPLE}</code>
          </pre>
        </Card>

        <h2 className="mt-8 mb-4 text-headline-sm font-bold text-on-surface">รายการ Endpoint</h2>

        <div className="flex flex-col gap-3">
          {GROUPS.map((group) => {
            const open = openGroup === group.name;
            return (
              <Card key={group.name} className="p-0">
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : group.name)}
                  aria-expanded={open}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-low text-on-surface-variant">
                      <Icon name={group.icon} size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-title-md font-bold text-on-surface">{group.name}</span>
                      <span className="block text-caption text-on-surface-variant">{group.blurb}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone="outline">{group.endpoints.length}</Badge>
                    <Icon
                      name="expand_more"
                      size={20}
                      className={cn('text-on-surface-variant transition-transform', open && 'rotate-180')}
                    />
                  </span>
                </button>

                {open ? (
                  <div className="flex flex-col gap-2 border-t border-outline-variant/30 p-5">
                    {group.endpoints.map((endpoint) => (
                      <div key={endpoint.method + endpoint.path} className="rounded-md bg-surface-low p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded px-2 py-0.5 font-mono text-caption font-bold',
                              METHOD_TONE[endpoint.method],
                            )}
                          >
                            {endpoint.method}
                          </span>
                          <code className="font-mono text-body-md font-semibold text-on-surface">{endpoint.path}</code>
                          <button
                            type="button"
                            aria-label={`คัดลอกเส้นทาง ${endpoint.path}`}
                            onClick={() => void copy(`${API_BASE || '/api/v1'}${endpoint.path}`, 'เส้นทาง')}
                            className="cursor-pointer rounded-full p-1 text-outline transition-colors hover:text-primary"
                          >
                            <Icon name="content_copy" size={14} />
                          </button>
                        </div>

                        <p className="mt-2 text-body-md text-on-surface-variant">{endpoint.summary}</p>

                        {endpoint.body ? (
                          <p className="mt-2 text-caption text-on-surface-variant">
                            <span className="font-semibold">Body:</span>{' '}
                            <code className="font-mono">{endpoint.body}</code>
                          </p>
                        ) : null}
                        <p className="mt-1 text-caption text-on-surface-variant">
                          <span className="font-semibold">Returns:</span>{' '}
                          <code className="font-mono">{endpoint.returns}</code>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 border-l-4 border-primary bg-melon-tint">
          <div className="flex items-start gap-3">
            <Icon name="info" size={22} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <h2 className="text-title-md font-bold text-on-surface">ยังไม่รองรับการรับข้อมูลจากเซนเซอร์ IoT</h2>
              <p className="mt-1 max-w-[75ch] text-body-md text-on-surface-variant">
                ขณะนี้ API รองรับการส่งภาพ เสียง และข้อความเท่านั้น ยังไม่มี endpoint สำหรับรับค่าจากเซนเซอร์ความชื้น
                อุณหภูมิ หรือสถานีตรวจอากาศโดยตรง หากคุณต้องการเชื่อมต่อเซนเซอร์ ติดต่อทีมงานเพื่อหารือแนวทาง
              </p>
              <Link
                to="/support"
                className="mt-3 inline-flex items-center gap-1.5 text-label-lg font-semibold text-primary hover:underline"
              >
                ติดต่อทีมพัฒนา
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </MarketingShell>
  );
}
