import { useRef, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Meter } from '../components/ui/Meter';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { copyText, printElement, toBibTeX } from '../lib/export';
import { cn } from '../lib/cn';

type Topic = 'ทั้งหมด' | 'โรคพืช' | 'ความหวาน' | 'เศรษฐศาสตร์' | 'เทคโนโลยี AI';

type Paper = {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  topic: Exclude<Topic, 'ทั้งหมด'>;
  abstract: string;
  citations: number;
  type: 'บทความวิจัย' | 'รายงานภาคสนาม' | 'ชุดข้อมูลเปิด';
};

const PAPERS: readonly Paper[] = [
  {
    id: 'p1',
    title: 'การจำแนกโรคแตงโม 8 ชนิดด้วยโครงข่ายประสาทเทียมแบบคอนโวลูชันบนภาพถ่ายจากสมาร์ตโฟน',
    authors: 'ณัฐพล วิทยาการ, สุพจน์ รุ่งโรจน์สุวรรณ, ธนกฤต ศรีสมบูรณ์',
    venue: 'วารสารวิทยาศาสตร์เกษตรแห่งประเทศไทย ปีที่ 54 ฉบับที่ 2',
    year: 2569,
    topic: 'โรคพืช',
    abstract:
      'งานวิจัยนี้พัฒนาโมเดล CNN สำหรับจำแนกโรคแตงโม 8 ชนิดจากภาพถ่ายใบและลำต้นที่ถ่ายด้วยสมาร์ตโฟนในสภาพแสงธรรมชาติ ฝึกด้วยชุดข้อมูล 120,480 ภาพจากแปลงเกษตรกรจริง 12 จังหวัด ผลการทดสอบได้ค่าความแม่นยำเฉลี่ย 93.2% และ F1-score 0.918',
    citations: 42,
    type: 'บทความวิจัย',
  },
  {
    id: 'p2',
    title: 'ความสัมพันธ์ระหว่างคลื่นเสียงเคาะผลกับค่าความหวาน Brix ในแตงโมพันธุ์การค้าไทย',
    authors: 'สุพจน์ รุ่งโรจน์สุวรรณ, พิมพ์ชนก เกษตรสุข',
    venue: 'การประชุมวิชาการพืชสวนแห่งชาติ ครั้งที่ 21',
    year: 2568,
    topic: 'ความหวาน',
    abstract:
      'ศึกษาความสัมพันธ์ระหว่างความถี่พื้นฐานของคลื่นเสียงเคาะผลแตงโมกับค่าความหวานที่วัดด้วยเครื่องวัด Brix แบบหักเหแสง จากตัวอย่าง 2,400 ผล ใน 5 สายพันธุ์ พบสหสัมพันธ์เชิงลบอย่างมีนัยสำคัญ (r = −0.84) ระหว่างความถี่กับค่า Brix',
    citations: 28,
    type: 'บทความวิจัย',
  },
  {
    id: 'p3',
    title: 'ผลของการใช้ระบบเตือนโรคล่วงหน้าต่อต้นทุนสารเคมีและผลตอบแทนของเกษตรกรแตงโม',
    authors: 'พิมพ์ชนก เกษตรสุข, ณัฐพล วิทยาการ',
    venue: 'วารสารเศรษฐศาสตร์เกษตร ปีที่ 41 ฉบับที่ 1',
    year: 2569,
    topic: 'เศรษฐศาสตร์',
    abstract:
      'เปรียบเทียบต้นทุนและผลตอบแทนของเกษตรกร 340 รายที่ใช้และไม่ใช้ระบบเตือนโรคล่วงหน้า ตลอดฤดูกาล 2568/2569 พบว่ากลุ่มที่ใช้ระบบมีต้นทุนสารเคมีต่ำกว่าเฉลี่ย 35.2% และมีกำไรสุทธิต่อไร่สูงกว่า 18.7%',
    citations: 15,
    type: 'รายงานภาคสนาม',
  },
  {
    id: 'p4',
    title: 'ชุดข้อมูลเปิดภาพโรคแตงโมไทย (Thai Watermelon Disease Dataset v2)',
    authors: 'ทีมวิจัย Watermelon AI ร่วมกับกรมวิชาการเกษตร',
    venue: 'เผยแพร่ภายใต้สัญญาอนุญาต CC BY-NC 4.0',
    year: 2569,
    topic: 'เทคโนโลยี AI',
    abstract:
      'ชุดข้อมูลภาพถ่ายใบและลำต้นแตงโม 120,480 ภาพ พร้อมป้ายกำกับโรค 8 ชนิดที่ตรวจยืนยันโดยนักวิชาการเกษตร รวมถึงข้อมูลสภาพอากาศและพิกัดระดับตำบล (ลบข้อมูลระบุตัวตนแล้ว) เปิดให้นักวิจัยและสถาบันการศึกษาใช้งานฟรี',
    citations: 67,
    type: 'ชุดข้อมูลเปิด',
  },
  {
    id: 'p5',
    title: 'การพยากรณ์การระบาดของโรคราน้ำค้างในแตงโมด้วยข้อมูลสภาพอากาศย้อนหลัง',
    authors: 'ธนกฤต ศรีสมบูรณ์, สุพจน์ รุ่งโรจน์สุวรรณ',
    venue: 'วารสารอารักขาพืชไทย ปีที่ 48 ฉบับที่ 3',
    year: 2568,
    topic: 'โรคพืช',
    abstract:
      'พัฒนาแบบจำลองพยากรณ์ความเสี่ยงการระบาดของโรคราน้ำค้างจากข้อมูลอุณหภูมิ ความชื้นสัมพัทธ์ และระยะเวลาใบเปียก ย้อนหลัง 7 วัน สามารถเตือนล่วงหน้าได้เฉลี่ย 4.2 วันก่อนพบอาการในแปลง ด้วยความแม่นยำ 86%',
    citations: 33,
    type: 'บทความวิจัย',
  },
];

const TOPICS: readonly Topic[] = ['ทั้งหมด', 'โรคพืช', 'ความหวาน', 'เศรษฐศาสตร์', 'เทคโนโลยี AI'];

const TYPE_TONE = {
  บทความวิจัย: 'primary',
  รายงานภาคสนาม: 'secondary',
  ชุดข้อมูลเปิด: 'tertiary',
} as const;

export function Research() {
  const [topic, setTopic] = useState<Topic>('ทั้งหมด');
  const [openId, setOpenId] = useState<string | null>(PAPERS[0].id);
  const sheets = useRef<Record<string, HTMLElement | null>>({});
  const toast = useToast();
  const { navigate } = useRouter();

  const filtered = topic === 'ทั้งหมด' ? PAPERS : PAPERS.filter((paper) => paper.topic === topic);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-14">
        <div className="pointer-events-none absolute -top-24 -right-20 size-96 rounded-full bg-secondary-container/50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          <div className="max-w-3xl">
            <Badge tone="secondary">
              <Icon name="menu_book" size={14} />
              งานวิจัยและสิ่งพิมพ์
            </Badge>
            <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">
              ความรู้ที่อยู่เบื้องหลังคำแนะนำทุกข้อ
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              งานวิจัยที่ตีพิมพ์ ชุดข้อมูลเปิด และรายงานภาคสนามที่เราเผยแพร่ร่วมกับกรมวิชาการเกษตร
              และสถาบันวิจัยพืชสวนเขตร้อน เพื่อให้ทุกคำแนะนำของ AI ตรวจสอบย้อนกลับได้
            </p>
          </div>

          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: `${PAPERS.length}`, label: 'ผลงานที่เผยแพร่', tone: 'text-primary' },
              { value: '185', label: 'การอ้างอิงรวม', tone: 'text-secondary' },
              { value: '120K', label: 'ภาพในชุดข้อมูลเปิด', tone: 'text-tertiary' },
              { value: '12', label: 'จังหวัดที่เก็บข้อมูล', tone: 'text-primary' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-surface-lowest p-4 shadow-sm">
                <p className={cn('text-headline-md font-bold', stat.tone)}>{stat.value}</p>
                <p className="text-label-md text-on-surface-variant">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TOPICS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTopic(item)}
              aria-pressed={topic === item}
              className={cn(
                'cursor-pointer rounded-full px-4 py-2 text-label-md font-semibold transition-all duration-150 ease-tactile active:scale-[0.96]',
                topic === item
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-lowest text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {filtered.map((paper) => {
            const open = openId === paper.id;
            return (
              <Card
                key={paper.id}
                as="article"
                className="flex flex-col gap-3"
                ref={(element) => {
                  sheets.current[paper.id] = element;
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge tone={TYPE_TONE[paper.type]}>{paper.type}</Badge>
                      <Badge tone="outline">{paper.topic}</Badge>
                      <span className="text-caption text-on-surface-variant">พ.ศ. {paper.year}</span>
                    </div>
                    <h2 className="text-title-md font-bold text-on-surface">{paper.title}</h2>
                    <p className="mt-1 text-body-md text-on-surface-variant">{paper.authors}</p>
                    <p className="mt-0.5 text-caption text-on-surface-variant italic">{paper.venue}</p>
                  </div>

                  <div className="shrink-0 rounded-md bg-surface-low px-4 py-3 text-center">
                    <p className="text-headline-sm font-bold text-primary">{paper.citations}</p>
                    <p className="text-caption text-on-surface-variant">การอ้างอิง</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : paper.id)}
                  aria-expanded={open}
                  className="flex cursor-pointer items-center gap-1.5 self-start text-label-lg font-semibold text-primary hover:underline"
                >
                  {open ? 'ซ่อนบทคัดย่อ' : 'อ่านบทคัดย่อ'}
                  <Icon name={open ? 'expand_less' : 'expand_more'} size={18} />
                </button>

                {open ? (
                  <>
                    <p className="rounded-md bg-surface-low p-4 text-body-md leading-relaxed text-on-surface-variant">
                      {paper.abstract}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => printElement(sheets.current[paper.id] ?? null, paper.title)}
                      >
                        <Icon name="picture_as_pdf" size={16} />
                        ดาวน์โหลด PDF
                      </Button>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={async () => {
                          const ok = await copyText(toBibTeX(paper));
                          if (ok) toast.success('คัดลอก BibTeX แล้ว');
                          else toast.error('คัดลอกไม่สำเร็จ');
                        }}
                      >
                        <Icon name="format_quote" size={16} />
                        คัดลอกรูปแบบอ้างอิง (BibTeX)
                      </Button>
                      {paper.type === 'ชุดข้อมูลเปิด' ? (
                        <Button variant="tonal" size="sm" onClick={() => navigate('/support')}>
                          <Icon name="dataset" size={16} />
                          ขอเข้าถึงชุดข้อมูล
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </Card>
            );
          })}
        </div>

        <Card className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-headline-sm font-bold text-on-surface">
              <Icon name="verified" size={22} className="text-secondary" />
              ความแม่นยำของโมเดลตามกลุ่มโรค
            </h2>
            <Button
              variant="tonal"
              size="sm"
              onClick={() => navigate('/evaluation')}
            >
              <Icon name="insights" size={16} />
              ดูแดชบอร์ดวัดผลเชิงลึก (Confusion Matrix & ECE)
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { name: 'ราแป้ง (Powdery Mildew)', value: 97.1 },
              { name: 'ราน้ำค้าง (Downy Mildew)', value: 96.2 },
              { name: 'แอนแทรคโนส (Anthracnose)', value: 94.8 },
              { name: 'เพลี้ยไฟและไรแดง', value: 93.7 },
              { name: 'ยางไหล (Gummy Stem Blight)', value: 92.4 },
              { name: 'เหี่ยวฟิวซาเรียม (Fusarium Wilt)', value: 91.6 },
              { name: 'ใบด่างยอดหงิก (Mosaic Virus)', value: 89.5 },
              { name: 'ผลเน่าแบคทีเรีย (Fruit Blotch)', value: 88.3 },
            ].map((row) => (
              <div key={row.name} className="flex items-center gap-4">
                <span className="w-56 shrink-0 text-body-md text-on-surface-variant">{row.name}</span>
                <Meter value={row.value} tone={row.value >= 93 ? 'secondary' : 'primary'} label={row.name} />
                <span className="w-14 shrink-0 text-right text-label-lg font-bold text-on-surface">{row.value}%</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption text-on-surface-variant">
            วัดจากชุดข้อมูลทดสอบอิสระ 18,072 ภาพ ที่ไม่เคยใช้ในการฝึกโมเดล • อัปเดตล่าสุด ตุลาคม 2569
          </p>
        </Card>
      </section>
    </MarketingShell>
  );
}
