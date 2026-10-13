import { useRef, useState } from 'react';
import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useToast } from '../components/ui/Toast';
import { useRouter } from '../lib/router';
import { copyText, printElement, toBibTeX } from '../lib/export';
import { cn } from '../lib/cn';
import { CITATION_SOURCE, PAPERS, RESEARCH_TOPICS } from '../data/research';

type Topic = 'ทั้งหมด' | (typeof RESEARCH_TOPICS)[number];

// Entries live in `src/data/research.ts`, which states the rule they follow:
// every one carries a DOI that was opened and checked, and its summary may
// only repeat what that paper's own abstract says.
const TOPICS: readonly Topic[] = ['ทั้งหมด', ...RESEARCH_TOPICS];

const TYPE_TONE = {
  บทความวิจัย: 'primary',
  รายงานภาคสนาม: 'secondary',
  ชุดข้อมูลเปิด: 'tertiary',
} as const;

export function Research() {
  const [topic, setTopic] = useState<Topic>('ทั้งหมด');
  const [openId, setOpenId] = useState<string | null>(PAPERS[0]?.id ?? null);
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
              หลักฐานของโมเดล แหล่งข้อมูล และข้อจำกัด
            </h1>
            <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
              โครงการมีผลประเมินภายในและ metadata ของน้ำหนักโมเดลหลายรุ่น แต่ <strong>ยังไม่มีงานตีพิมพ์ของตัวเองและยังไม่มีชุดทดสอบจากสวนอิสระ</strong> รายการด้านล่างคืองานของผู้อื่นที่เราใช้อ้างอิง ทุกฉบับตรวจ DOI แล้ว และไม่ใช่หลักฐานความแม่นยำของโมเดลในแอปนี้
            </p>
          </div>

          <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: '6', label: 'น้ำหนัก ONNX ใน repository', tone: 'text-primary' },
              { value: '5', label: 'เส้นทาง Vision ที่รองรับ', tone: 'text-secondary' },
              { value: `${PAPERS.length}`, label: 'เอกสารอ้างอิงภายนอก (ตรวจ DOI แล้ว)', tone: 'text-tertiary' },
              { value: '0', label: 'ชุดทดสอบสวนอิสระ', tone: 'text-primary' },
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
          {filtered.length === 0 ? (
            <Card>
              <p className="text-body-md text-on-surface-variant">ยังไม่มีเอกสารในหัวข้อนี้ที่ตรวจสอบแหล่งเผยแพร่ได้ ดูผลทดสอบโมเดลที่มีหลักฐานในหน้าแดชบอร์ดวัดผล</p>
            </Card>
          ) : null}
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
                      <span className="text-caption text-on-surface-variant">ค.ศ. {paper.year}</span>
                      {paper.openAccess ? <Badge tone="outline">อ่านฉบับเต็มได้ฟรี</Badge> : null}
                    </div>
                    <h2 className="text-title-md font-bold text-on-surface">{paper.title}</h2>
                    <p className="mt-1 text-body-md text-on-surface-variant">{paper.authors}</p>
                    <p className="mt-0.5 text-caption text-on-surface-variant italic">{paper.venue}</p>
                  </div>

                  <div className="shrink-0 rounded-md bg-surface-low px-4 py-3 text-center">
                    <p className="text-headline-sm font-bold text-primary">{paper.citations}</p>
                    <p className="text-caption text-on-surface-variant">
                      การอ้างอิง ({CITATION_SOURCE.name})
                    </p>
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
                      {paper.summary_th}
                    </p>
                    <div className="rounded-md border border-outline-variant p-4">
                      <p className="mb-1 text-label-md font-bold text-on-surface">เกี่ยวกับ Watermelon AI อย่างไร</p>
                      <p className="text-body-md leading-relaxed text-on-surface-variant">{paper.relevance_th}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="tonal" size="sm" onClick={() => window.open(paper.url, '_blank', 'noopener,noreferrer')}>
                        <Icon name="open_in_new" size={16} />
                        เปิดเอกสารต้นฉบับ (DOI)
                      </Button>
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
                        <Badge tone="outline">
                          <Icon name="dataset" size={13} />
                          ชุดข้อมูลเผยแพร่พร้อมบทความ เปิดจากลิงก์ DOI ได้เลย
                        </Badge>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </Card>
            );
          })}
        </div>

        <Card className="mt-6">
          <p className="text-caption text-on-surface-variant">
            จำนวนการอ้างอิงดึงจาก {CITATION_SOURCE.name} ({CITATION_SOURCE.url}) เมื่อ {CITATION_SOURCE.retrieved_th}
            ตัวเลขนี้เปลี่ยนตามเวลา และบทคัดย่อย่อภาษาไทยเป็นการสรุปจากบทคัดย่อต้นฉบับ
            หากต้องอ้างอิงในงานวิชาการ ให้ยึดเอกสารต้นฉบับที่ลิงก์ DOI เท่านั้น
          </p>
        </Card>

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
          <p className="text-body-md text-on-surface-variant">ตัวเลขความแม่นยำต้องอ่านตามเครื่องยนต์และชุดทดสอบของแต่ละรุ่น ห้ามนำตัวเลขจากโมเดลอื่นมาใช้แทนกัน</p>
          <p className="mt-4 text-caption text-on-surface-variant">
            หน้าแดชบอร์ดวัดผลแสดงข้อมูลจากไฟล์โมเดลและการประเมินที่มีอยู่จริง พร้อมขอบเขตชุดทดสอบ
          </p>
        </Card>
      </section>
    </MarketingShell>
  );
}
