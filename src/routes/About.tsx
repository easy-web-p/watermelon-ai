import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { MelonAvatar } from '../components/brand/Logo';
import { Link } from '../lib/router';

const MILESTONES = [
  { year: '2566', title: 'จุดเริ่มต้นจากแปลงแตงโมสุพรรณบุรี', body: 'ทีมวิศวกรและนักวิชาการเกษตรรวมตัวกันหลังเห็นเกษตรกรสูญเสียผลผลิตกว่า 40% จากโรคราน้ำค้างที่วินิจฉัยช้าเกินไป' },
  { year: '2567', title: 'เปิดตัวโมเดลวินิจฉัยโรครุ่นแรก', body: 'ฝึกด้วยภาพถ่ายใบแตงโมกว่า 85,000 ภาพจากแปลงจริง 12 จังหวัด ความแม่นยำเริ่มต้นที่ 87.4%' },
  { year: '2568', title: 'ขยายสู่ระบบวิเคราะห์เสียงเคาะและราคาตลาด', body: 'เพิ่มโมดูลประเมินความหวาน Brix จากคลื่นเสียง และเชื่อมข้อมูลราคาจาก 5 ตลาดกลางทั่วประเทศ' },
  { year: '2569', title: 'เกษตรกร 8,500 แปลงทั่วประเทศ', body: 'ความแม่นยำเฉลี่ยของโมเดลไปถึง 93.2% ช่วยลดต้นทุนค่ายาและปุ๋ยของผู้ใช้งานเฉลี่ย 35%' },
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
  { initial: 'ส', name: 'อ. สุพจน์ รุ่งโรจน์สุวรรณ', role: 'หัวหน้านักวิชาการเกษตร', detail: 'ผู้เชี่ยวชาญแตงโมไร้เมล็ดและการจัดการโรคพืชเขตร้อน 22 ปี', tone: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  { initial: 'ณ', name: 'ดร. ณัฐพล วิทยาการ', role: 'หัวหน้าทีมวิจัย AI', detail: 'Computer Vision สำหรับการเกษตร อดีตนักวิจัย NECTEC', tone: 'bg-primary-fixed text-primary' },
  { initial: 'พ', name: 'พิมพ์ชนก เกษตรสุข', role: 'หัวหน้าฝ่ายดูแลเกษตรกร', detail: 'ลูกหลานชาวสวนแตงโมรุ่นที่ 3 จ.กาญจนบุรี', tone: 'bg-secondary-container text-on-secondary-fixed-variant' },
  { initial: 'ธ', name: 'ธนกฤต ศรีสมบูรณ์', role: 'หัวหน้าฝ่ายวิศวกรรม', detail: 'สถาปัตยกรรมระบบและความปลอดภัยข้อมูล', tone: 'bg-surface-container text-on-surface-variant' },
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
            เกี่ยวกับเรา
          </Badge>
          <h1 className="mt-3 text-headline-lg text-on-surface lg:text-display-lg">
            เราสร้าง AI ที่เข้าใจแปลงแตงโมไทยจริง ๆ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-on-surface-variant">
            Watermelon AI เกิดจากคำถามง่าย ๆ ว่า ทำไมเกษตรกรต้องรอให้นักวิชาการมาดูถึงจะรู้ว่าแปลงเป็นโรคอะไร
            เราจึงย่อความรู้ของผู้เชี่ยวชาญลงในมือถือที่เกษตรกรพกอยู่แล้ว
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: '8,500+', label: 'แปลงเกษตรกรที่ใช้งาน', tone: 'text-primary' },
            { value: '120,000+', label: 'ภาพที่วินิจฉัยแล้ว', tone: 'text-secondary' },
            { value: '93.2%', label: 'ความแม่นยำเฉลี่ย', tone: 'text-tertiary' },
            { value: '35%', label: 'ต้นทุนยาและปุ๋ยที่ลดได้', tone: 'text-primary' },
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
                  วิจัยร่วมกับแปลงเกษตรกรจริง
                </Badge>
                <h2 className="text-headline-md font-bold text-on-surface">
                  เคียงข้างเกษตรกรไทย ปฏิวัติการดูแลแตงโม ด้วยปัญญาประดิษฐ์ระดับสากล
                </h2>
                <p className="text-body-md text-on-surface-variant leading-relaxed">
                  เราไม่ได้พัฒนาโมเดล AI ในห้องแอร์ แต่ทีมนักวิจัยลงพื้นที่คลุกคลีกับชาวสวนแตงโมตัวจริงใน 12 จังหวัด
                  เก็บภาพรอยโรคในสภาพแสงธรรมชาติ สภาพดินชื้น และโรคแทรกซ้อน เพื่อให้ AI แม่นยำที่สุดเมื่ออยู่กลางไร่
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to="/research"
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-label-lg font-semibold text-on-primary shadow-sm hover:bg-primary-container transition-all"
                  >
                    <Icon name="menu_book" size={18} />
                    ดูรายงานผลวิจัยและ Dataset
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/25 px-5 text-label-lg font-semibold text-on-surface hover:bg-surface-low transition-all"
                  >
                    <Icon name="photo_camera" size={18} className="text-primary" />
                    ทดลองใช้งาน AI
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-6 h-72 sm:h-96 relative overflow-hidden bg-surface-container">
                <img
                  src="/assets/thai_farmer_specialist.png"
                  alt="เกษตรกรแตงโมและผู้เชี่ยวชาญด้านพืชสวน"
                  className="size-full object-cover object-top hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none lg:bg-gradient-to-r lg:from-surface-lowest lg:via-transparent lg:to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-surface-lowest/90 backdrop-blur-md p-3 text-caption text-on-surface font-medium border border-outline-variant/30 shadow-sm">
                  🌾 ถ่ายทอดองค์ความรู้โรคแตงโมสู่ระบบ AI ร่วมกับเกษตรกร อ.ดอนเจดีย์ จ.สุพรรณบุรี
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-headline-md font-bold text-on-surface">เส้นทางของเรา</h2>
          <ol className="mt-6 flex flex-col">
            {MILESTONES.map((milestone, index, array) => (
              <li key={milestone.year} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-label-lg font-bold text-on-primary shadow-cta">
                    {milestone.year}
                  </span>
                  {index < array.length - 1 ? <span className="w-0.5 flex-1 bg-outline-variant/50" /> : null}
                </div>
                <div className="pb-8">
                  <h3 className="text-title-md font-bold text-on-surface">{milestone.title}</h3>
                  <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant">{milestone.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <h2 className="text-headline-md font-bold text-on-surface">ทีมงาน</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <Card key={member.name} as="article" className="flex flex-col items-center gap-3 text-center">
                <span
                  className={`flex size-16 items-center justify-center rounded-full text-headline-md font-bold ${member.tone}`}
                >
                  {member.initial}
                </span>
                <div>
                  <h3 className="text-label-lg font-bold text-on-surface">{member.name}</h3>
                  <p className="text-caption font-semibold text-primary">{member.role}</p>
                  <p className="mt-1.5 text-caption text-on-surface-variant">{member.detail}</p>
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
              <p className="text-headline-sm font-bold">อยากร่วมงานหรือเป็นพาร์ตเนอร์กับเรา?</p>
              <p className="mt-0.5 text-body-md text-secondary-fixed">
                เรากำลังมองหาสหกรณ์ หน่วยงานวิจัย และนักวิชาการเกษตรที่อยากขยายผลร่วมกัน
              </p>
            </div>
          </div>
          <Link
            to="/support"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-on-secondary px-5 text-label-lg font-semibold text-secondary transition-transform duration-150 ease-tactile active:scale-[0.96]"
          >
            <Icon name="mail" size={18} />
            ติดต่อเรา
          </Link>
        </Card>
      </section>
    </MarketingShell>
  );
}
