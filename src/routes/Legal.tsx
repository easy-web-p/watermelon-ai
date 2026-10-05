import { MarketingShell } from '../components/layout/MarketingShell';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Link } from '../lib/router';

type Section = { heading: string; paragraphs: readonly string[]; bullets?: readonly string[] };

const PRIVACY: readonly Section[] = [
  {
    heading: '1. ข้อมูลที่เราเก็บรวบรวม',
    paragraphs: [
      'Watermelon AI เก็บรวบรวมข้อมูลเท่าที่จำเป็นต่อการให้บริการวิเคราะห์โรคพืชและการดูแลแปลงเพาะปลูกของคุณ',
    ],
    bullets: [
      'ข้อมูลบัญชี: ชื่อ-นามสกุล เบอร์โทรศัพท์ อีเมล และรหัสผ่านที่เข้ารหัสแบบทางเดียว',
      'ข้อมูลแปลงเพาะปลูก: ที่ตั้ง ขนาดพื้นที่ สายพันธุ์ที่ปลูก และวันที่เริ่มปลูก',
      'ภาพถ่ายที่คุณอัปโหลดเพื่อวินิจฉัยโรค รวมถึงไฟล์เสียงเคาะผล',
      'ข้อมูลการใช้งาน: หน้าที่เข้าชม ฟีเจอร์ที่ใช้ และเวลาที่ใช้งาน',
    ],
  },
  {
    heading: '2. วัตถุประสงค์ในการใช้ข้อมูล',
    paragraphs: [
      'เราใช้ข้อมูลของคุณเพื่อให้บริการวินิจฉัยโรคที่แม่นยำ ปรับคำแนะนำให้ตรงกับบริบทแปลงของคุณ ส่งการแจ้งเตือนที่เกี่ยวข้อง และพัฒนาคุณภาพของโมเดล AI',
      'ภาพถ่ายที่นำไปใช้ฝึกโมเดลจะถูกลบข้อมูลระบุตัวตนและพิกัดที่แม่นยำออกก่อนเสมอ และคุณสามารถปิดการยินยอมนี้ได้ทุกเมื่อจากหน้าตั้งค่าความเป็นส่วนตัว',
    ],
  },
  {
    heading: '3. การเปิดเผยข้อมูลแก่บุคคลที่สาม',
    paragraphs: [
      'เราไม่ขายข้อมูลส่วนบุคคลของคุณให้แก่บุคคลที่สามไม่ว่ากรณีใด เราเปิดเผยข้อมูลเฉพาะกับผู้ให้บริการที่จำเป็นต่อการดำเนินงาน เช่น ผู้ให้บริการคลาวด์ในประเทศไทย ผู้ให้บริการเกตเวย์ชำระเงิน และผู้ให้บริการส่ง SMS ซึ่งทุกรายผูกพันตามสัญญารักษาความลับ',
      'ในกรณีที่ต้องเปิดเผยตามคำสั่งศาลหรือกฎหมาย เราจะแจ้งให้คุณทราบล่วงหน้าเท่าที่กฎหมายอนุญาต',
    ],
  },
  {
    heading: '4. ระยะเวลาการเก็บรักษาข้อมูล',
    paragraphs: [
      'เราเก็บข้อมูลบัญชีและข้อมูลแปลงตลอดระยะเวลาที่คุณใช้งาน และเก็บต่ออีก 90 วันหลังปิดบัญชีเพื่อรองรับการกู้คืน หลังจากนั้นจะลบถาวร ยกเว้นข้อมูลทางบัญชีและภาษีที่กฎหมายกำหนดให้เก็บ 7 ปี',
    ],
  },
  {
    heading: '5. สิทธิ์ของเจ้าของข้อมูล',
    paragraphs: ['ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิ์ดังต่อไปนี้'],
    bullets: [
      'สิทธิ์ขอเข้าถึงและขอสำเนาข้อมูลของคุณ (มาตรา 30)',
      'สิทธิ์ขอให้แก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่เป็นปัจจุบัน (มาตรา 35)',
      'สิทธิ์ขอให้ลบหรือทำลายข้อมูล (มาตรา 33)',
      'สิทธิ์คัดค้านการเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูล (มาตรา 32)',
      'สิทธิ์ขอให้โอนย้ายข้อมูลไปยังผู้ควบคุมข้อมูลรายอื่น (มาตรา 31)',
    ],
  },
  {
    heading: '6. มาตรการรักษาความปลอดภัย',
    paragraphs: [
      'ข้อมูลทั้งหมดเข้ารหัสระหว่างการส่งด้วย TLS 1.3 และเข้ารหัสขณะจัดเก็บด้วย AES-256 จัดเก็บในศูนย์ข้อมูลภายในประเทศไทยที่ได้รับรองมาตรฐาน ISO 27001 เราจำกัดสิทธิ์การเข้าถึงข้อมูลเฉพาะพนักงานที่จำเป็น และบันทึกการเข้าถึงทุกครั้ง',
    ],
  },
  {
    heading: '7. ติดต่อเจ้าหน้าที่คุ้มครองข้อมูล',
    paragraphs: [
      'หากมีข้อสงสัยหรือต้องการใช้สิทธิ์ของเจ้าของข้อมูล ติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล (DPO) ได้ที่ dpo@watermelon.ai หรือโทร 02-123-4567 เราจะตอบกลับภายใน 30 วันนับจากวันที่ได้รับคำขอ',
    ],
  },
];

const TERMS: readonly Section[] = [
  {
    heading: '1. การยอมรับข้อกำหนด',
    paragraphs: [
      'การเข้าใช้งาน Watermelon AI ถือว่าคุณได้อ่าน เข้าใจ และตกลงผูกพันตามข้อกำหนดฉบับนี้ หากไม่ยอมรับ กรุณางดใช้บริการ',
    ],
  },
  {
    heading: '2. ลักษณะของบริการและข้อจำกัด',
    paragraphs: [
      'Watermelon AI เป็นเครื่องมือช่วยตัดสินใจ (decision support) ไม่ใช่การวินิจฉัยทางวิชาการที่ผูกพันตามกฎหมาย ผลวิเคราะห์ของระบบเป็นการประเมินความน่าจะเป็นจากภาพถ่ายและข้อมูลที่คุณให้มา',
      'ในกรณีที่ผลวิเคราะห์มีความมั่นใจต่ำกว่า 80% หรือพบความเสียหายเป็นวงกว้าง เราแนะนำอย่างยิ่งให้ปรึกษานักวิชาการเกษตรในพื้นที่เพื่อยืนยันก่อนตัดสินใจใช้สารเคมี',
    ],
  },
  {
    heading: '3. ความรับผิดชอบของผู้ใช้งาน',
    paragraphs: ['ผู้ใช้งานตกลงที่จะ'],
    bullets: [
      'ให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันในการสมัครและใช้งาน',
      'ไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือละเมิดสิทธิ์ผู้อื่น',
      'ปฏิบัติตามอัตราการใช้สารเคมีและระยะปลอดภัยก่อนเก็บเกี่ยว (PHI) ตามที่ฉลากผลิตภัณฑ์และกรมวิชาการเกษตรกำหนด',
      'ไม่เผยแพร่หรือจำหน่ายข้อมูลที่ได้จากระบบต่อบุคคลที่สามในเชิงพาณิชย์โดยไม่ได้รับอนุญาต',
      'รักษารหัสผ่านและรหัส OTP เป็นความลับ ไม่เปิดเผยให้ผู้อื่น',
    ],
  },
  {
    heading: '4. ข้อจำกัดความรับผิด',
    paragraphs: [
      'เราให้บริการตามสภาพที่เป็นอยู่ (as is) และไม่รับประกันว่าผลวิเคราะห์จะถูกต้องสมบูรณ์ในทุกกรณี เราไม่รับผิดต่อความเสียหายของผลผลิตที่เกิดจากการตัดสินใจของผู้ใช้งานโดยอาศัยคำแนะนำของระบบเพียงอย่างเดียว',
      'ความรับผิดสูงสุดของเราในทุกกรณีจำกัดไว้ไม่เกินค่าบริการที่คุณชำระในรอบ 12 เดือนล่าสุด',
    ],
  },
  {
    heading: '5. การชำระเงินและการยกเลิก',
    paragraphs: [
      'ค่าบริการเรียกเก็บล่วงหน้าตามรอบที่เลือก การต่ออายุเป็นไปโดยอัตโนมัติจนกว่าคุณจะยกเลิก คุณสามารถยกเลิกได้ตลอดเวลาจากหน้าตั้งค่าบัญชี และจะใช้งานได้จนสิ้นสุดรอบที่ชำระไว้แล้ว',
      'เรามีนโยบายคืนเงินเต็มจำนวนภายใน 14 วันแรกของการสมัครครั้งแรก',
    ],
  },
  {
    heading: '6. ทรัพย์สินทางปัญญา',
    paragraphs: [
      'โมเดล AI ซอฟต์แวร์ ฐานข้อมูลโรคพืช และเนื้อหาทั้งหมดบนแพลตฟอร์มเป็นทรัพย์สินทางปัญญาของ บริษัท วอเตอร์เมลอน เอไอ จำกัด ภาพถ่ายและข้อมูลแปลงที่คุณอัปโหลดยังคงเป็นกรรมสิทธิ์ของคุณ',
    ],
  },
  {
    heading: '7. การเปลี่ยนแปลงข้อกำหนด',
    paragraphs: [
      'เราอาจปรับปรุงข้อกำหนดฉบับนี้เป็นครั้งคราว โดยจะแจ้งให้ทราบล่วงหน้าอย่างน้อย 30 วันผ่านอีเมลและการแจ้งเตือนในแอป การใช้งานต่อหลังวันที่มีผลบังคับถือเป็นการยอมรับข้อกำหนดฉบับใหม่',
    ],
  },
];

function LegalPage({
  kind,
}: {
  kind: 'privacy' | 'terms';
}) {
  const privacy = kind === 'privacy';
  const sections = privacy ? PRIVACY : TERMS;

  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Badge tone="secondary">
          <Icon name={privacy ? 'policy' : 'gavel'} size={14} />
          {privacy ? 'นโยบายความเป็นส่วนตัว' : 'ข้อกำหนดการใช้งาน'}
        </Badge>

        <h1 className="mt-3 text-headline-lg font-bold text-on-surface lg:text-display-sm">
          {privacy ? 'นโยบายความเป็นส่วนตัว (PDPA)' : 'ข้อกำหนดและเงื่อนไขการใช้บริการ'}
        </h1>
        <p className="mt-2 text-body-lg text-on-surface-variant">
          {privacy
            ? 'เราให้ความสำคัญกับความเป็นส่วนตัวของข้อมูลแปลงและข้อมูลส่วนบุคคลของเกษตรกรทุกราย'
            : 'โปรดอ่านข้อกำหนดเหล่านี้อย่างละเอียดก่อนใช้บริการ Watermelon AI'}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-caption text-on-surface-variant">
          <Icon name="update" size={14} />
          ปรับปรุงล่าสุด 1 ตุลาคม 2569 • มีผลบังคับใช้ 1 พฤศจิกายน 2569
        </p>

        {!privacy ? (
          <Card className="mt-6 border-l-4 border-primary bg-melon-tint">
            <div className="flex items-start gap-3">
              <Icon name="info" size={22} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-body-md text-on-surface-variant">
                <span className="font-bold text-on-surface">ข้อควรทราบสำคัญ:</span> Watermelon AI
                เป็นเครื่องมือช่วยตัดสินใจ ไม่ใช่การวินิจฉัยที่ผูกพันตามกฎหมาย
                ก่อนตัดสินใจใช้สารเคมีในปริมาณมาก ควรปรึกษานักวิชาการเกษตรในพื้นที่เพื่อยืนยันผลเสมอ
              </p>
            </div>
          </Card>
        ) : null}

        <div className="mt-8 flex flex-col gap-6">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-headline-sm font-bold text-on-surface">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2 max-w-[75ch] text-body-lg leading-relaxed text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-body-lg text-on-surface-variant">
                      <Icon name="check_circle" size={17} className="mt-1.5 shrink-0 text-secondary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <Card className="mt-10 flex flex-wrap items-center justify-between gap-4 bg-surface-low">
          <div className="flex items-start gap-3">
            <Icon name="contact_support" size={22} className="mt-0.5 shrink-0 text-secondary" />
            <div>
              <p className="text-label-lg font-bold text-on-surface">มีคำถามเกี่ยวกับเอกสารฉบับนี้?</p>
              <p className="mt-0.5 text-body-md text-on-surface-variant">
                ติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลได้ที่ dpo@watermelon.ai
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={privacy ? '/terms' : '/privacy'}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/25 px-4 text-label-lg font-semibold text-on-surface transition-colors hover:bg-surface-container"
            >
              {privacy ? 'ดูข้อกำหนดการใช้งาน' : 'ดูนโยบายความเป็นส่วนตัว'}
            </Link>
            <Link
              to="/support"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-label-lg font-semibold text-on-primary shadow-cta transition-transform duration-150 ease-tactile active:scale-[0.96]"
            >
              ติดต่อเรา
            </Link>
          </div>
        </Card>
      </div>
    </MarketingShell>
  );
}

export function PrivacyPolicy() {
  return <LegalPage kind="privacy" />;
}

export function TermsOfService() {
  return <LegalPage kind="terms" />;
}
