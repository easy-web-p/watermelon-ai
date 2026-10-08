import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { Link } from '../lib/router';

const MILESTONES = [
  {
    step: '1',
    label: 'จุดเริ่มต้น',
    title: 'โจทย์โปรเจกต์ AI จากอาจารย์',
    body: 'จุดเริ่มต้นเกิดจากอาจารย์มอบหมายงานโครงงาน / โปรเจกต์ AI ส่ง พวกเราจึงรวมตัวกันคิดค้นหัวข้อที่จะนำเทคโนโลยีปัญญาประดิษฐ์มาสร้างประโยชน์ที่จับต้องได้จริงในชีวิตประจำวัน',
  },
  {
    step: '2',
    label: 'เลือกทิศทาง',
    title: 'เจาะจงความรู้ความเชี่ยวชาญเรื่อง "แตงโม"',
    body: 'พวกเราเล็งเห็นว่าแตงโมเป็นพืชเศรษฐกิจที่เกษตรกรมักเผชิญปัญหาโรคพืชและการประเมินความหวาน จึงตั้งใจพัฒนา AI ที่มีความรู้ความเชี่ยวชาญเฉพาะทางเรื่องแตงโมโดยตรง',
  },
  {
    step: '3',
    label: 'ลงพื้นที่จริง',
    title: 'ลงพื้นที่ศึกษาแปลงเพาะปลูกแตงโมจริง',
    body: 'พวกเราได้ลงพื้นที่แปลงปลูกแตงโมจริง ร่วมพูดคุยกับเกษตรกร บันทึกภาพถ่ายรอยโรคจากใบแตงโมในสภาพแสงธรรมชาติ และศึกษาปัญหาอุปสรรคหน้างานจริง เพื่อนำข้อมูลคุณภาพมาฝึกสอนโมเดล AI',
  },
  {
    step: '4',
    label: 'สู่ผลงานจริง',
    title: 'พัฒนาสู่ระบบเว็บแอปพลิเคชัน Watermelon AI',
    body: 'ต่อยอดการวิเคราะห์สู่ระบบเว็บแอปพลิเคชันที่พร้อมใช้งานจริง มีแชทผู้ช่วย AI, ระบบตรวจโรคใบแตงโม, ตรวจวัดความหวาน และระบบจัดการแปลงเพาะปลูกอัจฉริยะเพื่อเกษตรกรไทย',
  },
];

const VALUES = [
  {
    icon: 'translate',
    title: 'พูดภาษาที่เกษตรกรเข้าใจ',
    body: 'ไม่ใช้ศัพท์เทคนิคโดยไม่จำเป็น ทุกคำแนะนำบอกว่าต้องทำอะไร เมื่อไหร่ และใช้อะไร',
    tone: 'bg-primary-fixed text-primary',
  },
  {
    icon: 'science',
    title: 'ยืนบนฐานข้อมูลวิชาการ',
    body: 'ทุกคำแนะนำอ้างอิงกรมวิชาการเกษตร สถาบันวิจัยพืชสวนเขตร้อน และงานวิจัยที่ตรวจสอบได้',
    tone: 'bg-secondary-container text-on-secondary-fixed-variant',
  },
  {
    icon: 'visibility',
    title: 'บอกความไม่แน่นอนตรงไปตรงมา',
    body: 'AI แสดงระดับความมั่นใจทุกครั้ง และบอกเสมอเมื่อควรให้นักวิชาการตรวจสอบซ้ำ',
    tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  },
  {
    icon: 'lock',
    title: 'ข้อมูลแปลงเป็นของเกษตรกร',
    body: 'ภาพถ่ายและข้อมูลแปลงเป็นของผู้ใช้ ขอสำเนาหรือลบทิ้งได้ทุกเมื่อตามสิทธิ์ PDPA',
    tone: 'bg-surface-container text-on-surface-variant',
  },
];

const TEAM = [
  {
    initial: 'ก',
    name: 'นายกรรณ์ธวัฒน์ พินิจมนตรี',
    role: 'ผู้พัฒนาโครงงาน AI & ลงพื้นที่จริง',
    detail: 'ร่วมพัฒนาโมเดล AI ออกแบบระบบ และลงพื้นที่ศึกษาแปลงแตงโมจริง',
    tone: 'bg-primary-fixed text-primary',
  },
  {
    initial: 'ท',
    name: 'นายเทพพิทักษ์ ภูทรศรี',
    role: 'ผู้พัฒนาโครงงาน AI & ลงพื้นที่จริง',
    detail: 'ร่วมพัฒนาโมเดล AI ออกแบบระบบ และลงพื้นที่ศึกษาแปลงแตงโมจริง',
    tone: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  },
  {
    initial: 'พ',
    name: 'นายพิสิษฐ์พงศ์ ถำวาปี',
    role: 'ผู้พัฒนาโครงงาน AI & ลงพื้นที่จริง',
    detail: 'ร่วมพัฒนาโมเดล AI ออกแบบระบบ และลงพื้นที่ศึกษาแปลงแตงโมจริง',
    tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  },
  {
    initial: 'ช',
    name: 'นายชินภัทร อ่อนสองชั้น',
    role: 'ผู้พัฒนาโครงงาน AI & ลงพื้นที่จริง',
    detail: 'ร่วมพัฒนาโมเดล AI ออกแบบระบบ และลงพื้นที่ศึกษาแปลงแตงโมจริง',
    tone: 'bg-primary-container text-on-primary-container',
  },
  {
    initial: 'พ',
    name: 'นายพิสิษฐ์ แก้วกุลพิสิษฐ',
    role: 'ผู้พัฒนาโครงงาน AI & ลงพื้นที่จริง',
    detail: 'ร่วมพัฒนาโมเดล AI ออกแบบระบบ และลงพื้นที่ศึกษาแปลงแตงโมจริง',
    tone: 'bg-secondary-container text-on-secondary-fixed-variant',
  },
];

export function About() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-lowest via-surface-low to-surface py-16">
        <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <MelonAvatar size={72} className="mx-auto" />
          <Badge tone="secondary" className="mx-auto mt-4">
            <Icon name="groups" size={14} />
            เกี่ยวกับพวกเรา
          </Badge>
          <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">
            เราสร้าง AI ที่เข้าใจแปลงแตงโม จากการลงพื้นที่จริง
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-on-surface-variant">
            Watermelon AI มีจุดเริ่มต้นจากโปรเจกต์ AI ที่อาจารย์ให้ทำงานส่ง พวกเราจึงตั้งใจพัฒนา AI
            ที่มีความรู้ความเชี่ยวชาญเรื่องแตงโมโดยเฉพาะ และได้ลงพื้นที่แปลงเกษตรกรจริงเพื่อเก็บข้อมูลและแก้ปัญหาให้ตรงจุด
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: '5 คน', label: 'สมาชิกทีมผู้พัฒนา', tone: 'text-primary' },
            { value: '100%', label: 'ลงพื้นที่แปลงจริง', tone: 'text-secondary' },
            { value: '47+', label: 'โรค & ปัญหาในแคตตาล็อก', tone: 'text-tertiary' },
            { value: '3 เครื่องยนต์', label: 'AI วิเคราะห์โรคพืช', tone: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-surface-lowest p-5 text-center shadow-card">
              <p className={`text-headline-md font-bold ${stat.tone}`}>{stat.value}</p>
              <p className="mt-1 text-label-md text-on-surface-variant">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-headline-md font-bold text-on-surface">สิ่งที่เรายึดถือ</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {VALUES.map((value) => (
              <Card key={value.title} as="article" className="flex gap-4">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${value.tone}`}>
                  <Icon name={value.icon} size={24} />
                </span>
                <div>
                  <h3 className="text-title-md font-bold text-on-surface">{value.title}</h3>
                  <p className="mt-1 text-body-md text-on-surface-variant">{value.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-2xl bg-surface-lowest shadow-card border border-flesh-border/60">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col gap-4">
                <Badge tone="secondary" className="w-fit">
                  <Icon name="verified" size={14} />
                  ลงพื้นที่ศึกษาแปลงเกษตรกรจริง
                </Badge>
                <h2 className="text-headline-md font-bold text-on-surface">
                  เคียงข้างเกษตรกรไทย พัฒนา AI จากการลงพื้นที่จริง
                </h2>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  พวกเราไม่ได้พัฒนาโมเดล AI แค่ในห้องเรียน แต่ได้ลงพื้นที่คลุกคลีกับชาวสวนแตงโมตัวจริง
                  เก็บภาพรอยโรคในสภาพแสงธรรมชาติ สภาพดิน และสภาพแวดล้อมจริง เพื่อให้ AI มีความแม่นยำและตอบโจทย์เกษตรกรได้จริงกลางไร่
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to="/disease-scan"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-label-lg font-semibold text-on-primary shadow-sm hover:bg-primary-container transition-all"
                  >
                    <Icon name="photo_camera" size={18} />
                    ทดลองตรวจโรคใบแตงโม
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/25 px-5 text-label-lg font-semibold text-on-surface hover:bg-surface-low transition-all"
                  >
                    <Icon name="forum" size={18} className="text-primary" />
                    แชทปรึกษา AI เรื่องแตงโม
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-6 h-72 sm:h-96 relative overflow-hidden bg-surface-container">
                <img
                  src="/assets/thai_farmer_specialist.png"
                  alt="เกษตรกรแตงโมและการลงพื้นที่ศึกษาจริง"
                  className="size-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none lg:bg-gradient-to-r lg:from-surface-lowest lg:via-transparent lg:to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-surface-lowest/90 backdrop-blur-md p-3 text-caption text-on-surface font-medium border border-outline-variant/30 shadow-sm">
                  🌾 ถ่ายทอดองค์ความรู้และลงพื้นที่เก็บข้อมูลแปลงแตงโมจริงร่วมกับเกษตรกร
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-center gap-2">
            <Badge tone="primary">
              <Icon name="timeline" size={14} />
              เส้นทางของเรา
            </Badge>
          </div>
          <h2 className="mt-2 text-headline-md font-bold text-on-surface">เส้นทางของเรา</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            จากโจทย์งานโปรเจกต์ AI ส่งอาจารย์ สู่การลงพื้นที่จริงและสร้างปัญญาประดิษฐ์เพื่อชาวสวนแตงโม
          </p>
          <ol className="mt-6 flex flex-col">
            {MILESTONES.map((milestone, index, array) => (
              <li key={milestone.title} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-full bg-primary text-headline-sm font-bold text-on-primary shadow-cta">
                    {milestone.step}
                  </span>
                  {index < array.length - 1 ? <span className="w-0.5 flex-1 bg-outline-variant/50" /> : null}
                </div>
                <div className="pb-8">
                  <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {milestone.label}
                  </span>
                  <h3 className="mt-1 text-title-md font-bold text-on-surface">{milestone.title}</h3>
                  <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant leading-relaxed">
                    {milestone.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <div className="flex items-center gap-2">
            <Badge tone="secondary">
              <Icon name="groups" size={14} />
              คณะผู้จัดทำโครงงาน
            </Badge>
          </div>
          <h2 className="mt-2 text-headline-md font-bold text-on-surface">สมาชิกผู้พัฒนาโครงงาน</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            ทีมนักศึกษาผู้ริเริ่มและพัฒนา Watermelon AI จากโจทย์โปรเจกต์ส่งอาจารย์ สู่การลงพื้นที่ศึกษาแปลงแตงโมจริง
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TEAM.map((member) => (
              <Card
                key={member.name}
                as="article"
                className="flex flex-col items-center gap-3 text-center p-5 shadow-card hover:shadow-dock transition-all hover:-translate-y-0.5"
              >
                <span
                  className={`flex size-16 items-center justify-center rounded-full text-headline-md font-bold shadow-sm ${member.tone}`}
                >
                  {member.initial}
                </span>
                <div className="w-full">
                  <h3 className="text-label-lg font-bold text-on-surface break-words leading-snug">{member.name}</h3>
                  <p className="mt-1 text-caption font-semibold text-primary">{member.role}</p>
                  <p className="mt-1.5 text-caption text-on-surface-variant leading-relaxed">{member.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Card className="mt-14 flex flex-wrap items-center justify-between gap-5 bg-secondary text-on-secondary">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-on-secondary/15">
              <Icon name="handshake" size={26} />
            </span>
            <div>
              <p className="text-headline-sm font-bold">มีข้อเสนอแนะหรือต้องการติดต่อทีมพัฒนา?</p>
              <p className="mt-0.5 text-body-md text-secondary-fixed">
                พวกเรายินดีรับฟังทุกคำติชมเพื่อนำไปพัฒนาต่อยอดโครงงาน AI ให้ตอบโจทย์เกษตรกรไทยยิ่งขึ้น
              </p>
            </div>
          </div>
          <Link
            to="/support"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-secondary px-5 text-label-lg font-semibold text-secondary transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="mail" size={18} />
            ติดต่อทีมงาน
          </Link>
        </Card>
      </section>
    </MarketingShell>
  );
}
