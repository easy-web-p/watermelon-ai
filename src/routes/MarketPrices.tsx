import { useRef, useState } from 'react';
import { AppShell, PageContainer, PageHeading } from '../components/layout/AppShell';
import { Card, CardHeader } from '../components/ui/Card';
import { StatTile } from '../components/ui/StatTile';
import { Badge, LiveBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { Segmented } from '../components/ui/Segmented';
import { LineChart } from '../components/ui/LineChart';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { printElement } from '../lib/export';
import { MARKET_ROWS, PRICE_DAYS, PRICE_SERIES } from '../data/market';

type Range = '7' | '15' | '30' | '90';

const RANGES = [
  { value: '7', label: '7 วัน' },
  { value: '15', label: '15 วัน' },
  { value: '30', label: '1 เดือน' },
  { value: '90', label: '3 เดือน' },
] as const;

const TREND_TONE = {
  up: 'bg-secondary-container text-on-secondary-fixed-variant',
  down: 'bg-error-container text-on-error-container',
  flat: 'bg-surface-container text-on-surface-variant',
} as const;

export function MarketPrices() {
  const [range, setRange] = useState<Range>('15');
  const [booked, setBooked] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  const toast = useToast();
  const { navigate } = useRouter();

  const windowSize = range === '7' ? 7 : PRICE_DAYS.length;
  const labels = PRICE_DAYS.slice(-windowSize);
  const series = PRICE_SERIES.map((item) => ({ ...item, points: item.points.slice(-windowSize) }));

  return (
    <AppShell>
      <PageContainer>
        <PageHeading
          eyebrow={
            <>
              <Badge tone="neutral">ข้อมูลตัวอย่างจำลอง (Benchmark Survey)</Badge>
              <span className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name="info" size={14} className="text-secondary" />
                อ้างอิงข้อมูลสำรวจตลาดค้าส่งกลาง 5 แห่ง (ข้อมูลสำหรับการพัฒนา)
              </span>
            </>
          }
          title="เช็กราคาตลาดแตงโมวันนี้"
          description="ดัชนีราคาขายส่ง ข้อมูลสถานการณ์ผลผลิต และคำแนะนำทิศทางขายอัจฉริยะจาก 5 ตลาดกลางทั่วประเทศ"
          actions={
            <>
              <Button variant="tonal" size="sm" onClick={() => navigate('/alerts?focus=price')}>
                <Icon name="notifications_active" size={18} />
                ตั้งแจ้งเตือนราคาผ่าน LINE
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => printElement(sheet.current, 'ราคาตลาดแตงโม')}
              >
                <Icon name="picture_as_pdf" size={18} />
                ส่งออก PDF
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="ราคาเฉลี่ยรวมทุกสายพันธุ์"
            value="18.50"
            unit="บาท/กก."
            icon="payments"
            tone="primary"
            delta={{ value: '+0.75 ฿ (+4.2%)', direction: 'up', note: 'เทียบเมื่อวานนี้' }}
          />
          <StatTile
            label="ผลผลิตเข้าตลาดวันนี้"
            value="142.5"
            unit="ตัน"
            icon="local_shipping"
            tone="secondary"
            delta={{ value: '−12.8 ตัน (−8.2%)', direction: 'down', note: 'อุปทานหน้าสวนชะลอ' }}
          />
          <StatTile
            label="สายพันธุ์ราคาโดดเด่น"
            value="22 – 26"
            unit="฿/กก."
            icon="emoji_events"
            tone="primary"
            footnote={
              <span className="flex flex-wrap items-center gap-2">
                <Badge tone="secondary">ชอนญ่า พลัส</Badge>
                <span>Brix 12.8° • ตลาดสั่งซื้อล่วงหน้าแน่น</span>
              </span>
            }
          />
          <StatTile
            label="ดัชนีความต้องการรับซื้อ"
            value="สูงมาก"
            icon="speed"
            tone="secondary"
            footnote={
              <span className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between">
                  <span>คะแนนรวม</span>
                  <span className="font-bold text-on-surface">94/100</span>
                </span>
                <Meter value={94} tone="secondary" label="ดัชนีความต้องการรับซื้อ" />
              </span>
            }
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              icon="show_chart"
              title="แนวโน้มราคาตลาดเปรียบเทียบ"
              subtitle="ติดตามความผันผวนของราคาแตงโมแต่ละสายพันธุ์เพื่อจังหวะขาย"
              action={<Segmented options={RANGES} value={range} onChange={setRange} size="sm" label="ช่วงเวลา" />}
            />
            <LineChart series={series} labels={labels} />
            <p className="mt-4 flex items-center gap-1.5 text-caption text-primary">
              <Icon name="trending_up" size={14} />
              จุดสูงสุดในรอบ 45 วัน เกิดขึ้นเมื่อวานนี้
            </p>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader
                icon="psychology"
                title="AI วิเคราะห์แนวโน้มตลาด"
                subtitle="Watermelon Market Intelligence v4.2"
              />
              <Badge tone="primary" className="mb-3">
                <Icon name="auto_awesome" size={14} />
                สัญญาณราคากำลังพุ่ง (+5% ถึง +8%)
              </Badge>
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                ช่วง 3–5 วันข้างหน้า ราคาแตงโมสายพันธุ์ตอร์ปิโดและกินรี 202 มีแนวโน้มขยับขึ้นต่อเนื่อง +5% ถึง +8%
                เนื่องจากความต้องการฝั่งซื้อหน้าสวนสูงขึ้น ขณะที่ผลผลิตแปลงภาคอีสานและกาญจนบุรีเริ่มชะลอตัว
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-body-md">
                {[
                  { label: 'แรงซื้อส่งออกจีน–ฮ่องกง', value: '+12% MoM', tone: 'text-secondary' },
                  { label: 'สต็อกห้องเย็นตลาดไท', value: 'ระดับต่ำ (35%)', tone: 'text-primary' },
                  { label: 'อุณหภูมิเฉลี่ยทั่วประเทศ', value: '37.4°C', tone: 'text-on-surface' },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <Icon name="check_circle" size={16} className="text-secondary" />
                      {row.label}
                    </span>
                    <span className={`font-bold ${row.tone}`}>{row.value}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full"
                onClick={() =>
                  navigate(
                    `/chat?q=${encodeURIComponent('ช่วยวิเคราะห์แนวโน้มราคาแตงโมสัปดาห์หน้า และแนะนำว่าควรตัดผลผลิตวันไหนจึงจะได้ราคาดีที่สุด')}`,
                  )
                }
              >
                <Icon name="forum" size={18} />
                ถาม AI เจาะลึกสายพันธุ์เฉพาะคุณ
              </Button>
            </Card>

            <Card className="bg-secondary text-on-secondary">
              <p className="text-caption text-secondary-fixed-dim">ดัชนีคุณภาพความหวานของแตงโม</p>
              <p className="mt-1 text-headline-md font-bold">แดดแรงจัด แตงหวานฉ่ำ</p>
              <p className="mt-2 flex items-center gap-2 text-body-md text-secondary-fixed">
                <Icon name="wb_sunny" size={18} className="text-secondary-fixed-dim" />
                ความหวานเฉลี่ยหน้าสวนเพิ่มขึ้น +1.2 Brix สัปดาห์นี้
              </p>
            </Card>
          </div>
        </div>

        <Card className="mt-6 overflow-hidden p-0" ref={sheet}>
          <div className="flex flex-wrap items-start justify-between gap-3 p-6 pb-4">
            <div>
              <h2 className="flex flex-wrap items-center gap-2 text-headline-sm font-bold text-on-surface">
                ตารางเปรียบเทียบราคาแยกตามตลาดค้าส่งหลักทั่วประเทศ
                <LiveBadge>อัปเดตตรงจาก 5 แหล่งใหญ่</LiveBadge>
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                เกรด A (จัมโบ้ &gt;4.5 กก.), เกรด B (3.0–4.5 กก.) และเกรด C (ลูกไซส์ &lt;3 กก.)
              </p>
            </div>
            <Badge tone="outline">
              <Icon name="tune" size={14} />
              หน่วย: บาท / กิโลกรัม
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] border-collapse text-left">
              <thead>
                <tr className="bg-surface-low text-label-md text-on-surface-variant">
                  <th scope="col" className="px-6 py-3 font-semibold">ตลาดค้าส่ง / สหกรณ์</th>
                  <th scope="col" className="px-4 py-3 font-semibold">พิกัด / ภูมิภาค</th>
                  <th scope="col" className="px-4 py-3 font-semibold">เกรด A</th>
                  <th scope="col" className="px-4 py-3 font-semibold">เกรด B</th>
                  <th scope="col" className="px-4 py-3 font-semibold">เกรด C</th>
                  <th scope="col" className="px-4 py-3 font-semibold">ทิศทางราคา</th>
                  <th scope="col" className="px-6 py-3 font-semibold">สถานะการรับซื้อ</th>
                </tr>
              </thead>
              <tbody>
                {MARKET_ROWS.map((row) => (
                  <tr key={row.market} className="border-t border-outline-variant/30 align-top">
                    <th scope="row" className="px-6 py-4 text-left font-normal">
                      <span className="block text-label-lg font-bold text-on-surface">{row.market}</span>
                      <span className="block text-caption text-on-surface-variant">{row.org}</span>
                    </th>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1 text-body-md text-on-surface-variant">
                        <Icon name="location_on" size={14} className="text-outline" />
                        {row.province}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-title-md font-bold text-primary">{row.gradeA}</td>
                    <td className="px-4 py-4 text-body-lg text-on-surface">{row.gradeB}</td>
                    <td className="px-4 py-4 text-body-lg text-on-surface-variant">{row.gradeC}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md font-semibold ${TREND_TONE[row.trend.direction]}`}
                      >
                        <Icon
                          name={
                            row.trend.direction === 'up'
                              ? 'trending_up'
                              : row.trend.direction === 'down'
                                ? 'trending_down'
                                : 'trending_flat'
                          }
                          size={14}
                        />
                        {row.trend.value}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-body-md text-on-surface">
                        <span className="size-2 rounded-full bg-secondary" />
                        {row.demand}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              icon="event_available"
              iconTone="secondary"
              title="คำแนะนำวันตัดผลผลิตทำกำไรสูงสุด"
              subtitle="คำนวณเชื่อมโยงรอบหมุนปลอดของคุณ & ราคาทิศตลาด"
              action={<Badge tone="secondary">แปลงที่ 2 (กินรี 202)</Badge>}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'วันตัดที่เหมาะสมที่สุด', value: '18 – 20 พ.ค.', note: 'ตรงกับช่วงราคาขาขึ้น', tone: 'text-primary' },
                { label: 'คาดการณ์ราคาขาย ณ วันตัด', value: '20.50 – 22.00', note: 'สูงกว่าค่าเฉลี่ย +14%', tone: 'text-on-surface' },
                { label: 'ค่าความหวานคาดการณ์', value: '12.2 – 13.0 Brix', note: 'อายุเก็บเกี่ยว 62 วัน', tone: 'text-secondary' },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-surface-low p-4">
                  <p className="text-caption text-on-surface-variant">{item.label}</p>
                  <p className={`mt-1 text-title-md font-bold ${item.tone}`}>{item.value}</p>
                  <p className="mt-1 text-caption text-on-surface-variant">{item.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-md bg-mint-mist p-4">
              <Icon name="lightbulb" size={18} className="mt-0.5 text-secondary" />
              <p className="text-body-md text-on-surface-variant">
                <span className="font-bold text-on-surface">กลยุทธ์แนะนำ:</span> คาดว่าแรงซื้อจะพุ่งสูงสุด 3 วัน
                (เริ่ม 15 พ.ค.) เพื่อยืนความหวานให้เข้มขึ้น เปิดเจรจาหมายวางสต็อกล่วงหน้าแล้วนัดขนส่งเย็นวันนั้น
                เพื่อล็อกราคารับซื้อขั้นต่ำ 20.00 บาท/กก.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                <Icon name="check_circle" size={14} className="text-secondary" />
                คำนวณจากฐานข้อมูลเกษตรกรกว่า 1,400 แปลง
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={booked}
                onClick={() => {
                  setBooked(true);
                  toast.success('บันทึกนัดหมายแล้ว — ระบบจะเตือนล่วงหน้า 2 วันก่อนถึงวันตัด');
                }}
              >
                {booked ? 'บันทึกนัดหมายแล้ว' : 'ยืนยันนัดหมายถึงรับซื้อ'}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader
              icon="savings"
              title="ต้นทุนเฉลี่ย vs กำไรสุทธิ"
              subtitle="โครงสร้างผลตอบแทนต่อกิโลกรัม"
              action={<Badge tone="secondary">กำไรสุทธิ 132%</Badge>}
            />
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between text-body-md">
                  <span className="text-on-surface-variant">ต้นทุนการปลูกรวม (ปุ๋ย, เมล็ด, แรงงาน, ระบบน้ำ)</span>
                  <span className="font-bold text-on-surface">8.20 บาท/กก.</span>
                </div>
                <Meter value={43} tone="secondary" className="mt-2" label="ต้นทุนการปลูก" />
              </div>
              <div>
                <div className="flex items-center justify-between text-body-md">
                  <span className="text-on-surface-variant">ราคาขายเป้าหมายหน้าสวน</span>
                  <span className="font-bold text-primary">19.00 บาท/กก.</span>
                </div>
                <Meter value={100} tone="primary" className="mt-2" label="ราคาขายเป้าหมาย" />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 rounded-md bg-mint-mist p-4">
                <div>
                  <p className="text-caption text-on-surface-variant">กำไรสุทธิที่คาดว่าจะได้</p>
                  <p className="text-headline-md font-bold text-secondary">+10.80 บาท/กก.</p>
                </div>
                <div className="text-right">
                  <p className="text-caption text-on-surface-variant">แปลง 5 ไร่ (ผลผลิต ~18 ตัน)</p>
                  <p className="text-headline-md font-bold text-on-surface">~194,400 บาท</p>
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-surface-low p-4">
                <span className="flex items-center gap-2">
                  <Icon name="tune" size={18} className="text-on-surface-variant" />
                  <span className="flex flex-col">
                    <span className="text-label-lg font-semibold text-on-surface">แจ้งเตือนราคาเป้าหมาย</span>
                    <span className="text-caption text-on-surface-variant">เตือนทันทีเมื่อแตะ 20.00 ฿</span>
                  </span>
                </span>
                <input type="checkbox" defaultChecked className="size-5 accent-[#1b6b44]" />
              </label>
            </div>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
