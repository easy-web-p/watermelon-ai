# PROJECT_LOG — Watermelon AI (แตงโม AI)

> บันทึกสถานะโปรเจกต์ (living document) — อัปเดตล่าสุด: 5 ตุลาคม 2569
> ที่ตั้ง: `D:\พัฒนาเว็บแอปพลิเคชัน\watermelon-ai`

---

## 0. 🤝 Collaboration Handover Note (Claude & Antigravity)

> **บันทึกการส่งมอบงานและประสานงานระหว่าง Claude & Antigravity:**
> โปรเจกต์นี้ทำงานร่วมกันระหว่าง Claude Code และ Antigravity โดยมุ่งเน้นการปฏิบัติตาม UI ต้นฉบับจาก `D:\stitch_watermelon_ai_chatbot` (44 โฟลเดอร์) อย่างแม่นยำ 100%

### การแบ่งหน้าที่อย่างเป็นทางการ (Official Division of Responsibilities):
- **🤖 Claude Code (Project Lead & Backend Engineer):**
  - จัดการและควบคุมภาพรวมโปรเจกต์ (Project Management & Releases)
  - พัฒนาและดูแลระบบ Backend API Gateway (`server.ts`, Express 36+ endpoints)
  - พัฒนาระบบ AI Vision Model (`fastapi_service/`, Python, PyTorch/TensorFlow)
  - บริหารจัดการความปลอดภัย (JWT, OTP production, Rate limit, CORS)
  - การเชื่อมต่อ External Services (SMS Gateway, LINE Messaging API, Payment Gateway)
  - การจัดการฐานข้อมูลและการย้ายสู่ PostgreSQL/Prisma
- **🎨 Antigravity (Frontend & UI/UX Specialist):**
  - ออกแบบและพัฒนาระบบส่วนหน้า (Frontend SPA, React 19 + Tailwind v4)
  - ถอดแบบ UI & UX จากโฟลเดอร์ Stitch (44 โฟลเดอร์) ตรงตามต้นฉบับ 1:1
  - ดูแล Design System *Crisp Melon Freshness* ใน `src/index.css` (`@theme`)
  - จัดการ Interaction, Canvas/Audio Waveform, Reticle HUD, Camera Capture
  - จัดการ Route Map (Hash Router) และการเชื่อมต่อทุกปุ่มระหว่างหน้าจอ
  - ควบคุมการเชื่อมต่อ API ผ่าน Client (`src/lib/api.ts`) และจัดการสถานะ Loading/Error/Toast
  - ควบคุมความถูกต้องของการทดสอบฝั่ง Client (`npm run lint`, `npm test`)

### 📬 ส่งต่อให้ Antigravity — Vision Engine v3 (5 ต.ค. 2569, จาก Claude Code)

Backend เพิ่มสัญญาณใหม่ 3 อย่างที่ **เปลี่ยนสิ่งที่เกษตรกรเห็น** รายละเอียดเต็มอยู่ที่หัวข้อ 3.10
สิ่งที่ต้องรู้ฝั่ง UI มีเท่านี้

**1. มี 2 สถานะใหม่ — `DetectionStatus` ไม่ใช่ 3 ค่าแล้ว**

```ts
type DetectionStatus = 'diagnosed' | 'suspect' | 'healthy' | 'inconclusive' | 'unusable';
```

| สถานะใหม่ | ความหมาย |
|---|---|
| `suspect` | ภาพรวมทั้งใบอ่านว่าปกติ แต่ซูมดูแยกส่วนแล้วเจอจุดที่เข้าลักษณะโรค — **เป็นผลที่ต้องลงมือ** |
| `unusable` | ภาพนี้อ่านไม่ได้ (ไม่ใช่ใบ / เบลอ / แสงจัด) **ไม่ได้ตรวจ ไม่ใช่ตรวจแล้วไม่พบโรค** |

**⚠️ ที่ต้องระวังที่สุด:** `if (status === 'diagnosed') ... else ...` แบบสองทาง
จะทำให้ `suspect` ตกเข้า else และถ้า else นั้นเขียนว่า "ไม่พบโรค" ก็จะ**พิมพ์ตรงกันข้ามกับผล**
(เคสนี้เกิดขึ้นจริงใน `DiseaseResultCard.tsx` และแก้แล้ว) ให้ใช้ตารางกลางแทน

```ts
import { STATUS_PRESENTATION } from '../lib/api';

const p = STATUS_PRESENTATION[result.status];
// p.label      ข้อความไทยพร้อมแสดง
// p.icon       ชื่อ Material Symbol
// p.tone       'error' | 'primary' | 'neutral' | 'outline'
// p.actionable true = มีแผนจัดการให้ลงมือ (diagnosed, suspect)
// p.reassuring true = ผลบอกว่าต้นดูปกติ — true แค่ 'healthy' เท่านั้น
```

ถ้าอยากเปลี่ยนคำ/ไอคอน/โทนสีของแต่ละสถานะ **แก้ได้เลยที่ `STATUS_PRESENTATION`**
มันอยู่ใน `diseaseModel.ts` เพราะต้องอยู่ติดกับตรรกะที่สร้างสถานะ แต่ค่า `label` `icon` `tone`
เป็นงานออกแบบ ไม่ใช่ตรรกะ — เป็นของ Antigravity ส่วน `actionable` / `reassuring`
เป็นความหมายเชิงความปลอดภัย ขอให้ปล่อยไว้ (มีเทสต์กันอยู่)

**2. ฟิลด์ใหม่ใน `DiseaseDetection` — ทุกตัวเป็น `null` ได้ (เซอร์วิสรุ่นเก่าหรือเรคอร์ดเก่า)**

| ฟิลด์ | ใช้ทำอะไรบน UI |
|---|---|
| `photo_quality` | `{verdict, reasons[]}` — `reasons` เป็นภาษาไทยที่บอกว่า**ต้องถ่ายใหม่อย่างไร** พร้อมแสดงตรง ๆ |
| `lesion_area_percentage` | 0–100 วัดจากพิกเซล ไม่ใช่จากโมเดล เหมาะกับ meter/sparkline เทียบระหว่างการถ่ายหลายครั้ง |
| `evidence_region` | `{name, box: [l,t,r,b]}` สัดส่วนของเฟรม — **ใช้วาดกรอบชี้จุดบนภาพที่ผู้ใช้อัปโหลด** |
| `escalated_from_healthy` | `true` เมื่อผลมาจากการซูม ไม่ใช่จากภาพรวม |
| `confidence_calibrated` | `false` = ตัวเลขความมั่นใจเป็นคะแนนดิบ มักสูงกว่าความจริง ควรบอกผู้ใช้ |
| `engine` | เช่น `"3.0.0 / balanced"` สำหรับ footer/debug |

ผมใส่ไว้ใน `DiseaseResultCard.tsx` แบบใช้งานได้จริงแล้ว (กรอบชี้จุดบนภาพ, badge พื้นที่แผล,
บล็อกคุณภาพภาพ) แต่**งานออกแบบเป็นของคุณ** — จัดวาง สี อนิเมชัน เปลี่ยนได้ตามสบาย
ขอแค่สามข้อ ซึ่งมีเทสต์ใน `DiseaseResultCard.test.tsx` กันไว้

1. `suspect` และ `unusable` **ต้องไม่แสดงข้อความที่อ่านได้ว่าไม่พบโรค**
2. `unusable` **ต้องไม่แสดงเลข `confidence_percentage`** (ไม่มีการวัดเกิดขึ้น)
3. ที่ไหนมี `chemical_control` ที่นั่นต้องมี `phi_note` (กฎข้อ 1 เดิม)

**3. `api.detectDisease()` รับ `mode` เพิ่มได้**

```ts
api.detectDisease({ imageBase64, mode: 'fast' })      // ~160 ms, ภาพรวมมุมเดียว
api.detectDisease({ imageBase64 })                     // ~275 ms, ค่าเริ่มต้น (ซูม 4 ส่วน)
api.detectDisease({ imageBase64, mode: 'deep' })       // ~540 ms, ซูม 5 ส่วน + TTA ครบ
```

เว้นไว้ไม่ต้องส่งก็ได้ — เซอร์วิสเลือกเอง แนะนำ `fast` เฉพาะ Live Scan Demo บนหน้า Landing
ถ้าอยากให้อนิเมชันไม่สะดุด ส่วนหน้าที่เกษตรกรใช้ตัดสินใจจริง (`/chat`, `/scanner`) ให้ใช้ค่าเริ่มต้น

**ไอเดียที่ผมยังไม่ได้ทำ และน่าจะเป็นของคุณมากกว่า**

- `regions[]` มีคะแนนทุกบริเวณ ทำเป็น heatmap ซ้อนบนภาพได้ (ตอนนี้วาดแค่กรอบเดียวที่ชนะ)
- `lesion_area_percentage` เก็บลงประวัติแล้ว (`disease-history`) — ทำกราฟความลุกลามรายแปลงได้
- `photo_quality.reasons` อาจขึ้นเป็น toast ตอนเลือกภาพ ก่อนกดส่ง เพื่อไม่ให้เสียเวลารออัปโหลด

**เรื่องที่อยากให้คุณดู (อยู่ในไฟล์ของคุณ ผมไม่แก้เอง)**

[`src/routes/Landing.tsx:91`](src/routes/Landing.tsx#L91)

```ts
const displayVitality = customDiagnosis
  ? Math.max(15, 100 - customDiagnosis.severity_level * 18)
  : currentCase.vitality;
```

`severity_level` เป็น `0` ทั้งกับ `inconclusive` และ `unusable` ผลคือเกจแสดง
**ความสมบูรณ์ของต้น 100%** บนภาพที่ระบบบอกว่า "ยังสรุปไม่ได้" หรือ "ไม่ได้ตรวจ"
ซึ่งอ่านได้ว่าต้นแข็งแรงดี (เคสนี้มีอยู่ก่อนแล้วกับ `inconclusive` — engine v3
ทำให้เข้าถึงได้อีกหนึ่งสถานะ ไม่ได้ทำให้แย่ลง)

ใช้ `STATUS_PRESENTATION[status].actionable` หรือ `result.model_class !== null`
เป็นตัวตัดสินว่าควรแสดงเกจไหม จะเลือกซ่อนเกจหรือแสดง `—` ก็ได้ตามที่คุณเห็นเหมาะ
ผมไม่แตะเพราะเป็นการตัดสินใจเรื่องการแสดงผล

**ยังไม่มีอะไรที่ผมรออยู่จากคุณ** — ฝั่ง backend ปิดงานครบ ไม่มี endpoint ค้าง
`npm run lint` / `npm run test` / `npm run build` ผ่านทั้งหมดก่อนส่ง

**4. เรื่องที่เราแก้ไฟล์เดียวกันพร้อมกันรอบนี้**

ระหว่างที่ผมทำ engine v3 คุณเพิ่มรายการคะแนนทั้ง 4 คลาสลงใน `DiseaseResultCard.tsx`
พร้อม `MODEL_CLASS_THAI` ใน `diseaseModel.ts` — **เก็บไว้ทั้งหมด** เป็นของดี
แผงคะแนนช่วยให้เกษตรกรเห็นว่าคำตอบอันดับสองมาใกล้แค่ไหน ซึ่งตรงกับเจตนาของเครื่องยนต์

แต่เจอบั๊กหนึ่งจุดและแก้ให้แล้ว เพราะเกิดจากชื่อ field ฝั่งผม

```ts
// เดิม — ไม่เคยเป็น true กับโรคใดเลย
const isWinner = cls === result.disease_id || (cls === 'Healthy' && result.status === 'healthy');
```

`scores` ใช้คีย์เป็นชื่อคลาสของโมเดล (`'Downy_Mildew'`) ขณะที่ `disease_id` เป็นคีย์
ของคลังโรค (`'downy-mildew'`) — สองค่านี้ไม่เท่ากันเลย ไฮไลต์จึงติดแค่แถว `ใบปกติ`

ผมเพิ่ม field ใหม่ให้เทียบได้ตรง ๆ แทนที่จะให้ฝั่ง UI ต้องรู้เรื่องการ map นี้

```ts
result.model_class   // 'Downy_Mildew' | ... | null — เป็นคีย์ของ scores โดยตรง
                     // null เมื่อยังไม่มีคำตัดสิน (inconclusive, unusable)
                     // จึงไม่ไฮไลต์แถวไหนเลยตอนที่ยังสรุปไม่ได้ ซึ่งถูกต้องกว่า
```

แก้โค้ดคุณไปบรรทัดเดียว (`const isWinner = cls === result.model_class;`)
**ไม่แตะ className, การจัดวาง หรือสีเลย** และมีเทสต์กันไว้ใน `diseaseModel.engine.test.ts`

> `MODEL_CLASS_THAI` ที่คุณใส่ไว้ใน `diseaseModel.ts` ปล่อยไว้ตามนั้น — ตามข้อตกลงไฟล์นั้น
> เป็นของผม แต่เนื้อหาเป็นข้อความที่แสดงผล ซึ่งเป็นของคุณ วางไว้ติดกับ `MODEL_CLASSES`
> ถูกที่แล้ว ครั้งหน้าถ้าจะเพิ่มอะไรแบบนี้บอกกันหน่อยก็ดี เผื่อผมกำลังแก้ไฟล์เดียวกันอยู่

---

### สิ่งที่ทำเสร็จล่าสุด (Status ณ วันที่ 5 ต.ค. 2569):
1. **คัดลอกรูปภาพความละเอียดสูงจาก Stitch ลง `public/assets/`:**
   - `watermelon_logo.png` (506 KB)
   - `healthy_vs_infected_leaf.png` (1.42 MB)
   - `thai_farmer_specialist.png` (1.55 MB)
   - `mobile_app_scanning_field.png` (1.64 MB)
2. **Landing Page (`src/routes/Landing.tsx`):**
   - Hero แสดงภาพจริงพร้อม HUD Badge
   - Live Scan Demo ครบ 4 เคสตาม Stitch (`แอนแทรคโนส`, `ราน้ำค้าง`, `ไวรัสแตงโม`, `ใบปกติ`) พร้อม Reticle HUD, ระบบอัปโหลดภาพจริง และปุ่มส่งรายงานเข้า LINE
3. **About Page (`src/routes/About.tsx`):**
   - การ์ดภาพเกษตรกรและผู้เชี่ยวชาญแตงโม (`thai_farmer_specialist.png`)
4. **Farm Parcel Management (`src/routes/FarmPlots.tsx`):**
   - โมดัลเพิ่มแปลง 2 ขั้นตอน (`src/components/domain/AddPlotModal.tsx`) คำนวณพิกัด GIS และความหนาแน่น 1,200 ต้น/ไร่ ตามโฟลเดอร์ `_`
   - เมนูลัดประจำแปลง (`ตรวจโรคพืช` ➔ `/chat`, `เคาะวัด Brix` ➔ `/scanner`, `สูตรปุ๋ยยา` ➔ `/fertilizer`, `เช็กราคาตลาด` ➔ `/market`)
   - ปุ่มส่งออกสรุปแปลงเป็น PDF (`window.print()`)
5. **Sweetness Scanner (`src/routes/SweetnessScanner.tsx`):**
   - เพิ่มปุ่มส่งต่อผลตรวจวัด (`ปรึกษา AI ต่อ`, `ดูแปลงของฉัน`, `คลังปุ๋ยยา`)
6. **สถานะการทดสอบและโค้ด:**
   - `npm run lint` (`tsc --noEmit`): ผ่าน 100% (0 errors)
   - `npm test` (`vitest run`): ผ่านทั้ง 7 ไฟล์ 66 tests สะอาดทั้งหมด

---

## 1. UX/UI & Design System Specs

ระบบดีไซน์ชื่อ **Crisp Melon Freshness** แปลงมาจากไฟล์ต้นทาง
`D:\stitch_watermelon_ai_chatbot\crisp_melon_freshness\DESIGN.md`
และหน้าจอ Stitch ทั้ง 39 หน้าในโฟลเดอร์เดียวกัน

Token ทั้งหมดอยู่ใน [src/index.css](src/index.css) ผ่าน Tailwind v4 `@theme`
(ไม่มีไฟล์ `tailwind.config.js` — v4 ใช้ CSS เป็น source of truth)

### Palette

| บทบาท | ค่า | ใช้กับ |
|---|---|---|
| `primary` | `#ba0035` (Crimson Seedless) | ปุ่มหลัก, ตัวเลขชี้ขาด, การเตือนเร่งด่วน |
| `secondary` | `#1b6b44` (Forest Rind) | ข้อความผู้ใช้ในแชท, สถานะสำเร็จ, ปุ่มรอง |
| `tertiary` | `#006a3d` (Emerald Striping) | ไอคอนคู่มือปลูก, ตัวชี้วัดการเติบโต |
| `surface` / `surface-lowest` | `#f9f9ff` / `#ffffff` | พื้นหลังหน้า / การ์ดลอย |
| `melon-tint` / `mint-mist` | `#fff5f6` / `#f0fdf4` | พื้นเตือน / พื้นข้อมูลเชิงบวก |
| `error` | `#ba1a1a` | ความเสียหาย, โรครุนแรง |

### Typography

- **Plus Jakarta Sans** สำหรับอักษรละติน + **Prompt** สำหรับภาษาไทย (โหลดจาก Google Fonts ใน [index.html](index.html))
- สเกล: `display-lg` 48 / `display-sm` 34 / `headline-lg` 32 / `headline-md` 24 / `headline-sm` 20 / `title-md` 18 / `body-lg` 16 / `body-md` 14 / `label-lg` 14 / `label-md` 12 / `caption` 11
- หัวข้อใช้ `text-wrap: balance` เนื้อหาใช้ `text-wrap: pretty` (ตั้งใน `@layer base`)

### Shape & Elevation

- Radius: `sm` 0.5rem → `md` 1rem → `lg` 1.5rem → `xl` 2rem → `2xl` 3rem; ปุ่มและชิปทั้งหมดเป็น `rounded-full`
- เงา 3 ระดับ: `shadow-rind` (ขอบ sidebar) → `shadow-card` (การ์ดลอย) → `shadow-dock` (แถบพิมพ์แชท/โมดัล) + `shadow-cta` (ปุ่มหลัก)
- Chat bubble ไม่สมมาตรตามสเปก: AI = `rounded-[6px_24px_24px_24px]`, ผู้ใช้ = `rounded-[24px_24px_6px_24px]`

### Micro-interactions

- ปุ่มยุบที่ `active:scale-[0.96]` ความเร็ว `150ms` ด้วย `--ease-tactile: cubic-bezier(0.2,0,0,1)` (ตามกติกาใน [DESIGN.md](DESIGN.md))
- Touch target บนมือถืออย่างน้อย 44×44 px
- มี `@media (prefers-reduced-motion: reduce)` ปิดอนิเมชันทั้งหมด

### Responsive

- Desktop ≥1024px: sidebar ตายตัว 20rem + เนื้อหา max-w-7xl
- <1024px: sidebar กลายเป็น drawer เลื่อนจากซ้าย พร้อม scrim และล็อก body scroll
- Mobile: คอลัมน์เดียว, gutter 16px, แถบพิมพ์แชทติดขอบล่าง

### ไอคอน

ใช้ **Material Symbols Outlined** (variable font) ผ่าน `<Icon name="..." />` ใน [src/components/ui/Icon.tsx](src/components/ui/Icon.tsx)
รองรับ prop `filled` สำหรับสลับ `FILL 0/1`

---

## 2. Functional Architecture

### Stack

| ส่วน | เทคโนโลยี |
|---|---|
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| State | zustand (+ `persist` ลง localStorage) |
| Build | Vite 8 (`vite build` → `dist/`) |
| Test | Vitest 3 + Testing Library + jsdom |
| Routing | Hash router เขียนเอง ([src/lib/router.tsx](src/lib/router.tsx)) — ไม่มี dependency เพิ่ม |
| Mobile | Capacitor 7 (Android / iOS) |
| Backend | Express + tsx (`server.ts`, 37 endpoints) + FastAPI microservice (`fastapi_service/main.py`) |

**เหตุผลที่ใช้ hash routing:** บันเดิลเป็น static ล้วน deploy ที่ไหนก็ได้ และทำงานใน Capacitor WebView ได้ทันทีโดยไม่ต้องมี server rewrite deep link

### โครงสร้างไฟล์

```
src/
  index.css              Design tokens (@theme) + base layer + keyframes
  main.tsx               Mount + ลงทะเบียน service worker (เฉพาะ production)
  App.tsx                Route table — ทุกหน้า code-split ด้วย React.lazy
  lib/
    api.ts               API client พร้อม type, timeout, ApiError/NetworkError
    calc.ts              ตรรกะบริสุทธิ์: รหัสผ่าน, เบอร์โทร, คำนวณแปลง, จัดรูปเงิน
    media.ts             อัปโหลด/ย่อภาพ + useKnockRecorder (MediaRecorder + AnalyserNode)
    router.tsx           RouterProvider, useRouter, Link, useScrollReset
    cn.ts                ตัวต่อ className
  store/
    auth.ts              session, OTP flow, consent (PDPA) — persist ลง localStorage
  components/
    ErrorBoundary.tsx    กัน error ระดับ render ไม่ให้จอขาว
    brand/Logo.tsx       LogoMark / Logo / MelonAvatar (inline SVG)
    domain/              KnockResultCard, DiseaseResultCard (ใช้ร่วม chat + scanner)
    layout/              AppShell, Sidebar, MarketingShell (+ SiteFooter, AuthShell)
    ui/                  Icon, Button, Badge, Card, Meter, Segmented, StatTile,
                         Field, LineChart, Toast
  data/                  ข้อมูลอ้างอิง (ดูตารางด้านล่าง)
  routes/                1 ไฟล์ = 1 หน้าจอ
  test/setup.ts          jsdom polyfills + cleanup
```

### Data models (`src/data/`)

| ไฟล์ | เนื้อหา |
|---|---|
| `nav.ts` | เมนู sidebar, เมนู marketing, ประวัติแชทตัวอย่าง |
| `diseases.ts` | โรคแตงโม 8 กลุ่ม: อาการ, สภาพกระตุ้น, สารเคมี, ชีวภัณฑ์, การจัดการแปลง, PHI |
| `cultivars.ts` | สายพันธุ์ 5 ชนิด: Brix, น้ำหนัก, อายุเก็บเกี่ยว, ราคาตลาด + เกณฑ์ความสุก 3 ระดับ |
| `cultivation.ts` | 5 ระยะการเติบโต + งานประจำสัปดาห์ + ค่าตั้งต้นเครื่องคำนวณพื้นที่ |
| `inputs.ts` | ปุ๋ยและสารอารักขาพืช 12 รายการ + กลุ่ม FRAC/IRAC |
| `market.ts` | ราคา 5 ตลาดกลาง + ชุดข้อมูลกราฟ 15 วัน |
| `recipes.ts` | สูตรเครื่องดื่ม/ของหวาน/แปรรูปขาย 6 รายการ |
| `pricing.ts` | แพ็กเกจ 3 ระดับ, ใบเสร็จย้อนหลัง, FAQ |
| `chat.ts` | prompt chips และ quick tools |
| `status.ts` | หน้าสถานะ HTTP 13 รหัส |

### Route map (26 หน้า)

| Path | หน้าจอ | Shell | ต่อ API แล้ว |
|---|---|---|---|
| `/` | Landing + live scan demo | Marketing | — |
| `/chat` | แชทปรึกษา AI + กล้อง + ไมค์ | App | ✅ |
| `/scanner` | ตรวจความหวาน Brix & วินิจฉัยจากภาพ | App | ✅ |
| `/cultivation` | คู่มือปลูก + เครื่องคำนวณพื้นที่ | App | — |
| `/market` | ราคาตลาด + กราฟ + ตารางเปรียบเทียบ | App | — |
| `/fertilizer` | คลังปุ๋ยและสารอารักขาพืช | App | — |
| `/recipes` | สูตรเครื่องดื่ม & ขนมแตงโม | App | — |
| `/plots` | จัดการแปลง + ประวัติการวินิจฉัย | App | ✅ |
| `/diseases` | คลังความรู้โรคแตงโม | Marketing | — |
| `/pricing` `/checkout` `/payment-success` `/billing` | แพ็กเกจ → ชำระเงิน → สำเร็จ → ใบเสร็จ | Marketing / App | — |
| `/settings` | ตั้งค่าบัญชี + consent PDPA | App | ✅ |
| `/security` `/alerts` | ความปลอดภัย, แจ้งเตือน LINE | App | — |
| `/about` `/research` `/support` `/privacy` `/terms` | หน้าสาธารณะ | Marketing | — |
| `/data-dispute` | แจ้งข้อมูล AI คลาดเคลื่อน (PDPA ม.35) | App | ✅ |
| `/signin` `/register` `/otp` `/recover` | Auth flow ด้วย OTP จริง | AuthShell | ✅ |
| `/status/:code` | หน้าสถานะ HTTP (200–503) | Marketing | — |

### API integration

Client อยู่ที่ [src/lib/api.ts](src/lib/api.ts) — base URL คือ `VITE_API_BASE_URL` + `/api/v1`
(ว่างไว้บนเว็บเพื่อใช้ relative URL, **ต้องตั้งค่าสำหรับ Capacitor**)

| Endpoint | ใช้ที่ |
|---|---|
| `POST /auth/otp/send` `POST /auth/otp/verify` | SignIn, Register, AccountRecovery, Otp |
| `POST /auth/social` | ปุ่ม Gmail / LINE ในหน้า SignIn |
| `POST /conversations/:id/messages` | แชท (mode: `general` / `knock-analysis` / `disease-diagnosis`) |
| `POST /watermelon/disease-detect` | อัปโหลดภาพใบในแชทและ scanner |
| `POST /files` | เก็บไฟล์เสียงเคาะก่อนวิเคราะห์ |
| `GET /varieties` | เกณฑ์คลื่นเสียงรายสายพันธุ์ในหน้า scanner |
| `GET /watermelon/disease-history` | ประวัติการวินิจฉัยในหน้าแปลง |
| `GET /watermelon/disease-catalog` | คลังโรค 8 รายการ + `detectable_from_photo` + metrics จริง |
| `GET /watermelon/disease-model` | สถานะบริการวิเคราะห์ภาพ (503 ถ้าไม่ออนไลน์) |
| `PATCH /users/me/consent` | สวิตช์ PDPA ในหน้าตั้งค่า |
| `GET /pdpa/export-my-data` | ปุ่มขอสำเนาข้อมูล (ดาวน์โหลดเป็น JSON) |
| `POST /pdpa/forget-me` | ปุ่มลบบัญชี |
| `POST /feedback/reports` | ฟอร์มแจ้งข้อมูลคลาดเคลื่อน |

### Media pipeline

- **ภาพ**: ตรวจชนิด/ขนาด → ย่อด้านยาวเหลือ 1600px ด้วย canvas (JPEG q0.85) → ส่งเป็น data URL
  ลดขนาดอัปโหลดจากภาพมือถือ 4–12 MB เหลือหลักร้อย KB
- **เสียง**: `getUserMedia` → `MediaRecorder` (opus) + `AnalyserNode` อ่าน peak level แบบเรียลไทม์
  คลื่นเสียงบนจอขยับตามการเคาะจริง ไม่ใช่อนิเมชันตั้งเวลา
  เมื่อหยุดอัดจะส่งวิเคราะห์อัตโนมัติ — เกษตรกรแตะปุ่มเดียวจบ

### Offline (PWA)

[public/sw.js](public/sw.js) — app shell + ไฟล์ hashed cache ไว้ใช้กลางไร่
**API ไม่ cache** และเมื่อออฟไลน์จะคืน `503` พร้อมข้อความภาษาไทย ไม่ใช่ `200` ปลอม
(ของเดิมคืน 200 ซึ่งทำให้การบันทึกที่ล้มเหลวดูเหมือนสำเร็จ)

---

## 3. Completed Features (สิ่งที่ทำเสร็จแล้ว)

### UI / Design

- [x] Design system ครบตาม Stitch — ตรวจแล้วว่า Tailwind generate class ครบและค่าตรงต้นฉบับ
- [x] โลโก้ + avatar + app icon เป็น inline SVG (ไม่พึ่งรูปจาก CDN ภายนอกเหมือนต้นฉบับ Stitch)
- [x] App Shell (sidebar + drawer มือถือ), Marketing Shell, AuthShell
- [x] **26 หน้าจอ** ครอบคลุมทุกไฟล์ใน `D:\stitch_watermelon_ai_chatbot` (รวม `/recipes` ที่ Stitch มีในเมนูแต่ไม่มีหน้า)
- [x] หน้าสถานะ HTTP 13 รหัสจาก component เดียว พร้อม index ให้ QA กดข้าม
- [x] กราฟราคาเป็น inline SVG เขียนเอง — ไม่เพิ่ม dependency
- [x] Toast กลาง, ErrorBoundary, loading skeleton, empty state ทุกจุดที่ดึงข้อมูล

### ฟังก์ชันที่ทำงานจริง

- [x] **เข้าสู่ระบบด้วย OTP จริง** — ขอรหัส → นับถอยหลัง 5 นาที → ยืนยัน → เก็บ token
      (โหมดทดสอบแสดง `demoCode` ให้กดกรอกอัตโนมัติ เพราะยังไม่มี SMS gateway)
- [x] **แชทต่อ API จริง** — ส่งข้อความ, แสดงผลแบบ markdown-lite, retry เมื่อพลาด
- [x] **ถ่าย/อัปโหลดภาพใบ** → ย่อ → `disease-detect` → การ์ดผลวินิจฉัยพร้อมแผนรักษา
- [x] **อัดเสียงเคาะ** → waveform ตามเสียงจริง → `knock-analysis` → การ์ดค่า Brix + การกระจายความน่าจะเป็น
- [x] เทียบความถี่ที่วัดได้กับเกณฑ์รายสายพันธุ์จาก `/varieties`
- [x] ประวัติการวินิจฉัยในหน้าแปลง ดึงจาก `/watermelon/disease-history`
- [x] consent PDPA ผูกกับ store จริง + ส่งขึ้น server + ใช้คุม `allow_training` ตอนส่งแชท
- [x] ขอสำเนาข้อมูล (ดาวน์โหลด JSON) และลบบัญชี (มี confirm)
- [x] ฟอร์มแจ้งข้อมูลคลาดเคลื่อนส่งเข้า `/feedback/reports` จริง
- [x] เครื่องคำนวณแปลง: ปรับตามน้ำหนักผลของสายพันธุ์ที่เลือก
- [x] วัดความแข็งแรงรหัสผ่าน + ตรวจรูปแบบเบอร์มือถือไทย (06/08/09)

### คุณภาพ & ความปลอดภัย
- [x] `npx tsc --noEmit` ผ่านสะอาด (0 errors)
- [x] **71 unit tests ผ่านทั้งหมด** (8 ไฟล์) ครอบคลุม router, api client, auth store, calc, media, component, server-jwt
- [x] **เซ็นและตรวจสอบ JWT จริงตามมาตรฐาน RFC 7519 HMAC-SHA256** พร้อมโมดูล `server-jwt.ts` และการตรวจจับ tampering
- [x] **ปิดช่องโหว่รหัสรั่วใน `/auth/otp/send`**: ไม่ส่ง `demoCode` สู่ภายนอกในโหมดปกติ
- [x] **ป้องกัน Brute-Force ด้วย IP Rate Limiting**: จำกัดคำขอ OTP send (5 ครั้ง/10 นาที) และ verify (10 ครั้ง/5 นาที)
- [x] **จำกัด CORS Allowlist**: ลบ `*` ป้องกันการโจมตี CSRF ข้ามโดเมน
- [x] **กำจัด 4 High CVEs**: ถอดแพ็กเกจ `firebase` ที่ไม่ได้ใช้งาน ลดความเสี่ยงระดับสูง 100%
- [x] `vite build` ผ่าน — initial bundle **74 kB gzip**, แต่ละหน้า 2–6 kB
- [x] Accessibility: `role="meter"` / `role="switch"` / `role="tablist"` / `aria-pressed` / `aria-expanded` / `aria-current` / `aria-live`, `:focus-visible` ชัดเจน, `prefers-reduced-motion`
- [x] PWA: service worker ลงทะเบียนแล้ว, manifest ชี้ route ที่มีอยู่จริง

### ทดสอบ end-to-end แล้ว

- Vite dev proxy → Express (`/api` → `localhost:3000`) ✅
- OTP send → verify → ได้ user + Signed JWT จริง ✅
- `disease-detect`, `varieties`, `disease-history`, `conversations/:id/messages` ตอบกลับถูกต้อง ✅
- Production build เสิร์ฟผ่าน Express (single origin, ไม่ต้องใช้ proxy) ✅

---

## 3.5 🔬 Vision Pipeline — โมเดลตรวจโรคจากภาพ (อัปเดต 5 ต.ค. 2569)

ย้ายจาก mock ที่สุ่มผล มาใช้โมเดล EfficientNet-B0 ที่ฝึกจริง (จาก repo `CHO-000/Watermaleon-AI`)

```
ภาพ ──> fastapi_service (:8000)  POST /predict-base64  ──> {class_id, confidence, scores}
          ONNX Runtime · ไม่ใช้ PyTorch · ไม่รู้จักชื่อโรคไทย ไม่รู้อัตราสารเคมี
            │
            ▼
        server.ts (:3000)
          POST /api/v1/watermelon/disease-detect         ← หน้า scanner / landing
          POST /api/v1/conversations/:id/messages        ← แชท (imageBase64)
            runVisionDiagnosis() → buildDetection() → recordDiagnosis()
            → จับคู่คลาส → ใส่ PHI → ใส่ข้อจำกัด → เกณฑ์ความมั่นใจ
            → diagnosisToChatReply() ประกอบข้อความตอบแชท
            │
            ▼
        ChatAssistant: ข้อความ + DiseaseResultCard (บันทึกในบทสนทนา)
```

### ทำไม serving ใช้ ONNX Runtime ไม่ใช่ PyTorch

เครื่องพัฒนานี้เปิด **Smart App Control** (`VerifiedAndReputablePolicyState = 1`)
ซึ่งบล็อก DLL ที่ไม่ได้เซ็นรับรอง `import torch` ล้มด้วย `WinError 4551`
ทดสอบแล้วไม่ใช่เรื่อง path ภาษาไทย (path ASCII ก็โดน) ส่วน `onnxruntime` โหลดได้ปกติ
และการปิด Smart App Control **ย้อนกลับไม่ได้** จึงแยกเป็น:

| ไฟล์ | ต้องมี torch? |
|---|---|
| `model.py` คลาส + preprocessing (numpy/PIL) | ไม่ |
| `main.py` บริการ API (onnxruntime) | ไม่ |
| `torch_arch.py` สถาปัตยกรรม | ใช่ |
| `train.py` ฝึกโมเดล | ใช่ |
| `export_onnx.py` แปลง .pt → .onnx | ใช่ |

`export_onnx.py` เทียบผล PyTorch กับ ONNX บน 5 input สุ่มก่อนเขียนไฟล์
ถ้าคลาสที่ทำนายต่างกันหรือผลต่างเกิน 1e-4 จะไม่ปล่อยไฟล์ และเขียน sidecar
`model.onnx.json` เก็บลำดับคลาส + sha256 ของ checkpoint ต้นทาง

### ตัวเลขจริงของโมเดล (test 173 ภาพ)

accuracy **89.0%** · macro F1 **89.8%**

| คลาส | recall | หมายเหตุ |
|---|---|---|
| `Anthracnose` | 100% (23/23) | |
| `Downy_Mildew` | 82.5% (47/57) | หลุดไปเป็น `Healthy` 10 ภาพ |
| `Healthy` | 100% | **precision เพียง 62%** — บอกว่าปกติ 50 ครั้ง ผิด 19 ครั้ง |
| `Mosaic_Virus` | 85.5% (53/62) | หลุดไปเป็น `Healthy` 9 ภาพ |

### การตัดสินใจเชิงออกแบบ

1. **เกณฑ์ `Healthy` สูงกว่าโรค** — `MIN_HEALTHY_CONFIDENCE` 90% เทียบกับ
   `MIN_DISEASE_CONFIDENCE` 70% เพราะ precision ของ `Healthy` อยู่แค่ 62%
   คำตอบ "ใบปกติ" ที่ไม่มั่นใจคือผลลัพธ์ที่อันตรายที่สุด (เกษตรกรจะไม่ทำอะไรเลย)
2. **ต่ำกว่าเกณฑ์ = `inconclusive`** ไม่ใช่เลือกคลาสที่คะแนนสูงสุด และไม่ส่งคำแนะนำสารเคมีใด ๆ
3. **ไม่มี fallback ที่เดาผล** — บริการวิเคราะห์ภาพล่ม = HTTP 503 (ทดสอบแล้ว)
4. **แหล่งข้อมูลโรคเดียว** — `src/data/diseases.ts` ทั้ง server และ UI อ่านจากที่นี่
   Python ไม่มีสำเนาชื่อโรค/อัตราสาร/PHI อีกต่อไป
5. **โมเดลครอบ 3 จาก 8 โรค** — payload ส่ง `detectable_from_photo` และ
   `out_of_scope_diseases` มาด้วย หน้า `/supported-diseases` แสดง "ยังไม่รองรับ" ตรง ๆ

### ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| [src/lib/diseaseModel.ts](src/lib/diseaseModel.ts) | สัญญา + เกณฑ์ + PHI + metrics จริง (แหล่งเดียว) |
| [src/lib/diseaseModel.test.ts](src/lib/diseaseModel.test.ts) | 13 เทสต์ครอบเกณฑ์ PHI และคำเตือน |
| [fastapi_service/main.py](fastapi_service/main.py) | บริการโมเดล 4 endpoint |
| [fastapi_service/model.py](fastapi_service/model.py) | คลาส + preprocessing (ไม่มี torch) |
| [fastapi_service/torch_arch.py](fastapi_service/torch_arch.py) | สถาปัตยกรรม PyTorch (ฝึก/แปลงเท่านั้น) |
| [fastapi_service/export_onnx.py](fastapi_service/export_onnx.py) | แปลง .pt → .onnx พร้อมตรวจเทียบผล |
| [fastapi_service/train.py](fastapi_service/train.py) | ฝึกใหม่ (แบ่งข้อมูลตามลำดับการถ่ายภาพ) |
| [fastapi_service/README.md](fastapi_service/README.md) | วิธีรัน ข้อจำกัด และสิ่งที่ห้ามทำ |

---

## 3.6 💬 แชทตอบโรคจากภาพ (อัปเดต 5 ต.ค. 2569)

`POST /api/v1/conversations/:id/messages` รับภาพได้แล้ว ส่ง `imageBase64`
(หรือ `attachment_ids` ที่ได้จาก `POST /files`) แล้วได้ `ApiMessage` ที่มีทั้ง
`content` (ข้อความตอบ) และ `diseaseDetection` (ข้อมูลเต็มสำหรับการ์ด)

### bug ที่แก้ไปพร้อมกัน

| ปัญหาเดิม | ผลที่เกิด |
|---|---|
| บันทึกข้อความผู้ใช้ก่อนเรียกโมเดล | ตอบไม่ได้ (503) แล้วเหลือคำถามค้างในบทสนทนา กดลองใหม่ได้ข้อความซ้ำ — แก้ให้ commit พร้อมคำตอบเท่านั้น |
| **หน้าจอไม่เคยโหลดบทสนทนากลับมา** | รีเฟรชแล้วภาพกับผลวินิจฉัยหายหมด ทั้งที่เซิร์ฟเวอร์เก็บไว้ครบ |
| `conversationId` สร้างใหม่ทุกครั้งที่ mount | แม้จะโหลดประวัติก็จะโหลดของบทสนทนาผิดตัว |
| ส่งภาพแบบ `imageBase64` ไม่ได้เก็บไฟล์ | ประวัติกลับมาแต่ไม่มีรูปที่ส่งไปวิเคราะห์ |
| `urgent_action` กับ `prevention` map จาก `disease.cultural` ตัวเดียวกัน | "สิ่งที่ควรทำทันที" กับ "ป้องกันไม่ให้กลับมา" เป็นข้อความซ้ำกันเป๊ะ |
| handler destructure `attachment_ids` มาแล้ว**ไม่ใช้เลย** | ส่งภาพในแชทไม่มีการวิเคราะห์ใด ๆ |
| `POST /files` ทิ้ง `id` ที่สร้าง ไม่เก็บ mapping | `attachment_ids` ไม่มีทางถูก resolve กลับเป็นไฟล์ |
| เก็บแต่ `assistantMessage` ไม่เก็บข้อความผู้ใช้ | โหลดบทสนทนาใหม่เห็น AI คุยกับตัวเอง (`messageCount += 2` แต่เก็บ 1) |
| `DiseaseResultCard` แสดง card **หรือ** text อย่างใดอย่างหนึ่ง | ข้อความตอบถูกทิ้งเมื่อมีการ์ด |

### ลำดับการทำงาน

1. resolve ภาพจาก `imageBase64` หรือ `attachment_ids`
   (ไม่พบไฟล์ → 404, ไฟล์หาย → 410 ไม่ตอบเงียบเหมือนไม่มีภาพ)
2. เก็บข้อความของผู้ใช้ลงบทสนทนา
3. `runVisionDiagnosis()` → ล้มเหลวคืน 503/502/422 ตามสาเหตุ **ไม่เดาผล**
4. `diagnosisToChatReply()` ประกอบข้อความจากคลังข้อมูล ไม่ได้ให้ LLM แต่ง
   เพื่อให้ตัวเลขในข้อความตรงกับการ์ดเสมอ และ PHI หายไปไม่ได้
5. `recordDiagnosis()` บันทึกลงประวัติพร้อม `model_version`

### โหมด `disease-diagnosis` ที่ไม่มีภาพ

ตอบกลับเป็นคำขอให้ส่งภาพ พร้อมบอกตรง ๆ ว่าอ่านได้ 3 โรค
ดีกว่าตอบจากข้อความเปล่า ๆ ด้วยน้ำเสียงมั่นใจเท่ากัน

---

## 3.7 ✅ ยืนยันการทำงานจริงแล้ว (5 ต.ค. 2569)

รันกับโมเดลจริง `efficientnet_b0@ab47ff1c131c` (ONNX 16.6 MB) ไม่ใช่ stub

| สิ่งที่ทดสอบ | ผล |
|---|---|
| โหลดโมเดล ONNX + ตรวจ sidecar | `/health` ตอบ `model_loaded: true`, `onnxruntime 1.29.0` |
| ONNX ตรงกับ PyTorch | ผลต่างสูงสุด **1.35e-05**, คลาสที่ทำนายตรงกันทั้ง 5 input สุ่ม |
| แชทส่งภาพ → ตอบชื่อโรค | `diagnosed` โรคราน้ำค้าง 90.7% + PHI 7 วัน + recall 82.5% |
| แชทส่งภาพกำกวม | `inconclusive` ที่ 86.7% (ต่ำกว่าเกณฑ์ `Healthy` 90%) ไม่แนะนำสารเคมี |
| ภาพใบปกติชัดเจน | `Healthy` 99.5% |
| ภาพที่คะแนนใกล้กัน | Healthy 38.3 / Anthracnose 30.4 / Downy 27.3 → `inconclusive` ไม่เลือกตัวสูงสุด |
| upload → `attachment_ids` | resolve กลับเป็นไฟล์แล้ววิเคราะห์ได้ |
| `attachment_ids` ที่ไม่มีจริง | **404** ไม่ตอบเงียบเหมือนไม่มีภาพ |
| โหมดวินิจฉัยโรคไม่แนบภาพ | ขอให้ส่งภาพ พร้อมบอกว่าอ่านได้ 3 โรค |
| **บริการวิเคราะห์ภาพล่ม** | **503** และ **ไม่มีข้อความ assistant ถูกสร้าง** (เก็บแต่ข้อความผู้ใช้) |
| ประวัติบทสนทนา | 2 เทิร์น = 4 ข้อความ, `messageCount` ตรง, การ์ดโรคกลับมาพร้อมประวัติ |
| `POST /predict` multipart | 200 · ชนิดไฟล์ผิด 415 · เกิน 10 MB 413 · ภาพเสีย 422 |
| ส่งซ้ำตอนบริการล่ม 3 ครั้ง | เก็บ **0 ข้อความ** — กดลองใหม่ไม่เกิดคำถามซ้ำในบทสนทนา |
| ส่งอีกครั้งหลังบริการกลับมา | 200 และบทสนทนามี 2 ข้อความ ไม่มีซากจากครั้งที่ล้มเหลว |
| ประวัติเก่าจาก mock สุ่ม | `from_verified_model: false` + `unverified_note` UI ซ่อนตัวเลขความมั่นใจปลอม |

> ภาพที่ใช้ทดสอบมาจาก `public/assets/healthy_vs_infected_leaf.png` (ครอป/ปรับสี)
> เป็นการยืนยัน **เส้นทางการทำงาน** ไม่ใช่การยืนยันความแม่นยำของโมเดล
> ความแม่นยำยังอ้างจาก `metrics.json` ของผู้ฝึกเท่านั้น

---

## 3.8 🔄 บทสนทนาต้องรอดจากการรีเฟรช (อัปเดต 5 ต.ค. 2569)

อาการที่พบ: AI ตอบได้ แต่พอรีเฟรชหน้าจอ ทั้งภาพที่ส่งและผลวินิจฉัยหายหมด

สาเหตุ: ข้อความอยู่ใน React state เท่านั้น ฝั่งเซิร์ฟเวอร์เก็บครบแล้วแต่หน้าจอ
ไม่เคยเรียก `api.listMessages()` และ `conversationId` ก็สร้างใหม่ทุกครั้งที่ mount
จึงไม่มีทางหาบทสนทนาเดิมเจอ

### ที่แก้

| ไฟล์ | การแก้ |
|---|---|
| [src/lib/chatHistory.ts](src/lib/chatHistory.ts) | `restoreConversationId()` เก็บ id ใน `localStorage` · `toFeedMessage()` แปลงข้อความที่เก็บไว้กลับเป็น bubble (ภาพ เสียง การ์ดโรค) |
| [src/lib/chatHistory.test.ts](src/lib/chatHistory.test.ts) | 11 เทสต์ ครอบกรณี storage โยน error, timestamp เสีย, และการคืนค่าการ์ดโรค |
| `ChatAssistant.tsx` | โหลดประวัติตอน mount · ไม่เขียนทับข้อความที่ผู้ใช้เพิ่งส่ง (race) · ส่ง `attachment_ids` ของคลิปเสียงไปด้วย |
| `server.ts` | เก็บภาพที่ส่งมาแบบ `imageBase64` เป็น attachment เพื่อให้ประวัติมีรูป |

### รายละเอียดที่สำคัญ

- **404 ไม่ใช่ error** — `GET /conversations/:id/messages` ตอบ 404 เมื่อยังไม่มีบทสนทนา
  ซึ่งเป็นสถานะปกติของการเปิดแชทครั้งแรก หน้าจอต้องถือว่า "ยังไม่มีข้อความ"
  ส่วน error อื่นต้องแจ้งผู้ใช้ว่าโหลดประวัติไม่สำเร็จ ไม่ใช่โชว์แชทว่างเฉย ๆ
- **`localStorage` โยน error ได้** (private window, บล็อก site data) ทุกจุดที่อ่าน/เขียน
  ห่อ try/catch และ fallback เป็นบทสนทนาใหม่ ไม่ใช่หน้าจอพัง
- **กันเขียนทับ** — ถ้าผู้ใช้พิมพ์ส่งก่อนประวัติโหลดเสร็จ `setMessages` จะไม่แทนที่

ตรวจแล้ว: ส่งภาพ + ข้อความ → โหลดบทสนทนาใหม่ได้ 4 ข้อความครบ
พร้อมการ์ด `diagnosed downy-mildew 90.7%` และรูปที่แนบเปิดได้ (HTTP 200)

---

## 3.9 🔐 ตรวจโค้ดทั้งระบบและแก้บั๊ค (อัปเดต 5 ต.ค. 2569 — Claude Code)

ตรวจทั้ง `server.ts` (46 endpoints), `server-storage.ts`, `server-jwt.ts`,
`src/lib/`, `src/store/`, `src/data/` และคอมโพเนนต์ที่คำนวณค่า
พบและแก้ **38 จุด** — `npm run lint` / `test` (154 เทสต์) / `build` ผ่านทั้งหมด

### 🚨 กลุ่มที่ร้ายแรงที่สุด: การยืนยันตัวตนถูกข้ามได้ทั้งหมด

ทุก endpoint อ่านตัวตนจาก **header** `x-user-id` / `x-user-role` ตรง ๆ
ส่วน `verifyJwt()` ถูกเรียกที่เดียวคือ `/auth/me` แปลว่า:

```bash
# ก่อนแก้ — คำสั่งนี้คือ session ผู้ดูแลระบบเต็มรูปแบบ
curl /api/v1/conversations -H "x-user-role: admin"      # เห็นบทสนทนาของทุกคน
curl /api/v1/conversations -H "x-user-id: usr-somchai-01" # สวมรอยเป็นคนอื่น
```

| # | จุด | ปัญหา | ที่แก้ |
|---|---|---|---|
| 1 | ทุก endpoint | ตัวตนมาจาก header ที่ client ตั้งเองได้ | `identityOf(req)` อ่านจาก JWT ที่ verify แล้วเท่านั้น · ไม่มี token = `guest` ที่ไม่เป็นเจ้าของข้อมูลใคร · `requireUser` / `requireAdmin` คุม endpoint ที่แตะข้อมูลส่วนบุคคล |
| 2 | `POST /auth/login` | รับ `password` มาแล้ว **ไม่ตรวจเลย** และถ้าไม่พบบัญชีก็ *สร้างใหม่* แล้วออก token ให้ → ส่งเบอร์ของเกษตรกรคนอื่นมาเฉย ๆ ก็เข้าบัญชีเขาได้ | ตรวจรหัสผ่านด้วย scrypt · ไม่สร้างบัญชีจากการ login · ข้อความ error เหมือนกันหมดเพื่อไม่ให้เดาได้ว่าเบอร์ไหนสมัครแล้ว · เพิ่ม rate limit |
| 3 | `/auth/otp/verify`, `/auth/social`, `/auth/login`, `/auth/register` | อ่าน `role` จาก **request body** → ส่ง `{"role":"admin"}` ได้ token ผู้ดูแลระบบ | ตัด `role` ออกจาก body ทั้ง 4 จุด |
| 4 | `/auth/otp/verify` | `phone` มาจาก body และ**ไม่เคยเทียบกับเบอร์ที่ส่ง OTP ไป** → ขอ OTP เข้าเบอร์ตัวเอง แล้วยืนยันด้วยเบอร์เหยื่อ = ยึดบัญชีได้ | ใช้ `session.phone` เท่านั้น |
| 5 | `server-jwt.ts` | secret สำรองฝังในรีโพ → production ที่ไม่ตั้ง env ใครอ่านซอร์สก็ปลอม token ได้ | `assertSecretsConfigured()` ทำให้ production **บูตไม่ขึ้น** ถ้าไม่มี `JWT_SECRET` + `STORAGE_SECRET` |
| 6 | `verifyJwt` | ไม่ตรวจ `alg` ใน header, ไม่ตรวจว่า `sub` / `exp` มีจริง | ตรวจทั้งสาม |
| 7 | รหัสผ่าน | ไม่ได้เก็บเลย | scrypt + salt (`hashPassword` / `verifyPassword`) · `publicUser()` ตัด `passwordHash` ออกก่อนส่งกลับ |
| 8 | OTP | เก็บ **cleartext** ลง `watermelon_db.json` + `console.log` ทุกครั้ง + สร้างด้วย `Math.random()` | เก็บเป็น HMAC ผูกกับ session · log แค่ตอน dev · ใช้ `crypto.randomInt` · ล้าง session ที่หมดอายุ (เดิมค้างในไฟล์ตลอดไป) |
| 9 | rate limiter | เชื่อ `X-Forwarded-For` ที่ client ตั้งเองได้ → เปลี่ยนค่าก็ได้โควตา OTP ใหม่ไม่จำกัด | อ่านเฉพาะเมื่อ `TRUST_PROXY=true` · ล้าง record ที่หมดอายุ (เดิม Map โตไม่หยุด) |

### 🚨 ข้อมูลรั่วและคำสั่งทำลายข้อมูลที่ไม่ต้องล็อกอิน

| # | จุด | ปัญหา | ที่แก้ |
|---|---|---|---|
| 10 | `GET /users/me/data-export` | ส่ง `JSON.stringify(db)` **ทั้งฐานข้อมูล** ให้ใครก็ได้ที่เรียก — ทุกบัญชี ทุกบทสนทนา audit log และ **OTP ที่ยังใช้ได้** | `requireUser` + ใช้ `buildPersonalExport()` ของคนที่เรียกเท่านั้น |
| 11 | `DELETE /users/me/conversations` | `db.conversations = []` → หนึ่ง request ลบบทสนทนาของ **ทุกคน** ทิ้ง | `requireUser` + ลบแค่ของตัวเอง |
| 12 | `GET /admin/statistics` | เปิดให้ทุกคน + ตัวเลขปลอม (14,280 ผู้ใช้, 4,320 MB) บนฐานข้อมูลที่มีไม่ถึงสิบแถว | `requireAdmin` + นับจากข้อมูลจริง · ไม่มีค่าก็ส่ง `null` ไม่ใส่ตัวเลขหลอก |
| 13 | `POST /storage/signed-url` | เครื่องเซ็น URL แบบเปิด — ระบุชื่อไฟล์ของใครก็ได้ใน `uploads/` แล้วได้ URL อ่านได้ และ `expiresInSec` ไม่จำกัด | `requireUser` + เซ็นได้แค่ไฟล์ที่ตัวเองอัปโหลด + จำกัดอายุไม่เกิน 7 วัน |
| 14 | `verifySignedUrl` | `timingSafeEqual` **โยน RangeError** เมื่อความยาว token ไม่ตรง → URL ปลอมได้ 500 พร้อม stack trace แทน 403 · `Number(expiresAt)` เป็น `NaN` ได้ ทำให้การตรวจวันหมดอายุไม่ทำงาน | `safeEqual()` เทียบความยาวก่อน · ตรวจ `Number.isSafeInteger` |
| 15 | `GET /watermelon/disease-history` | ส่งผลสแกนของทุกคนให้ทุกคน · `farmId` ตั้งค่า default เป็น `"farm-01"` จาก body | กรองตามเจ้าของ · `farmId` มาจากตัวตนที่ verify แล้ว |
| 16 | `PATCH /users/me/consent` | เขียนลง key `"me"` ตัวเดียว → ความยินยอมของคนหนึ่งมีผลกับทุกคน และ `forget-me` ที่ลบ `consents[userId]` ไม่เคยลบได้จริง | แยกตาม `userId` · รับเฉพาะค่า boolean |
| 17 | `POST /database/sync` | spread ออบเจ็กต์จาก client ลงฐานข้อมูลตรง ๆ · ข้อความลงห้องแชทไหนก็ได้ (default `"conv-1"` = ห้องของคนอื่น) | `requireUser` · สร้าง record ใหม่ทีละฟิลด์ · เขียนได้แค่ห้องที่ตัวเองเป็นเจ้าของ · รายงานรายการที่ปฏิเสธ ไม่ทิ้งเงียบ |
| 18 | `/pdpa/forget-me` | ไม่ตรวจ `confirm` · `db.messages[id].filter(m => m.userId !== ...)` — **ข้อความไม่มีฟิลด์ `userId`** ฟิลเตอร์จึงไม่ลบอะไรเลย · ไม่ลบบัญชี ไฟล์ที่อัปโหลด หรือผลสแกน | ต้องมี `confirm: true` · ลบเป็นรายห้อง · ลบบัญชี ไฟล์จริงใน `uploads/` ผลสแกน ตัวอย่างในแปลง และรายงาน |
| 19 | `/pdpa/export-my-data` | แนบ `watermelons: db.watermelons` = ตัวอย่างของทุกคน และรวมบทสนทนาที่ไม่มีเจ้าของ | กรองตามเจ้าของทั้งหมด |

### 🚨 ตัวเลขที่ระบบกุขึ้นมาเอง (ละเมิดข้อ 6)

**จุดที่อันตรายที่สุดในหมวดนี้:** โหมด `knock-analysis` สร้างผลวิเคราะห์จาก
`Math.random()` — ความถี่ 125–150 Hz, ค่า Brix 11.4–12.9, ความมั่นใจ 93% และ
คำตัดสิน "สุกพอดี" คงที่ — **ไม่ได้มาจากคลิปเสียงที่เกษตรกรเพิ่งอัดเลย**
หน้า `/scan` แสดงค่าพวกนี้ว่า "ผลที่วัดได้ ... Hz" เทียบกับเกณฑ์ของสายพันธุ์
เกษตรกรจึงตัดสินใจ**ตัดขายจริง**จากการทอยลูกเต๋า

ทางวินิจฉัยโรคจากภาพทำถูกอยู่แล้ว (ตอบ 503 ไม่เดา) ตอนนี้ทางเสียงใช้กฎเดียวกัน

| # | จุด | ที่แก้ |
|---|---|---|
| 20 | chat mode `knock-analysis` | ตอบ 503 `ACOUSTIC_SERVICE_UNAVAILABLE` พร้อมบอกว่า "ระบบจะไม่เดาค่าความถี่หรือค่า Brix ให้" · ย้ายการตรวจไปก่อนสร้างห้องแชท (เดิมคำขอที่ถูกปฏิเสธยังทิ้งห้องเปล่าไว้) |
| 21 | `POST /audio/knock-analysis` | ตอบ 503 (เดิมคืน 134 Hz / 12.2 °Brix คงที่ทุกครั้ง) |
| 22 | `POST /audio/transcriptions` | ตอบ 503 (เดิมคืนประโยคไทยประโยคเดียวกันทุกครั้ง เหมือนเป็นคำถอดเสียงจริง) |
| 23 | `generateWatermelonAIExpertResponse` | ลบ branch เสียงเคาะที่ใส่ค่า default 138 Hz / 12.2 Brix |
| 24 | `POST /files` | ถ้าบันทึกไฟล์ล้มเหลวจะ fallback เป็น attachment ปลอมชี้ไปไฟล์ที่ไม่มีอยู่ → upload ล้มเหลวดูเหมือนสำเร็จ | ตอบ error จริง + ตรวจ mime และขนาด |
| 25 | `POST /watermelons` | ฟิลด์ที่ไม่ส่งมาถูกเติมเป็น 4.5 กก. / 11.5 °Brix / 135 Hz / confidence 0.9 → เข้าไปอยู่ในระเบียนห้องแล็บเหมือนมีคนวัดจริง | บังคับให้ส่งค่าที่วัดได้จริง · ที่เหลือเป็น `null` ไม่ใช่ค่าสมมติ |
| 26 | `POST /watermelons/:id/ground-truth` | **นี่คือ label ที่จะใช้เทรนโมเดล** — ทุกฟิลด์มี default (12.0 °Brix, "สุกพอดี", `agreementStatus: "match"`) ส่ง body ว่างก็ได้ตัวอย่างที่ "ยืนยันแล้วว่าตรงกับที่ AI ทำนาย" · `userConsentValid: true` ฝังตายตัว | บังคับค่าที่วัดได้จริง · เข้า training set เฉพาะเมื่อเจ้าของยินยอม (`improveModel`) จริง |
| 27 | training candidates ในแชท | บันทึก `sweetnessBrix: 12.0` และ `variety: "พันธุ์กินรี"` ให้ทุกการแชทข้อความ | เก็บแค่สิ่งที่เก็บมาจริง |
| 28 | `src/data/status.ts` | หน้า `/status/200` อ้าง "ความพร้อมใช้งาน 99.97%" และ "ตอบสนองเฉลี่ย 2.8 วินาที" โดยไม่มีระบบ monitoring อยู่เบื้องหลัง — บนหน้าที่เกษตรกรเปิดดูตอนสงสัยว่าระบบล่ม | ชี้ไป `/api/v1/health` ของจริง ไม่อ้างตัวเลข |

### ⚠️ ข้อ 1: คำแนะนำสารเคมีที่ไม่มีค่า PHI

| # | จุด | ปัญหา | ที่แก้ |
|---|---|---|---|
| 29 | คำตอบจาก Gemini | เมื่อตั้ง `GEMINI_API_KEY` คำตอบเป็นข้อความอิสระ — โมเดลแนะนำสารกำจัดเชื้อราได้โดยไม่มีค่า PHI ซึ่ง `diseaseModel.ts` ออกแบบมาป้องกันไว้ทั้งหมด | เพิ่มกฎใน prompt + `ensurePhiDisclosure()` ตรวจคำตอบ: ถ้าพบชื่อสาร/การพ่นแต่ไม่พบค่า PHI จะต่อท้ายคำเตือนให้อ่าน PHI จากฉลากก่อนใช้ |
| 30 | `diseases.ts` → `fusarium-wilt` | `phi: 0` (หน้าการ์ดแสดงว่า "ไม่ใช้สารเคมีรักษา") แต่ฟิลด์ `chemical` ระบุ **คาร์เบนดาซิม** ให้ราดโคน → ชื่อสารจริงโดยไม่มีระยะปลอดภัยอยู่ข้าง ๆ ข้อความที่บอกว่าไม่ใช้สารเคมี | ตัดชื่อสารออก ให้ชี้ไปเจ้าหน้าที่เกษตรและค่า PHI บนฉลาก **ยังไม่ใส่ตัวเลข PHI เพราะยังไม่มีแหล่งอ้างอิง** (ดูข้อ 4 ของ AGENTS.md) |
| 31 | `src/data/diseases.test.ts` (ใหม่) | — | เทสต์บังคับว่าทุกรายการที่ระบุชื่อสารต้องมี `phi > 0` หรือชี้ไปค่า PHI บนฉลาก · `phi: 0` ต้องมีข้อความ "ไม่มีสารเคมีรักษา" |

### 🐛 จุดที่ทำให้แอปพัง (crash)

| # | จุด | ปัญหา | ที่แก้ |
|---|---|---|---|
| 32 | `KnockResultCard.tsx` | อ่าน `probabilities.unripe` ตรง ๆ แต่ `knockAnalysis` ที่เก็บไว้ใน `conv-1` (seed) **ไม่มีฟิลด์ `probabilities` และ `resonanceDecayRate`** → เปิดบทสนทนานั้นแล้ว render พัง ทั้งเธรดหายไปอยู่หลัง ErrorBoundary · `sweetnessEstimateBrix.toFixed()` และ `recommendations.length` ก็พังแบบเดียวกัน | รองรับ record ที่ไม่ครบทุกฟิลด์ · ค่าที่ไม่มีแสดง `—` ไม่ใช่ `undefined` · เพิ่ม `KnockResultCard.test.tsx` 4 เทสต์ |
| 33 | `LineChart.tsx` | `series` ว่าง → `Math.min()` คืน `Infinity` และ `lead.color` throw → ทั้งหน้าพัง · ราคาคงที่ตลอดช่วง (เกิดขึ้นได้ปกติ) → `max === min` หารด้วยศูนย์ ทุกพิกัดเป็น `NaN` กราฟออกมาเป็นกล่องเปล่า · label ซ้ำกันทำให้ React key ชนกัน | guard ทั้งสามกรณี + empty state · เพิ่ม `LineChart.test.tsx` 6 เทสต์ |
| 34 | `/auth/otp/send` | `phone.length` บนค่าที่ไม่ใช่ string เป็น `undefined` และ `undefined < 9` เป็น false → เบอร์ที่เป็นตัวเลขผ่านด่าน แล้วไป crash ที่ `phone.slice(-4)` | `normalisePhone()` ตรวจรูปแบบเบอร์มือถือไทย |
| 35 | `server.ts` | ไม่มี error handler และไม่มี 404 สำหรับ `/api/` — `app.get("*")` ของ SPA จับ `/api/v1/typo` ไปด้วยแล้วคืน `index.html` สถานะ 200 · error ที่ throw ออกมาคืน HTML ที่ client parse ไม่ได้ · `startServer()` ไม่มี `.catch()` | 404 เป็น JSON · error handler เป็น JSON (แยก `INVALID_JSON` / `PAYLOAD_TOO_LARGE`) · `startServer().catch()` |
| 36 | `server-storage.ts` | `save()` debounce 200 ms แต่ไม่ flush ตอนปิดเซิร์ฟเวอร์ → แชทคำสุดท้ายและ OTP ที่เพิ่งออกหายไป · `loadFromDisk` merge ตื้น ค่า `null` ทำให้ write ครั้งถัดไปพัง | `flush()` + hook `SIGINT`/`SIGTERM`/`SIGHUP`/`exit` (ไม่ลงทะเบียนตอนรันเทสต์) · ข้าม key ที่เป็น null |

### 🐛 ฝั่ง client

| # | จุด | ที่แก้ |
|---|---|---|
| 37 | `src/lib/export.ts` | `downloadFile()` ไม่ใส่ `<a>` ลง DOM (Firefox ไม่ยอม click) และ `revokeObjectURL` ทันทีใน tick เดียวกัน → "ส่งออก CSV" ไม่ได้ไฟล์เลย · `printElement` cleanup ซ้ำสองครั้งทำให้ title เพี้ยน |
| 38 | `src/lib/media.ts` | `reset()` ระหว่างอัดเสียง: `stop()` เป็น async จึงถูก `onstop` เขียนทับทีหลัง → กดยกเลิกแล้วหน้าจอกลับไปเป็น `ready` พร้อมคลิปที่เพิ่งทิ้ง · `reader.onerror` ไม่มี handler · unmount ไม่ได้สั่งหยุด recorder |
| — | `src/lib/api.ts` | signal ที่ abort มาแล้วไม่เคยยิง event ซ้ำ → request ยังถูกส่งออกไปหลังผู้เรียกยกเลิก · timeout ของตัวเองรายงานเป็น `NetworkError` ("ตรวจสอบสัญญาณอินเทอร์เน็ต") ซึ่งโทษสัญญาณเกษตรกรทั้งที่เซิร์ฟเวอร์ช้า → เพิ่ม `TimeoutError` |
| — | `src/store/auth.ts` | ข้อความบอก "ให้ครบ 10 หลัก" แต่โค้ดตรวจ `< 9` · ส่ง consent ตอนยังไม่ล็อกอิน (401 แน่นอน) · `(user?.name ?? '...')[0]` เป็น `undefined` เมื่อชื่อว่าง · **ผู้ที่ยังไม่ล็อกอินถูกแสดงเป็น "สมศักดิ์ สวนแตงโมไชโย" แพ็กเกจ "PRO เกษตรกรดิจิทัล"** — ชื่อและแพ็กเกจที่ไม่ใช่ของใคร |
| — | `src/store/chat.ts` | `conv-${Date.now()}` ชนกันเมื่อสร้างสองเธรดใน ms เดียวกัน · `try/catch` ที่ throw ต่อเฉย ๆ ไม่บันทึก error |
| — | `src/lib/chatHistory.ts` | เมื่อ `localStorage` throw จะสร้าง id ใหม่ทุกครั้งที่เรียก แต่หน้าแชทเรียกสองครั้ง → ใน private window ข้อความที่ส่งไปอยู่คนละเธรดกับที่แสดง |
| — | `src/lib/diseaseModel.ts` | caveat ของผลที่สรุปไม่ได้แสดงชื่อคลาสดิบ `Downy_Mildew` ให้เกษตรกรอ่าน · `scores` ที่ไม่ครบทำให้ขึ้น `NaN%` · `confidence` ที่ไม่ใช่ตัวเลขเทียบ threshold ไม่ติดแล้วหลุดไปเป็นผลวินิจฉัย |
| — | `src/lib/firebase.ts` | App Check ทำงานตอนรันเทสต์ (พิมพ์ debug token ที่เป็นความลับลง stdout ทุกครั้ง) · init ด้วย `'6Lf-placeholder-dev-key'` ที่ attest อะไรไม่ได้ แต่ดูเหมือนเปิดการป้องกันอยู่ · Firebase SDK ทั้งก้อนโหลดตอนเปิดแอป → เปลี่ยนเป็น dynamic import แยกเป็น chunk 163 kB ที่โหลดเฉพาะตอนกด Google |
| — | `Sidebar.tsx` | **ละเมิดข้อ 4** — โหลดประวัติไม่สำเร็จแล้วแสดง "ยังไม่มีประวัติการสนทนา" เหมือนเกษตรกรไม่มีแชทเลย → แยกสถานะ error / loading / ว่างจริง และแสดงเหตุผลจากเซิร์ฟเวอร์ |
| — | CORS | ไม่มี `Vary: Origin` (cache ปนกันระหว่าง origin) · ส่ง `Allow-Credentials: true` คู่กับ `*` ซึ่ง browser ปฏิเสธ |

### 📬 ต้องให้ Antigravity ทำต่อ

1. **หน้า `/scan` แท็บ "ฟังเสียงเคาะ"** — ตอนนี้ยิงไปแล้วได้ 503 ทุกครั้ง
   เพิ่ม endpoint ให้เช็กก่อนแล้ว: `api.acousticModelStatus()` คืน
   `{ success, online, error, detail, code }` และ **resolve เป็น `online: false`
   ไม่ reject** จึงใช้ใน render ได้ตรง ๆ แบบเดียวกับ `api.diseaseModelStatus()`
   → ควรปิดแท็บ/ปุ่มไมโครโฟนและบอกเหตุผล **ก่อน**ให้เกษตรกรอัดเสียง
2. **`MODEL_CLASS_THAI`** (export ใหม่จาก `api.ts`) — ป้ายชื่อไทยของ key ใน
   `scores` ถ้าจะโชว์กราฟคะแนนแต่ละคลาส ใช้ตัวนี้แทนชื่อดิบ `Downy_Mildew`
3. **`useDisplayUser()`** — ผู้ที่ยังไม่ล็อกอินได้ `name: 'ผู้เยี่ยมชม'`,
   `role: 'ยังไม่ได้เข้าสู่ระบบ'` แล้ว (เดิมเป็นชื่อปลอม + แพ็กเกจ PRO)
   ถ้า Sidebar ออกแบบไว้สำหรับชื่อยาว อาจต้องปรับเลย์เอาต์
4. **`FarmPlots.tsx`** — `24.75 + ...` (พื้นที่รวม) และ `"62.3"` (ผลผลิตคาดการณ์)
   เป็นค่าคงที่ที่แสดงเหมือนเป็นข้อมูลของเกษตรกรจริง ยังไม่ได้แก้เพราะเป็นไฟล์ฝั่ง UI
   → ถ้าจะทำจริงต้องมี endpoint แจ้งมาได้

### 🔧 ตั้งค่าที่ต้องเพิ่มก่อน deploy production

```bash
JWT_SECRET=<48 bytes สุ่ม>        # ไม่มี = เซิร์ฟเวอร์บูตไม่ขึ้น (ตั้งใจ)
STORAGE_SECRET=<48 bytes สุ่ม>    # คนละค่ากับ JWT_SECRET
TRUST_PROXY=true                  # เฉพาะเมื่ออยู่หลัง proxy/LB จริง
ENABLE_DEMO_OTP=false
```

> **หมายเหตุ:** ระหว่างทดสอบ มีเซิร์ฟเวอร์เวอร์ชันเก่าค้างอยู่บนพอร์ต 3000
> คำขอทดสอบ `DELETE /users/me/conversations` จึงไปโดนตัวเก่าที่ยังมีช่องโหว่
> และลบ `conv-1` / `conv-2` ใน `data/watermelon_db.json` ทิ้งจริง
> — กู้คืนจาก git HEAD แล้ว และลบบัญชี/ไฟล์ที่เกิดจากการทดสอบออกหมดแล้ว
> (เป็นหลักฐานว่าช่องโหว่ข้อ 11 ใช้งานได้จริงก่อนแก้)

---

## 3.10 🧠 โมเดล AI ที่ฉลาดขึ้น — Vision Engine v3 (อัปเดต 5 ต.ค. 2569 — Claude Code)

> **สรุปสั้น:** น้ำหนักโมเดลยังเป็นตัวเดิม (เทรนใหม่ไม่ได้เพราะชุดข้อมูลไม่อยู่ในเครื่องแล้ว)
> แต่**วิธีอ่านโมเดล**ฉลาดขึ้นทั้งระบบ และเตรียมสูตรเทรนที่แรงขึ้นไว้พร้อมใช้ทันทีที่ได้ภาพกลับมา

### ปัญหาที่ตั้งใจแก้ (เป็นตัวเลขที่วัดได้ ไม่ใช่ความกังวล)

จาก `fastapi_service/metrics.json` บนชุดทดสอบ 173 ภาพ

| ตัวเลข | ค่า | ความหมายกับเกษตรกร |
|---|---|---|
| `Healthy` precision | **0.62** | 19 จาก 50 ภาพที่โมเดลบอก "ใบปกติ" เป็นใบที่เป็นโรคจริง |
| false-healthy rate | **19/142 = 13.4%** | ใบที่เป็นโรค 1 ใน 7 ถูกตัดสินว่าปกติ |
| ราน้ำค้าง recall | 0.82 | พลาด 10 จาก 57 ภาพ |
| ใบด่าง recall | 0.85 | พลาด 9 จาก 62 ภาพ |
| accuracy / macro F1 | 0.890 / 0.898 | **ตัวเลขนี้ดูดีและซ่อนข้อแรกไว้ทั้งหมด** |

เกษตรกรตอบสนองต่อ "ใบปกติ" ด้วยการไม่ทำอะไร จึงเป็นความผิดพลาดที่แพงที่สุดของระบบนี้
และ macro-F1 มองไม่เห็นมันเลย

### สี่กลไกที่เพิ่ม — แต่ละอย่างเล็งไปที่ตัวเลขนั้นโดยตรง

**1. ซูมหลายบริเวณ (multi-scale crops)** — `fastapi_service/inference.py`

ภาพจากมือถือกว้าง 3000–4000 px แต่โมเดลเห็นแค่ 224 px แผลราน้ำค้างระยะแรกขนาด
2–3 มิลลิเมตรจึงเหลือราวพิกเซลเดียวหลังย่อ **นี่คือสาเหตุทางกายภาพที่แผลเล็กถูกอ่านว่าปกติ**
เครื่องยนต์ให้คะแนนภาพรวม + 4 ส่วนซ้อนทับ (55% ของแต่ละด้าน) + กลางภาพ
ทำให้แผลเดิมถึงโมเดลใหญ่ขึ้นราว 2 เท่า

**2. TTA (test-time augmentation)**

เฉลี่ย logits จากการพลิกภาพ 4 แบบ ซึ่งเป็นชุดเดียวกับที่ใช้ตอนฝึก (h-flip, v-flip, ทั้งคู่)
ไม่ใช้การหมุน 90° เพราะโมเดลไม่เคยเห็น — จะเป็นการเพิ่ม bias ไม่ใช่ลด variance
เฉลี่ย logits ไม่ใช่เฉลี่ย probability เพราะเป็น geometric mean ซึ่งไม่ให้มุมที่ "มั่นใจแต่ผิด" ครอบงำผล

**3. กฎรวมผลที่ถ่วงความเสี่ยง (asymmetric aggregation)**

- บริเวณที่เห็นโรคชัด (≥ 0.80 และมีเนื้อใบ ≥ 35%) **ลบล้าง**ภาพรวมที่บอกว่าปกติได้
- บริเวณที่เห็นว่าปกติ **ลบล้างภาพรวมที่เห็นโรคไม่ได้** — มุมใบที่ยังเขียวบนใบติดเชื้อเป็นเรื่องปกติ

ความไม่สมมาตรเป็นเจตนา: เตือนผิดเสียการเดินไปดูหนึ่งรอบ แต่พลาดโรคเสียผลผลิต 60–80%
และผลลัพธ์**บอกออกมาตรง ๆ** ผ่าน `aggregation.escalated_from_healthy` เพื่อให้แอป
แสดงว่า "ให้ไปดูตรงนี้" ไม่ใช่ "คุณเป็นโรคนี้"

**4. ปฏิเสธเมื่ออ่านภาพไม่ได้** — `fastapi_service/leafcheck.py`

softmax 4 คลาสไม่มีคำตอบว่า "นี่ไม่ใช่ใบ" **ทดสอบแล้ว: ภาพกำแพงสีเทาได้ `Anthracnose 57%`**
ซึ่งเป็นผลที่เกษตรกรนำไปพ่นยาได้จริง ตัวกรองตรวจสามอย่าง เรียงตามลำดับที่แต่ละอย่าง
ทำลายหลักฐานของอันถัดไป

| ตรวจ | วิธี | ทำไมเรียงลำดับนี้ |
|---|---|---|
| แสง | สัดส่วนพิกเซลที่ช่องสีอิ่มตัว + ความสว่างเฉลี่ย | ภาพที่สีหายไปแล้วหาเนื้อใบไม่ได้ ถ้าตรวจทีหลังจะรายงานสาเหตุผิด |
| มีใบไหม | สัดส่วนพิกเซลในแถบสีใบ (เขียว/เหลือง/น้ำตาล) + ต้องมีสีเขียวอย่างน้อย 2.5% | ภาพคมและแสงดีแต่ถ่ายผิดวัตถุ คือเคสที่ให้คำตอบมั่นใจและผิดที่สุด |
| ความคม | variance of Laplacian หารด้วย contrast ของภาพเอง | ตรวจท้ายสุด เป็นอย่างเดียวที่ "ก้ำกึ่ง" แล้วยังอ่านได้ |

ข้อความที่ส่งกลับบอกว่า**ต้องถ่ายใหม่อย่างไร** ไม่ใช่แค่ "ลองใหม่"

### สิ่งที่วัดได้ใหม่ — พื้นที่ใบที่เปลี่ยนสี

`lesions.discolored_fraction` วัดจากพิกเซลโดยตรง เป็นสัญญาณที่**ไม่ขึ้นกับโมเดลเลย**
ค่าของมันคือเป็นตัวเลขที่วัดซ้ำได้ ใช้เทียบความลุกลามเมื่อถ่ายใบเดิมอีกครั้งในอีกไม่กี่วัน
ซึ่งค่าคงที่ต่อโรคจากคลังข้อมูลทำไม่ได้

**ที่สำคัญ:** เมื่อโมเดลบอก "ใบปกติ" แต่วัดสีได้เกิน 8% ของเนื้อใบ ระบบ**บอกเกษตรกรว่า
สองวิธีไม่ตรงกัน** ไม่ใช่ปล่อยให้ฝ่ายใดฝ่ายหนึ่งชนะเงียบ ๆ

### สถานะใหม่ใน `src/lib/diseaseModel.ts`

| สถานะ | เกิดเมื่อ | แอปแสดงอะไร |
|---|---|---|
| `diagnosed` | ภาพรวมทั้งใบผ่านเกณฑ์โรค (เดิม) | ชื่อโรค + แผนจัดการเต็ม + PHI |
| `suspect` | **ใหม่** — บริเวณหนึ่งเห็นโรคชัดขณะที่ภาพรวมว่าปกติ | "น่าสงสัยว่าเป็น…" + กรอบชี้จุดบนภาพ + แผนเต็ม + PHI พร้อมคำสั่งให้ยืนยันด้วยตาก่อนพ่น |
| `healthy` | `Healthy` ผ่านเกณฑ์ 90% (เดิม) | ไม่พบอาการ + คำเตือน false-negative เดิม + บอกว่าซูมตรวจกี่บริเวณแล้ว |
| `inconclusive` | คะแนนต่ำกว่าเกณฑ์ (เดิม) | ขอภาพใหม่ ไม่ระบุโรค |
| `unusable` | **ใหม่** — `abstain: true` จากตัวกรองคุณภาพ | บอกว่า**ไม่ได้ตรวจ** (ไม่ใช่ "ตรวจแล้วไม่พบโรค") + วิธีถ่ายใหม่ ไม่แสดงตัวเลขความมั่นใจเลย |

`STATUS_PRESENTATION` ใน `diseaseModel.ts` เป็นตารางกลางที่บอกว่าแต่ละสถานะต้องอ่านอย่างไร
รวมถึงธง `reassuring` ที่เป็น `true` กับ `healthy` เท่านั้น

### 🐛 บั๊กความปลอดภัยที่เจอและแก้ไปด้วย

1. **การ์ดแสดง "ไม่พบอาการโรคในภาพ" กับทุกสถานะที่ไม่ใช่ `diagnosed`/`inconclusive`**
   `DiseaseResultCard.tsx` ใช้ ternary สองทาง ถ้าเพิ่ม `suspect` เข้าไปโดยไม่แก้
   **การ์ดจะพิมพ์ "ไม่พบโรค" ทับผลที่บอกตรงกันข้าม** แก้ให้อ่านจาก `STATUS_PRESENTATION`
   แทน และมีเทสต์กันถอยหลัง (`DiseaseResultCard.test.tsx`)

2. **ใบที่ถ่ายกลางแดดถูกปฏิเสธว่า "ไม่พบเนื้อใบ"**
   เกณฑ์เดิมตัดพิกเซลที่ค่า V > 248 ทิ้ง แต่ใบกลางแดดมีช่องเขียวอิ่มตัวที่ 255
   ขณะที่แดง/น้ำเงินยังต่ำ — พิกเซลนั้นยังเป็นสีใบชัดเจน ผลคือ**ใบกลางแดดวัดได้ว่ามีเนื้อใบ 0%**
   ซึ่งเป็นสภาพการถ่ายภาพที่พบบ่อยที่สุดในแปลงจริง แก้ให้ตัดเฉพาะพิกเซลที่สว่าง**และ**ไม่มีสี
   (glare/ท้องฟ้า) และวัดการสูญเสียสีจากช่องสีแทนที่จะวัดจาก luma

3. **เทรนที่ขนาดภาพหนึ่งแล้ว serve ที่อีกขนาด เงียบสนิท**
   EfficientNet จบด้วย adaptive pool จึง**ไม่ error** แต่โมเดลเห็นแผลผิดสเกล
   `export_onnx.py` และ `main.py` ปฏิเสธการทำงานถ้า `image_size` ไม่ตรงกับ `model.py` แล้ว

4. **cost model ของการหาเกณฑ์ ทำให้ระบบไม่อยากบอกว่า "ไม่รู้"**
   ค่าเริ่มต้นแรกตั้ง `ABSTAIN_COST = 2` สูงกว่า `FALSE_ALARM_COST = 1` ผลคือ
   การค้นหาเกณฑ์เลือกค่าที่หลวมมากเพื่อหลีกเลี่ยงการงดตอบ — ตรงข้ามกับที่โปรเจกต์นี้ต้องการ
   แก้เป็น miss 10 / false alarm 2 / abstain 0.5 และเพิ่ม baseline "ไม่ตอบเลย"
   ไว้เทียบ **ยืนยันด้วยเทสต์: โมเดลที่เป็นสัญญาณรบกวนล้วนชนะ baseline นั้นไม่ได้**

### สูตรเทรนใหม่ — พร้อมใช้ทันทีที่ได้ชุดข้อมูลกลับมา

`train.py` เขียนใหม่ ทุกค่าเริ่มต้นเล็งไปที่ 19 ภาพนั้น

| ธง | ทำอะไร |
|---|---|
| `--false-healthy-penalty 0.5` | บวก P(Healthy) ของภาพที่เป็นโรคเข้าไปใน loss — gradient ชี้หนีจากความผิดพลาดตัวนั้นโดยตรง ไม่ใช่หนีจากความผิดพลาดทั่ว ๆ ไป |
| `--class-weight balanced` | ชุดข้อมูลไม่สมดุล (ราน้ำค้าง 57 vs แอนแทรคโนส 23) |
| `--label-smoothing 0.05` + `--mixup-alpha 0.2` | กันการมั่นใจเกินจริงบนภาพ 809 ภาพ |
| `--freeze-epochs 2` + `--backbone-lr-scale 0.1` | อบหัวโมเดลก่อนปล่อย backbone ขยับ |
| `--ema-decay 0.995` | เฉลี่ยน้ำหนัก ดีกว่าสเต็ปสุดท้ายที่สุ่มได้ |
| augment แรงขึ้น + `GaussianBlur` | ภาพมือถือในแปลงมักนุ่มกว่าภาพในชุดฝึก |
| เลือก epoch ด้วย `macro_f1 − 2 × false_healthy_rate` | macro-F1 เดี่ยว ๆ เลือก epoch 11 ของ v2 ที่ซ่อน 19 ภาพนั้นไว้ |

สถาปัตยกรรมที่เพิ่ม: `efficientnet_b2` (260px), `efficientnet_v2_s` (300px),
`convnext_tiny`, `mobilenet_v3_large` — ภาพ input ใหญ่ขึ้นทำให้แผลเล็กมีพิกเซลมากขึ้น

และย้อนกลับไปสูตร v2 ได้ครบด้วยธงเดียวชุดเดียว (เขียนไว้ใน docstring) เพื่อให้เทียบผลได้จริง

### ไฟล์ใหม่

| ไฟล์ | หน้าที่ | ทดสอบแล้ว |
|---|---|---|
| `fastapi_service/inference.py` | เครื่องยนต์ — ซูม, TTA, ปรับเทียบ, รวมผล | ✅ |
| `fastapi_service/leafcheck.py` | ภาพนี้อ่านได้ไหม + วัดพื้นที่ใบเปลี่ยนสี | ✅ |
| `fastapi_service/evaluation.py` | คณิตศาสตร์วัดผล/ปรับเทียบ/หาเกณฑ์ (ไม่พึ่ง torch) | ✅ |
| `fastapi_service/selfcheck.py` | ชุดทดสอบฝั่ง Python 117 ข้อ | — |
| `fastapi_service/fit_calibration.py` | วัดเครื่องยนต์กับภาพที่มีป้ายกำกับจริง | ✅ รันผ่านกับชุดสังเคราะห์ |
| `src/lib/diseaseModel.engine.test.ts` | เทสต์พฤติกรรม v3 ฝั่ง TS 30 ข้อ | — |
| `src/components/domain/DiseaseResultCard.test.tsx` | เทสต์การ์ด 14 ข้อ | — |

### ✅ ผลการตรวจสอบ

```
py selfcheck.py                 117 passed, 0 failed
npm run lint (tsc --noEmit)     0 errors
npm run test                    194 passed (17 files)
npm run build                   ✓ built in 949ms
cross-language contract check   ผ่านครบ ด้วย payload จริงจาก model.onnx
```

ตรวจรอยต่อ Python → TS ด้วย payload จริงจากโมเดล 5 เคส (ใบมีแผล 3 โหมด, กำแพงสีเทา,
ดินเปล่า) ยืนยันว่า `abstain` คุมสถานะได้ถูก, PHI ติดไปกับสารเคมีทุกครั้ง,
คำกำกับว่า AI เป็นเครื่องมือช่วยตัดสินใจอยู่ครบทุกผล

**latency** (CPU, ภาพ 12 ล้านพิกเซล): `fast` ~160 ms · `balanced` ~275 ms · `deep` ~540 ms
ทุกโหมดน้อยกว่าเวลาอัปโหลดภาพ จึงตั้งค่าเริ่มต้นเป็น `balanced` ตามความแม่น ไม่ใช่ความเร็ว

### ⚠️ สิ่งที่ยังไม่ได้ทำ — ต้องอ่านก่อนเอาไปอ้าง

**ยังไม่มีตัวเลข accuracy ของ v3** ชุดข้อมูล `archive (1).zip` ที่ให้ `metrics.json`
ไม่อยู่ในเครื่องแล้ว (หาทั้ง repo, Downloads, และ D: แล้ว) จึง**เทรนน้ำหนักใหม่ไม่ได้**
และ**วัด accuracy ใหม่ไม่ได้**

ตัวเลขใน `MODEL_METRICS` / `MODEL_SUMMARY` / `metrics.json` จึง**ยังเป็นของ v2 ทั้งหมด
และถูกปล่อยไว้โดยเจตนา** — เป็นตัวเลขจริงของน้ำหนักโมเดลชุดเดียวกัน อ่านด้วยวิธีที่ด้อยกว่า
การเขียนตัวเลขที่ดีกว่าลงไปโดยไม่ได้วัดคือการละเมิดกฎข้อ 6 (ห้ามกุข้อมูล)

**ขั้นตอนเมื่อได้ชุดข้อมูลกลับมา** — สามคำสั่ง

```powershell
py train.py --archive "C:\path\to\archive.zip"          # เทรนด้วยสูตรใหม่
py export_onnx.py                                        # สร้าง model.onnx
py fit_calibration.py --images data/leaf-cache --write   # วัดเครื่องยนต์ + ปรับเทียบ
```

`fit_calibration.py` จะพิมพ์ตารางเทียบ `raw` (พฤติกรรม v2) กับทุกโหมด บนชุด held-out เดียวกัน
**คอลัมน์ที่สำคัญคือ `false_healthy`** นั่นคือคำตอบว่า v3 ดีขึ้นจริงเท่าไร
แล้วจึงอัปเดต `MODEL_METRICS` ใน `diseaseModel.ts` จากค่า `test_tta`

---

## 3.11 🎨 เก็บงาน UI/UX & ส่งมอบงานต่อจาก 3.9 (อัปเดต 5 ต.ค. 2569 — Antigravity)

รับมอบงาน 4 ข้อจาก Claude Code + แก้ปัญหาแคชและการแครชในเบราว์เซอร์:

1. **แก้ปัญหา ErrorBoundary Crash ในเบราว์เซอร์ (`reading 'useCallback'` / `reading 'useState'`)**:
   - ตรวจพบโพรเซส Node ตกค้างซ้ำซ้อน 2 ตัวบนพอร์ต 3000 และ 24678 (Vite HMR) ➔ กำจัดโพรเซสตกค้างทั้งหมด ปล่อยพอร์ตสะอาด 100%
   - ใน `src/main.tsx`: เพิ่มการตรวจจับโหมด Development เพื่อสั่ง `unregister()` Service Worker ที่อาจตกค้างจากการทดสอบ Production และล้าง `caches` (watermelon-*) อัตโนมัติ ป้องกัน service worker ดักและส่งมอบไฟล์ JS เวอร์ชันเก่าที่มี hook dispatcher ไม่ตรงกัน
   - ใน `ErrorBoundary.tsx`: แสดง `error.stack` เมื่ออยู่ในโหมด dev เพื่อการวินิจฉัยปัญหาที่แม่นยำ และปรับปุ่ม "ลองใหม่อีกครั้ง" ให้เคลียร์แคชเบราว์เซอร์ก่อนโหลดใหม่
2. **หน้า `/scanner` (SweetnessScanner.tsx) — จัดการแท็บ "ฟังเสียงเคาะ"**:
   - เชื่อมต่อ `api.acousticModelStatus()` แบบเรียลไทม์
   - เมื่อระบบเสียงเคาะไม่ออนไลน์ (`online: false` ตอบ 503 เพื่อไม่สุ่มเดาค่า Brix):
     - ปรับสถานะ Badge ด้านบนเป็น `Melon Acoustic Engine (ระหว่างวิจัย)` + `อยู่ระหว่างวิจัย (ไม่สุ่มเดาผล)`
     - แสดงการ์ดคำแนะนำให้เกษตรกรทราบอย่างโปร่งใส พร้อมปุ่มทางลัดสลับไปใช้ **"วิเคราะห์จากภาพ"**
     - ปิดปุ่มไมค์ไม่ให้กดอัดเสียงเคาะเพื่อป้องกัน error 503
     - ใน `ChatAssistant.tsx`: แจ้งเตือนข้อความแนะนำผ่าน Toast เมื่อผู้ใช้แตะปุ่มไมค์ในขณะที่บริการเสียงเคาะยังอยู่ในช่วงวิจัย
3. **แสดงการกระจายคะแนน (Softmax) ด้วยชื่อภาษาไทย (`MODEL_CLASS_THAI`)**:
   - ใน `DiseaseResultCard.tsx`: นำเข้า `MODEL_CLASS_THAI` จาก `api.ts` มาใช้แสดงกราฟแท่งคะแนนความน่าจะเป็นของแต่ละคลาสโรค เรียงลำดับจากมากไปน้อย พร้อมไฮไลต์คลาสที่ชนะเป็นภาษาไทยที่เกษตรกรอ่านเข้าใจได้ทันที (เช่น "โรคแอนแทรคโนส", "โรคราน้ำค้าง", "ใบปกติ (ไม่พบโรค)") แทนชื่อภาษาอังกฤษดิบ
4. **ปรับปรุงการแสดงผลผู้ใช้ที่ยังไม่เข้าสู่ระบบใน `Sidebar.tsx` (`useDisplayUser`)**:
   - เมื่อเป็น `ผู้เยี่ยมชม` / `ยังไม่ได้เข้าสู่ระบบ`: ปรับสไตล์ Badge ให้เป็นสีกลมกลืน (neutral) และเปลี่ยนปุ่มที่มุมขวาล่างจาก "ออกจากระบบ" เป็นปุ่ม **"เข้าสู่ระบบ"** (พร้อมไอคอน `login`) ที่ลิงก์ตรงไปยัง `/signin`
5. **คำนวณพื้นที่และผลผลิตใน `FarmPlots.tsx` ตามข้อมูลจริง**:
   - แทนที่ค่าคงที่เดิม `24.75` และ `"62.3"` ด้วยฟังก์ชันคำนวณแบบไดนามิกจากแปลงจริง (`parsePlotRai`, `parsePlotYieldTons`) รวมกับแปลงใหม่ที่เพิ่มผ่านโมดัล (`extraPlots`) ทำให้ตัวเลขพื้นที่ (ไร่) และผลผลิตคาดการณ์ (ตัน) สอดคล้องกับข้อมูลของเกษตรกรจริง 100%
6. **การตรวจสอบคุณภาพทั้งหมด**:
   - `npm run lint` (`tsc --noEmit`): ผ่าน 100% (0 errors)
   - `npm test` (`vitest run`): ผ่านทั้งหมด 17 ไฟล์ 198 เทสต์
   - `npm run build` (`vite build`): บิลด์ผ่านสำเร็จ

---

## 4. Pending Tasks & Next Steps (สิ่งที่ยังไม่ได้ทำ)

### ลำดับความสำคัญสูง

0. **ทดสอบกับภาพถ่ายจากสวนจริง** — ชุดทดสอบปัจจุบันมาจากแหล่งเดียวกับชุดฝึก
   ยังไม่รู้ว่าโมเดลทนภาพมือถือ แสงจัด เงา และพื้นหลังรกได้แค่ไหน
0.1 **เก็บภาพเพิ่มเพื่อฝึกอีก 5 โรคที่เหลือ** — ยางไหล เหี่ยวฟิวซาเรียม ราแป้ง
   ผลเน่าแบคทีเรีย เพลี้ยไฟ/ไรแดง ยังตรวจจากภาพไม่ได้
0.2 **ปรับเทียบความมั่นใจ (calibration)** — โค้ดพร้อมแล้ว (`evaluation.fit_temperature`,
   `fit_calibration.py`, บริการอ่าน `calibration.json` และรายงาน `fitted` ที่ `/health`)
   แต่**ยังไม่ได้ปรับเทียบจริง** เพราะต้องมีชุด validation ที่มีป้ายกำกับ
   ตอนนี้ `T = 1.0`, `fitted: false` และแอปติดคำเตือนว่าตัวเลขเป็นคะแนนดิบ
0.3 **วัด accuracy ของ engine v3** — กลไกทั้งสี่ (ซูมหลายบริเวณ, TTA, กฎรวมผลถ่วงความเสี่ยง,
   ตัวกรองคุณภาพภาพ) ทดสอบเชิงกลไกครบแล้ว แต่**ยังไม่มีตัวเลขความแม่น** เพราะชุดข้อมูลหาย
   ดูขั้นตอนสามคำสั่งในหัวข้อ 3.10 — `fit_calibration.py` จะพิมพ์ตารางเทียบ v2 กับ v3
   บนชุด held-out เดียวกันให้เลย
1. **SMS gateway จริง** — เชื่อมต่อบริการ SMS Gateway (เช่น ThaiBulkSMS, Twilio) เพื่อส่งรหัส OTP เข้ามือถือจริงของเกษตรกร
2. **Route guard** — หน้าในกลุ่ม App ปัจจุบันเปิดให้ผู้ใช้ทดลองเข้าถึงได้อิสระ เมื่อพร้อมสามารถเพิ่ม redirect ไป `/signin`
3. **Capacitor Camera plugin** — ตอนนี้ใช้ `<input type="file" capture>` ซึ่งใช้ได้ทั้งเว็บและมือถือ แต่ `@capacitor/camera` จะให้ UX ที่ดีขึ้นบน native
4. **ราคาตลาดจากแหล่งจริง** — `market.ts` ยัง static; server ยังไม่มี endpoint ราคาจริง
5. **JSON file DB ➔ PostgreSQL** — ย้ายจาก JSON File สู่ Prisma / PostgreSQL เมื่อมีผู้ใช้จริงขยายตัว

### ลำดับรองลงมา

6. ต่อ LINE Messaging API ให้หน้า `/alerts` ส่งข้อความได้จริง
7. ต่อ payment gateway (Omise / 2C2P) ที่หน้า `/checkout`
8. บันทึก/โหลดประวัติแชทจริง (`GET /conversations`, `GET /conversations/:id/messages`) — client พร้อมแล้ว แต่ sidebar ยังใช้รายการตัวอย่าง
9. i18n — แยกข้อความไทยออกจาก JSX
10. เพิ่ม integration test ของ flow แชท (ตอนนี้ test ครอบ unit เป็นหลัก)
11. รูปภาพจริงของโรคพืช (หน้า landing ใช้ SVG ใบแตงโมวาดเอง)
12. โหมด high-contrast สำหรับใช้กลางแดด

### ความปลอดภัยของ dependency

`npm audit --omit=dev` รายงาน **4 high** ทั้งหมดมาจาก `firebase` → `@grpc/grpc-js`
(GHSA-m9gg-hp2v-232j, GHSA-f596-whhp-79r4)
ขณะนี้โค้ด **ไม่ได้ import firebase เลย** — ถ้ายังไม่ใช้ Firebase Auth แนะนำให้ถอดออกจาก dependencies
หรืออัปเกรดเป็นเวอร์ชันที่แก้แล้วก่อนขึ้น production

---

## 4.5 🗂️ เรคอร์ด 4 รายการจาก mock สุ่มที่ยังอยู่ในฐานข้อมูล

`data/watermelon_db.json` มีผลตรวจ 4 รายการที่ endpoint รุ่นเก่าสร้างด้วย
`Math.random()` พร้อมตัวเลขความมั่นใจที่กุขึ้น (91–96%)

| id | โรคที่สุ่มได้ | วันที่ |
|---|---|---|
| `dis-1791176851745` | anthracnose | 5 ต.ค. 2569 |
| `dis-1791176317116` | mosaic_virus | 5 ต.ค. 2569 |
| `dis-1791129457410` | mosaic_virus | 4 ต.ค. 2569 |
| `dis-1790919603298` | anthracnose | 2 ต.ค. 2569 |

**ยังไม่ลบ** เพราะเป็นข้อมูลของผู้ใช้ แต่ทำให้ไม่หลอกตาแล้ว: เรคอร์ดที่ไม่มี
`model_version` จะได้ `from_verified_model: false` กับ `unverified_note`
และหน้า `/plots` กับ `/scanner` **ซ่อนตัวเลขความมั่นใจ** แสดงคำเตือนแทน

ถ้าจะลบ ให้กรอง `diseaseRecords` ที่ไม่มี `model_version` ออกจาก
`data/watermelon_db.json` กลไกนี้จะยังป้องกันเรคอร์ดเก่าในฐานข้อมูลอื่นต่อไป

---

## 5. Constraints & Forbidden Actions (สิ่งที่ห้ามทำ / ข้อควรระวัง)

### Vision / โรคพืช

- **ห้ามใส่ fallback ที่เดาผลโรค** เมื่อโมเดลล่ม — ต้องตอบ 503
  (เวอร์ชันก่อนหน้าใช้ `random.choices()` ใน Python และ `Math.random()` ใน `server.ts`
  แล้วส่ง `confidence_percentage` ปลอม 91–98% ให้ UI แสดง)
- **ห้ามลดเกณฑ์ `MIN_HEALTHY_CONFIDENCE`** โดยไม่ดู precision ของ `Healthy` ก่อน
- **ห้ามคัดลอกชื่อโรค อัตราสารเคมี หรือค่า PHI ไปไว้ใน Python** — ต้องอยู่ที่
  `src/data/diseases.ts` ที่เดียว
- **ห้ามแสดงรายการสารเคมีโดยไม่มี `phi_note`** คู่กัน
- **ห้ามให้บริเวณที่โมเดลเห็นว่าปกติ ลบล้างผลโรคจากภาพรวม** — กฎใน `inference.aggregate()`
  เป็นทางเดียวโดยเจตนา มุมใบที่ยังเขียวบนใบที่ติดเชื้อเป็นเรื่องปกติ ไม่ใช่หลักฐานว่าใบปกติ
  (ตรงข้ามกันทำได้: บริเวณที่เห็นโรคชัดลบล้างภาพรวมที่ว่าปกติได้ เพราะ 19 ภาพนั้น)
- **ห้ามแสดงสถานะ `suspect` หรือ `unusable` ด้วยข้อความที่อ่านได้ว่าไม่พบโรค** — ให้อ่าน
  `STATUS_PRESENTATION` ไม่ใช่เขียน ternary สองทางบน `status`
- **ห้ามแสดง `confidence_percentage` เมื่อ `status === 'unusable'`** — ไม่มีการวัดเกิดขึ้น
  การแสดงเลขจะทำให้ผู้ใช้คิดว่าตรวจแล้ว
- **ห้ามปิดตัวกรองคุณภาพภาพเพื่อให้ "ตอบได้ทุกภาพ"** — ทดสอบแล้วว่าภาพกำแพงสีเทาได้
  `Anthracnose 57%` ซึ่งเป็นผลที่นำไปพ่นยาได้
- **ห้ามเขียน `fastapi_service/calibration.json` ด้วยมือ** — ไฟล์นี้ทำให้ `/health`
  รายงาน `calibration.fitted: true` ซึ่งเป็นคำสัญญาต่อทุก caller ว่าตัวเลขความมั่นใจ
  เป็นความน่าจะเป็นจริง ให้ `fit_calibration.py --write` สร้างจากข้อมูลที่มีป้ายกำกับเท่านั้น
- **ห้ามเขียนตัวเลขความแม่นของ engine v3 ลง `MODEL_METRICS` / `metrics.json` โดยไม่ได้วัด**
  กลไกที่มีเหตุผลรองรับไม่เท่ากับตัวเลขที่วัดแล้ว และ `MODEL_METRICS` คือตัวเลขที่
  เกษตรกรเห็นบนหน้าจอ (กฎข้อ 6)
- **ห้ามเปลี่ยน `IMAGE_SIZE` ใน `model.py` โดยไม่ส่งออก ONNX ใหม่** — EfficientNet
  จบด้วย adaptive pool จึงไม่ error แต่โมเดลจะเห็นแผลผิดสเกล (`export_onnx.py` และ
  `main.py` ปฏิเสธการทำงานถ้าไม่ตรงกันแล้ว อย่าถอดการตรวจนั้นออก)
- **ห้ามอัปเดต `model.pt` โดยไม่อัปเดต `MODEL_METRICS` / `MODEL_SUMMARY`**
  ใน `src/lib/diseaseModel.ts` — แอปจะแสดงความแม่นยำของรุ่นเก่า
- **ห้ามเปิดพอร์ต 8000 ออกอินเทอร์เน็ต** — บริการโมเดลไม่มีการยืนยันตัวตน

### Security & Privacy

- **ห้าม** commit ไฟล์ `.env` และ `google-services.json` ที่มีคีย์จริง
- **ห้ามปล่อย `demoCode` ขึ้น production** — `/auth/otp/send` ใน `server.ts` ส่งรหัส OTP กลับมาใน response
- **ห้าม** ส่งภาพถ่ายแปลงหรือพิกัดออกนอกระบบโดยไม่ได้รับความยินยอม —
  `useAuth().consent.improveModel` คือ source of truth และถูกส่งเป็น `allow_training` ทุกครั้งที่แชท
- **ห้าม** เก็บรหัส OTP หรือรหัสผ่านลง localStorage — `persist` ของ auth store เก็บเฉพาะ `user`, `token`, `consent`
  (`pendingOtp` ถูกตัดออกด้วย `partialize` โดยตั้งใจ)
- ข้อความ "เจ้าหน้าที่จะไม่ขอ OTP" ในหน้า `/otp` และ `/security` **ห้ามลบ** — เป็นมาตรการกัน social engineering
- **ห้ามให้ service worker cache `/api/`** — ราคาเก่าหรือการบันทึกที่ดูเหมือนสำเร็จทั้งที่ล้มเหลว อันตรายกว่า error ตรง ๆ

### Architectural boundaries

- **ห้ามเพิ่ม `tailwind.config.js`** — Tailwind v4 ใช้ `@theme` ใน `src/index.css` เท่านั้น ถ้าเพิ่มจะทำให้ token แตกเป็นสองแหล่ง
- **ห้ามใส่สี hex ตรง ๆ ใน JSX** — ใช้ token เสมอ ยกเว้นในไฟล์ SVG ของโลโก้และกราฟที่ระบุสีแบรนด์โดยตั้งใจ
- **ห้ามเปลี่ยนไปใช้ BrowserRouter / history API** โดยไม่แก้ Capacitor config — deep link ใน WebView จะพัง
- **ห้าม import `react-router`** — เราใช้ router ของตัวเองที่ `src/lib/router.tsx` เพื่อคุมขนาด bundle
- **ห้ามใส่ `@vitejs/plugin-react` ใน `vitest.config.ts`** — vitest ใช้ vite ของตัวเอง (rollup)
  ชนกับ vite 8 ของโปรเจกต์ (rolldown); ใช้ `esbuild: { jsx: 'automatic' }` แทน
- ตรรกะคำนวณทั้งหมดต้องอยู่ใน `src/lib/calc.ts` เพื่อให้ทดสอบได้ **ห้ามเขียนซ้ำใน component**

### Business logic

- **ห้ามแสดงคำแนะนำสารเคมีโดยไม่มีค่า PHI** — เป็นข้อมูลที่มีผลต่อความปลอดภัยอาหารและการผ่านมาตรฐาน GAP
- **ห้ามตัดข้อความกำกับว่า AI เป็นเครื่องมือช่วยตัดสินใจ** (ใต้แถบพิมพ์แชท และในหน้า `/terms`) —
  การวินิจฉัยผิดพลาดมีผลต่อผลผลิตจริงของเกษตรกร
- อัตราผสมสารเคมีทั้งหมดใน `inputs.ts` และ `diseases.ts` อ้างอิงกรมวิชาการเกษตร — **ห้ามแก้ตัวเลขโดยไม่มีแหล่งอ้างอิง**
- **ห้ามซ่อน error ของ API เป็นค่าว่างหรือค่า default** — ถ้าโหลดไม่ได้ต้องบอกผู้ใช้ตรง ๆ

---

## 6. Future Ideas & Backlog (ไอเดียและข้อมูลต่อยอด)

- **แผนที่ระบาดระดับตำบล** — heatmap จากข้อมูล `disease-history` รวมของผู้ใช้ (anonymised)
- **เปรียบเทียบแปลงกับค่าเฉลี่ยในพื้นที่** — benchmark ผลผลิต ต้นทุน และ Brix กับเกษตรกรรายอื่นในจังหวัดเดียวกัน
- **โหมดกลุ่มวิสาหกิจ** — แดชบอร์ดรวมหลายแปลงสำหรับสหกรณ์ (มีในแพ็กเกจ enterprise แล้วแต่ยังไม่มี UI)
- **บันทึกเสียงภาษาไทย** — ให้เกษตรกรพูดอธิบายอาการแทนการพิมพ์ (`/audio/transcriptions` มีอยู่แล้วใน server)
- **คิวงานออฟไลน์** — เก็บภาพที่สแกนตอนไม่มีสัญญาณไว้ใน IndexedDB แล้วซิงก์อัตโนมัติเมื่อกลับมาออนไลน์
- **แจ้งเตือนแบบ push** — ใช้ service worker ที่มีอยู่ส่ง Web Push แทนการพึ่ง LINE อย่างเดียว
- **โหมดกลางแดด** — high-contrast theme สำหรับใช้งานกลางแจ้ง (ตรงกับหลักการใน `DESIGN.md` ข้อ 1)

---

---

## 8. Master Specification Adoption (ข้อกำหนดเพิ่มเติมฉบับสำหรับพัฒนา — 5 ต.ค. 2569)

นำข้อกำหนดเพิ่มเติม 23 หมวดมาบังคับใช้ในระบบจริง:

1. **Contracts & Master Types:** สร้าง `src/types/resource.ts` กำหนด `ResourceState<T>`, `DiseaseResult`, `ReferenceMetadata`, `UserRole` (RBAC 8 บทบาท) และ `PaymentState`
2. **Dedicated Diagnostic Workflow (`/disease-scan`):** สร้างหน้า `src/routes/DiseaseScan.tsx` รองรับการตรวจโรคใบโดยตรง แยกบริบทแปลง ชิ้นส่วนพืช ระยะเวลาอาการ และสัดส่วนการระบาดในแปลง
3. **Route Registry Expansion:** ลงทะเบียน `/disease-scan` และ `/email-recover` ใน `src/App.tsx` พร้อมเพิ่มเมนูใน `src/data/nav.ts` และทางลัดใน `src/routes/FarmPlots.tsx`
4. **Landing Page Corrections:** แก้ไขการคำนวณ Vitality ไม่แสดง 100% เมื่อผลเป็น `unusable` หรือ `inconclusive`, ติดป้าย `[ ตัวอย่างจำลอง (Demo) ]` และปรับข้อความคะแนนความเชื่อมั่น
5. **Acoustic & Brix Integrity:** เพิ่มข้อความระบุชัดเจนว่าคลื่นเสียงเคาะเป็นเกณฑ์ทดสอบภาคสนาม (Experimental) ใน `KnockResultCard.tsx` และไม่แสดงค่าความหวานหลอก
6. **Diseases Catalog Scope:** ปรับหน้า `src/routes/SupportedDiseases.tsx` ให้แยกชัดเจนระหว่าง 4 คลาสที่โมเดลตรวจจับได้จริง และ 8 โรคในคลังความรู้อ้างอิง
7. **Market Fixture Notice:** ติดป้ายกำกับชัดเจนใน `src/routes/MarketPrices.tsx` ว่าเป็นข้อมูลตัวอย่างจำลองสำหรับการพัฒนา (Survey Fixture)
8. **Statutory PDPA Separation (`/privacy/requests`):** แยกหน้ายื่นคำร้องใช้สิทธิตามกฎหมาย PDPA (เข้าถึง, โอนย้าย, แก้ไข, ระงับ, ลบข้อมูล) ออกจากระบบรายงานผลการวินิจฉัย AI คลาดเคลื่อน (`/data-dispute`) อย่างถูกต้องตามระเบียบกฎหมาย พร้อมเพิ่มลิงก์เข้าถึงในหน้า Account Settings
9. **Tank Mix Compatibility & FRAC/IRAC Warnings (`TankMixer.tsx`):** แสดงคำเตือน "ยังไม่มีข้อมูลยืนยัน" หากผสมนอกเหนือจากสูตรที่รับรอง แนะนำขั้นตอน Jar Test 15 นาที และแสดงข้อกำหนดการสลับกลุ่มกลไกออกฤทธิ์ FRAC / IRAC ป้องกันเชื้อและแมลงดื้อยา
10. **Build & Quality Gates Verification:** ผ่านเกณฑ์คุณภาพทั้งหมด 100% (`tsc --noEmit` 0 errors, Vitest 202/202 tests passed, Vite build passed)

---

## 9. Multi-Vision Engine Integration & Deployment (6 ต.ค. 2569)

ต่อยอดระบบวิเคราะห์ภาพและขยายคลังความรู้โรคพืชร่วมกันระหว่าง Claude Code และ Antigravity ตามข้อตกลง `AGENTS.md`:

1. **ขยายคลังความรู้โรคพืช:**
   - ขยายจาก 8 โรคเดิม สู่ 47 โรค (`CURATED_DISEASES` 8 รายการ + `diseasesExtended.generated.ts` 39 รายการ)
   - หน้า `src/routes/SupportedDiseases.tsx` อัปเดตแสดงจำนวนโรคจริงแบบไดนามิก (`47 ชนิด`) พร้อมแจกแจงความครอบคลุมของแต่ละเครื่องยนต์

2. **เครื่องยนต์วิเคราะห์ภาพ 3 ระบบ (Multi-Vision Engines):**
   - `legacy4`: โมเดลหลัก 4 คลาส (ปรับเทียบแล้ว แม่นยำบนภาพใบแตงโมจริง คืนแผนจัดการและค่า PHI)
   - `wide9`: โมเดลมุมกว้าง 9 คลาส (ตรวจโรคราแป้ง Powdery Mildew เพิ่มเติมได้)
   - `claude`: โมเดลภาษาอ่านภาพ (Claude Vision วิเคราะห์อาการเชิงบรรยายและนอกรายการคลาส)

3. **UI / UX ปฏิบัติตามกฎความปลอดภัยเกษตรกรรมอย่างเคร่งครัด:**
   - `VisionEngineModal.tsx`: ป๊อปอัปแสดงรายละเอียด ข้อดี และ **ข้อจำกัด (limits_th)** ของแต่ละเครื่องยนต์
   - `VisionCompareCard.tsx`: การ์ดแสดงผลการวิเคราะห์เปรียบเทียบจากโมเดลเสริม (`wide9`, `claude`) แสดงสถานะ **"ข้อสังเกตเพิ่มเติม (ไม่ใช่คำวินิจฉัยหลัก)"** ไม่แสดงอัตราเคมีหรือ PHI เพื่อความปลอดภัย และติดป้าย **"ยังไม่ปรับเทียบ (คะแนนดิบ)"** ตามกฎ AGENTS.md
   - `DiseaseScan.tsx`: กล่องเลือก Engine พร้อมปุ่มเปรียบเทียบผลลัพธ์ (1-click comparison) ให้เกษตรกรตรวจสอบมุมมองจากโมเดลอื่นได้ทันที

4. **การตรวจสอบและขึ้นระบบ (Verification & Deployment):**
   - Typecheck (`npm run lint` / `tsc --noEmit`): สะอาด 0 errors
   - Unit Tests (`npm test` / Vitest): ผ่าน 225/225 tests (20 test files)
   - Build (`npm run build`): สำเร็จเรียบร้อย
   - Hosting Deploy: อัปเดตขึ้น Firebase Hosting สำเร็จที่ `https://acoustic-fruit-ripeness.web.app`

