# สถาปัตยกรรมระบบ Watermelon AI

> เอกสารอ้างอิงโครงสร้างระบบทั้งหมด — อัปเดต 5 ตุลาคม 2569
> คู่กับ [PROJECT_LOG.md](PROJECT_LOG.md) (สถานะงาน) และ [DESIGN.md](DESIGN.md) (กฎการออกแบบ UI)

---

## 0. 🤝 คู่มือทำงานร่วมกันระหว่าง Claude & Antigravity (AI Collaboration Protocol)

> **สำหรับ Claude และ Antigravity:** โปรเจกต์นี้มี AI สองตัวช่วยกันพัฒนาคู่กับผู้ใช้ กรุณาอ่านข้อตกลงนี้ก่อนเริ่มแก้ไขโค้ดใด ๆ เพื่อให้งานต่อเนื่อง ราบรื่น ไม่ทับซ้อน และรักษามาตรฐาน 100%

### 0.1 การแบ่งหน้าที่ความรับผิดชอบอย่างเป็นทางการ (Division of Responsibilities)

ตามคำสั่งของผู้ใช้งาน:
> *"Claude Code ต่อจากนี้น่าจะเป็น AI ที่จัดการเกี่ยวกับโปรเจกต์นี้แล้วก็ทำส่วนของระบบแบ็กเอนด์ และฉันให้ Antigravity เป็น AI ที่จัดการ UI"*

| มิติการทำงาน | 🤖 Claude Code (Backend & Project Lead) | 🎨 Antigravity (Frontend & UI/UX Specialist) |
|---|---|---|
| **บทบาทหลัก** | หัวหน้าโปรเจกต์ + สถาปัตยกรรมแบ็กเอนด์ & เซิร์ฟเวอร์ | สถาปัตยกรรม UI/UX + ประสบการณ์ผู้ใช้และหน้าจอทั้งหมด |
| **ไฟล์และโฟลเดอร์หลัก** | `server.ts`, `server-storage.ts`, `fastapi_service/`, `data/watermelon_db.json`, scripts, deployment | `src/routes/`, `src/components/`, `src/index.css`, `src/lib/media.ts`, `src/lib/router.tsx`, `public/assets/` |
| **หน้าที่รับผิดชอบ** | • พัฒนาและดูแล REST API Gateway (36+ endpoints)<br>• พัฒนา AI Vision Model ใน FastAPI (ONNX Runtime ตอน serve, PyTorch ตอนฝึก — ดู 5.1)<br>• จัดการความปลอดภัย (JWT, OTP production, Rate limit)<br>• จัดการ Database Persistence และการย้ายสู่ SQL/PostgreSQL<br>• เชื่อมต่อ External Services (LINE Messaging API, Payment, SMS Gateway)<br>• กำกับดูแล Project Scope, Releases และ Architecture สรุปภาพรวม | • ออกแบบและสร้าง UI ทุกหน้าให้ตรงตาม Stitch Mockup 1:1 (44 โฟลเดอร์)<br>• จัดการระบบดีไซน์ *Crisp Melon Freshness* ใน `src/index.css` (`@theme`)<br>• ปรับแต่ง Tactile micro-interactions (`active:scale-[0.96]`, 150ms)<br>• พัฒนา Interactive Media (Canvas Waveform, Audio Knock Capture, Camera)<br>• จัดการ Routing (Hash Router) และการเชื่อมต่อทุกปุ่มระหว่างหน้าจอ<br>• ตรวจสอบ Accessibility (a11y) และ Responsive Layout มือถือ/เดสก์ท็อป |
| **จุดเชื่อมต่อ (Contract)** | กำหนด Endpoint Spec และคืน Typed Response ใน `server.ts` | เชื่อมต่อ API ผ่าน `src/lib/api.ts` และจัดการ UI State (loading, error, toast, retry) |

### 0.2 แหล่งข้อมูลอ้างอิงและภาพความละเอียดสูง (Stitch Assets & Source of Truth)
- **Stitch Folders ต้นทาง:** อยู่ที่ `D:\stitch_watermelon_ai_chatbot` (มีทั้งหมด 44 โฟลเดอร์ รวมทุก mockup, design token และ error page)
- **High-Resolution Mockup Assets:** ถูกคัดลอกมาเก็บไว้ที่ `public/assets/` พร้อมใช้งานทันทีใน production:
  1. `watermelon_logo.png` — โลโก้แบรนด์แตงโม AI จาก Stitch `watermelon_ai_logo`
  2. `healthy_vs_infected_leaf.png` — ภาพเปรียบเทียบใบปกติ vs ติดเชื้อ จาก Stitch `close_up_comparison_of_healthy_green_watermelon_leaf_next_to_infected_leaf_with` (ใช้ใน ScanDemo หน้า Landing)
  3. `thai_farmer_specialist.png` — ภาพเกษตรกรและผู้เชี่ยวชาญ จาก Stitch `friendly_thai_watermelon_farmer_and_agricultural_specialist_smiling_warmly` (ใช้ใน About Us)
  4. `mobile_app_scanning_field.png` — ภาพแอปพลิเคชันมือถือสแกนใบกลางไร่ จาก Stitch `high_tech_agricultural_mobile_app_scanning_a_diseased_watermelon_leaf_with_ai` (ใช้ใน Hero หน้า Landing)

### 0.3 ตารางแมป 44 โฟลเดอร์ Stitch สู่ไฟล์โค้ด (1:1 Mapping Matrix)

| กลุ่มงาน | โฟลเดอร์ Stitch ต้นทาง | ไฟล์ในโปรเจกต์ `watermelon-ai` | Route Path |
|---|---|---|---|
| **Design System** | `crisp_melon_freshness` | `src/index.css` (`@theme`) | Global |
| **Landing & Demo** | `landing_page_ai_interactive_live_demo` | `src/routes/Landing.tsx` | `/` |
| **AI Assistant** | `ai_watermelon_ai_assistant` | `src/routes/ChatAssistant.tsx`, `src/data/chat.ts` | `/chat` |
| **Brix & Scanner** | `watermelon_sweetness_cultivar_ai` | `src/routes/SweetnessScanner.tsx`, `src/data/cultivars.ts` | `/scanner` |
| **Farm Management** | `watermelon_farm_parcel_management` | `src/routes/FarmPlots.tsx` | `/plots` |
| **Add Parcel Wizard**| `_` (Extended Farm Plot Dialog 2 Steps) | `src/components/domain/AddPlotModal.tsx` | Modal in `/plots` |
| **Diseases Catalog**| `supported_watermelon_diseases_ai_diagnostics` | `src/routes/Diseases.tsx`, `src/data/diseases.ts` | `/diseases` |
| **Cultivation Guide**| `watermelon_cultivation_guide` | `src/routes/CultivationGuide.tsx`, `src/data/cultivation.ts` | `/cultivation` |
| **Fertilizer & Chem**| `watermelon_fertilizer_crop_protection_directory` | `src/routes/FertilizerDirectory.tsx`, `src/data/inputs.ts` | `/fertilizer` |
| **Market Prices** | `watermelon_market_price_trends` | `src/routes/MarketTrends.tsx`, `src/data/market.ts` | `/market` |
| **Recipes** | `recipes` (เมนูในระบบ) | `src/routes/WatermelonRecipes.tsx`, `src/data/recipes.ts` | `/recipes` |
| **Pricing** | `pricing_plans_watermelon_ai` | `src/routes/PricingPlans.tsx`, `src/data/pricing.ts` | `/pricing` |
| **Checkout** | `watermelon_ai_checkout_payment` | `src/routes/Checkout.tsx` | `/checkout` |
| **Payment Success** | `payment_success_welcome_to_watermelon_ai` | `src/routes/PaymentSuccess.tsx` | `/payment-success` |
| **Billing History** | `watermelon_ai_subscription_billing_history` | `src/routes/BillingHistory.tsx` | `/billing` |
| **Auth Portal** | `watermelon_ai_auth_portal` | `src/routes/SignIn.tsx` | `/signin` |
| **Registration** | `watermelon_ai_farmer_registration` | `src/routes/Register.tsx` | `/register` |
| **OTP Screen** | `otp_watermelon_ai` | `src/routes/OtpVerification.tsx` | `/otp` |
| **Recovery Step 1** | `watermelon_ai_1` | `src/routes/AccountRecovery.tsx` (Step 1) | `/recover` |
| **Recovery Step 2** | `watermelon_ai_2` | `src/routes/AccountRecovery.tsx` (Step 2) | `/recover` |
| **Recovery Step 3** | `watermelon_ai_3` | `src/routes/AccountRecovery.tsx` (Step 3) | `/recover` |
| **Gmail Recovery** | `gmail_watermelon_ai` | `src/routes/AccountRecovery.tsx` | `/gmail-recover` |
| **Account Settings**| `watermelon_ai_account_settings` | `src/routes/AccountSettings.tsx` | `/settings` |
| **Security & Pwd** | `watermelon_ai_security_password` | `src/routes/SecuritySettings.tsx` | `/security` |
| **LINE Notification**| `line_alert_watermelon_ai_notification_settings`| `src/routes/NotificationSettings.tsx` | `/alerts` |
| **Data Dispute** | `ai_watermelon_ai_data_dispute_ai_correction` | `src/routes/DataDispute.tsx` | `/data-dispute` |
| **About Us** | `about_us_watermelon_ai` | `src/routes/About.tsx` | `/about` |
| **Status (13 หน้า)**| `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`, `502`, `503` | `src/routes/HttpStatusView.tsx`, `src/data/status.ts` | `/status/:code` |

### 0.4 ผังการเชื่อมโยงระบบทุกปุ่ม (Global Interconnection Matrix)

ตามคำสั่งของผู้ใช้: *"ทุกอย่างทุกปุ่มตามที่ให้ไปดูมามันกันผลหมดเพราะทุกหน้าเชื่อมกันแต่ฉันไม่ได้บอกว่าเชื่อมยังไงเท่านั้น"*
ทุกหน้าและทุกปุ่มมีผลเชื่อมโยงกันอย่างไร้รอยต่อดังนี้:

```
                                  ┌───────────────────────────────┐
                                  │         / (Landing)           │
                                  └───────────────┬───────────────┘
                                                  │
                 ┌───────────────────┬────────────┴─────────────┬────────────────────┐
                 │ CTA / Demo Scan   │ Pricing Card             │ Diseases / About   │
                 ▼                   ▼                          ▼                    ▼
          ┌─────────────┐     ┌──────────────┐           ┌──────────────┐     ┌──────────────┐
          │    /chat    │     │   /pricing   │           │  /diseases   │     │    /about    │
          └──────┬──────┘     └──────┬───────┘           └──────┬───────┘     └──────────────┘
                 │                   │                          │
                 │ Quick Action      │ เลือกแพ็กเกจ            │ กดปรึกษาโรค
                 ▼                   ▼                          ▼
          ┌─────────────┐     ┌──────────────┐                  │
          │  /scanner   │     │  /checkout   │                  │
          └──────┬──────┘     └──────┬───────┘                  │
                 │                   │ ชำระเงินสำเร็จ           │
                 │ ส่งผลไปแปลง/ปุ๋ย  ▼                          │
                 ├───────────►┌──────────────┐                  │
                 │            │/payment-succ │                  │
                 │            └──────┬───────┘                  │
                 │                   │                          │
                 ▼                   ▼                          │
          ┌─────────────┐     ┌──────────────┐                  │
          │   /plots    │◄────┤   /billing   │                  │
          └──────┬──────┘     └──────────────┘                  │
                 │                                              │
                 │ แถบเมนูลัดประจำแปลง                          │
                 ├──────────────────────────────────────────────┤
                 │ • ตรวจโรคพืช ──► /chat?q=...                 │
                 │ • เคาะวัด Brix ─► /scanner                   │
                 │ • สูตรปุ๋ยยา ──► /fertilizer ◄───────────────┘
                 │ • เช็กราคาตลาด ─► /market
```

### 0.5 กฎเหล็กสำหรับการทำงานร่วมกัน (Collaboration Rules)
1. **Tailwind v4 Only:** ห้ามสร้างไฟล์ `tailwind.config.js` เด็ดขาด! การปรับแต่งสี โทน และฟอนต์ทำผ่าน `@theme` ใน `src/index.css` เท่านั้น
2. **Hash Router Only:** ห้ามนำเข้า `react-router` หรือเปลี่ยนไปใช้ HTML5 History API เพราะแอปนี้รันบน Capacitor WebView สำหรับมือถือ ซึ่งไม่มี server rewrite deep link
3. **Button Component:** Component `<Button>` ใน `src/components/ui/Button.tsx` รองรับ `variant`: `'primary' | 'secondary' | 'tonal' | 'ghost' | 'quiet'` (ห้ามใช้ `variant="outline"`, ให้ใช้ `variant="ghost"`)
4. **Pure Logic in `src/lib/calc.ts`:** สูตรคำนวณพื้นที่แปลง (ไร่-งาน-วา), จำนวนต้น (1,200 ต้น/ไร่), ปริมาณปุ๋ย, และการจัดฟอร์แมตตัวเลข ต้องอยู่ใน `src/lib/calc.ts` พร้อม unit test เสมอ
5. **Quality Gate:** ก่อนบันทึกหรือส่งมอบงาน ต้องรัน `npm run lint` (`tsc --noEmit`) และ `npm test` (`vitest run`) ให้ผ่าน 100% ไม่มีข้อผิดพลาด

---

## 1. ภาพรวมระบบ (System Context)

```
                        ┌──────────────────────────────┐
                        │        เกษตรกรแตงโม          │
                        │  (มือถือกลางไร่ / เดสก์ท็อป)  │
                        └──────────────┬───────────────┘
                                       │ ถ่ายรูปใบ · เคาะผล · ถามคำถาม
                                       ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │                      WATERMELON AI CLIENT                          │
   │   React 19 SPA · Tailwind v4 · hash router · PWA + Capacitor       │
   └───────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS  /api/v1/*
                                   ▼
   ┌───────────────────────────────────────────────────────────────────┐
   │              API GATEWAY — Express (server.ts :3000)               │
   │   36 endpoints · CORS · signed URL · audit log · PDPA              │
   └───┬───────────────────┬────────────────────┬──────────────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
 ┌───────────┐   ┌──────────────────┐   ┌──────────────────┐
 │ JSON FILE │   │  FastAPI Vision  │   │  Google Gemini   │
 │    DB     │   │  (:8000, Python) │   │  2.5 Flash       │
 │ (atomic   │   │  ONNX Runtime    │   │  (ตอบแชททั่วไป)  │
 │  write)   │   │  + engine v3     │   └────────┬─────────┘
 └───────────┘   └────────┬─────────┘            │ ถ้าล่ม
                          │ ถ้าล่ม                ▼
                          ▼              ┌──────────────────┐
                 ┌──────────────────┐    │ คลังความรู้ใน     │
                 │  503 + เหตุผล     │    │ src/data/*.ts    │
                 │  ไม่มีผลโรคปลอม   │    │ (ข้อมูลที่ตรวจแล้ว)│
                 └──────────────────┘    └──────────────────┘
```

**หลักการ:** การล่มของบริการที่ **วัดอะไรจากของจริง** กับบริการที่ **เรียบเรียงข้อมูลที่มีอยู่**
ต้องจัดการต่างกัน

- **Gemini ล่ม → ตอบจากคลังความรู้ได้** เพราะ `src/data/*.ts` เป็นข้อมูลที่ตรวจแล้ว
  การเรียบเรียงใหม่ไม่ได้สร้างข้อเท็จจริงขึ้นมา
- **Vision ล่ม → ต้อง 503 เท่านั้น** เพราะไม่มีใครดูภาพนั้น ผลโรคที่ไม่ได้มาจากการดูภาพ
  คือการกุข้อมูล รุ่นแรกเคยใส่ fallback ที่สุ่มโรคแล้วส่ง `confidence` 92–98%
  เกษตรกรที่ยืนอยู่กลางแปลงไม่ได้ต้องการ "คำตอบเสมอ" — เขาต้องการคำตอบที่เชื่อได้
  และ error ที่เห็นชัดเสียหายน้อยกว่าคำแนะนำพ่นยาที่สุ่มมา (กฎข้อ 4 และ 6)

---

## 2. ชั้นสถาปัตยกรรม (Layered View)

```
┌─────────────────────────────────────────────────────────────────────┐
│  L5  PRESENTATION      26 หน้าจอ / 27 path · code-split ทุกหน้า      │
│      routes/           AppShell · MarketingShell · AuthShell        │
├─────────────────────────────────────────────────────────────────────┤
│  L4  COMPONENTS        ui/ (10 primitives) · domain/ (2 result card) │
│                        brand/ · layout/ · ErrorBoundary              │
├─────────────────────────────────────────────────────────────────────┤
│  L3  STATE & LOGIC     store/auth.ts (zustand + persist)             │
│                        lib/calc.ts · lib/media.ts · lib/router.tsx   │
├─────────────────────────────────────────────────────────────────────┤
│  L2  DATA ACCESS       lib/api.ts — typed client, timeout,           │
│                        ApiError / NetworkError                       │
│  ─────────────────────── HTTP boundary ───────────────────────────── │
│  L1  API               server.ts — 36 endpoints แยกตามโดเมน          │
│                        server-storage.ts — persistence + signed URL  │
├─────────────────────────────────────────────────────────────────────┤
│  L0  INFRASTRUCTURE    data/watermelon_db.json · uploads/            │
│                        fastapi_service/ · Gemini API                 │
└─────────────────────────────────────────────────────────────────────┘
```

**กฎการพึ่งพา:** ชั้นบนเรียกชั้นล่างได้เท่านั้น — `routes/` ห้ามเรียก `fetch` ตรง ต้องผ่าน `lib/api.ts`
และ `lib/` ห้าม import อะไรจาก `routes/`

---

## 3. Frontend Architecture

### 3.1 แผนผังโมดูล

```
src/
├── main.tsx ─────────────► mount React + register service worker (prod only)
│
├── App.tsx ──────────────► ErrorBoundary ▸ ToastProvider ▸ RouterProvider
│                           ▸ Suspense ▸ <Screen/>  (route table 26 หน้า)
│
├── lib/                    ◀── ชั้นที่ไม่รู้จัก React (ยกเว้น router/media hook)
│   ├── api.ts              HTTP client + types ทั้งหมดของ API
│   ├── calc.ts             รหัสผ่าน · เบอร์โทร · คำนวณแปลง · จัดรูปเงิน  [มี test]
│   ├── media.ts            validate/compress ภาพ · useKnockRecorder()
│   ├── router.tsx          hash router (~110 บรรทัด)                     [มี test]
│   └── cn.ts               ตัวต่อ className
│
├── store/
│   └── auth.ts             session · OTP flow · consent PDPA              [มี test]
│                           persist → localStorage (ไม่เก็บ pendingOtp)
│
├── components/
│   ├── ErrorBoundary.tsx   กันจอขาวเมื่อ render พัง
│   ├── brand/Logo.tsx      LogoMark · Logo · MelonAvatar (inline SVG)
│   ├── layout/
│   │   ├── AppShell.tsx        sidebar 20rem / drawer มือถือ + topbar
│   │   ├── Sidebar.tsx         เมนู · ประวัติแชท · การ์ดผู้ใช้
│   │   └── MarketingShell.tsx  public chrome + SiteFooter + AuthShell
│   ├── domain/
│   │   ├── KnockResultCard.tsx    ◀── ใช้ร่วม chat + scanner
│   │   └── DiseaseResultCard.tsx  ◀── ใช้ร่วม chat + scanner + landing
│   └── ui/                 Icon · Button · Badge · Card · Meter ·
│                           Segmented · StatTile · Field · LineChart · Toast
│
├── data/                   ข้อมูลอ้างอิงแบบ static (10 ไฟล์ ดูหัวข้อ 6.2)
└── routes/                 1 ไฟล์ = 1 หน้าจอ
```

### 3.2 Routing

Hash routing (`#/chat`) เลือกเพราะ:

| เหตุผล | ผลที่ได้ |
|---|---|
| Capacitor WebView ไม่มี server rewrite | deep link ทำงานทันทีบน native |
| Static bundle ล้วน | deploy ที่ไหนก็ได้ — S3, Firebase, nginx, Express |
| ไม่ต้องใช้ react-router | bundle เล็กลง ~12 kB gzip |

```
window.location.hash ──► RouterProvider ──► useRouter() { path, query, navigate }
                              │                    │
                         hashchange              <Link to="..."/>
                          listener              (มี href จริง — middle-click ได้)
```

**Route table** อยู่ใน `App.tsx` — static map 27 path (26 หน้าจอ; `/recover`
และ `/gmail-recover` ชี้ component เดียวกัน) + regex เดียวสำหรับ `/status/:code`
ทุกหน้า `lazy()` → แต่ละหน้าโหลดเฉพาะตอนเข้า

### 3.3 State

```
┌─── Server state ────────────┐   ┌─── Session ──────────┐   ┌─ Component ─┐
│ fetch ตรงจาก lib/api.ts     │   │ store/auth.ts        │   │ useState    │
│ เก็บใน useState ของหน้านั้น  │   │ (zustand + persist)  │   │ ในหน้าจอ    │
│                              │   │                      │   │             │
│ • ผลวินิจฉัย                 │   │ • user, token        │   │ • ฟอร์ม     │
│ • ประวัติการสแกน             │   │ • consent (PDPA)     │   │ • tab/filter│
│ • เกณฑ์สายพันธุ์             │   │ • pendingOtp (ชั่วคราว)│  │ • modal     │
└──────────────────────────────┘   └──────────────────────┘   └─────────────┘
         ไม่ cache                    localStorage               หายเมื่อ unmount
   (ข้อมูลสดต้องสด)              (ยกเว้น pendingOtp)
```

**ทำไมไม่ใช้ React Query:** หน้าส่วนใหญ่ดึงข้อมูลครั้งเดียวตอน mount และข้อมูลสด
(ราคา/ผลวินิจฉัย) ไม่ควร cache อยู่แล้ว — เพิ่ม dependency 13 kB โดยไม่ได้ประโยชน์

### 3.4 การไหลของข้อมูล (Unidirectional)

```
   ผู้ใช้กด ──► event handler ──► lib/api.ts ──► HTTP
                     │                             │
                     ▼                             ▼
               setState(busy)               ApiError / NetworkError
                     │                             │
                     ▼                             ▼
                setState(result)            useToast().error()
                     │                             │
                     └──────────► re-render ◄──────┘
```

ทุกจุดที่เรียก API มีครบ 4 สถานะ: `idle` → `loading` (skeleton/spinner) →
`success` | `error` (toast + ข้อความในที่) **ห้ามกลืน error เป็นค่าว่าง**

---

## 4. Backend Architecture

### 4.1 Express API (`server.ts`, พอร์ต 3000)

36 endpoints จัดกลุ่มตามโดเมน:

```
/api/v1
├── /health                              สถานะระบบ
│
├── CHAT ────────────────────────────────────────────────────────
│   ├── GET    /conversations             (ตรวจสิทธิ์เจ้าของ)
│   ├── POST   /conversations
│   ├── GET    /conversations/:id/messages
│   ├── POST   /conversations/:id/messages ◀── หัวใจ: Gemini + knock analysis
│   └── DELETE /conversations/:id
│
├── VISION & ACOUSTIC ───────────────────────────────────────────
│   ├── POST   /watermelon/disease-detect  ◀── FastAPI → fallback
│   ├── GET    /watermelon/disease-catalog
│   ├── GET    /watermelon/disease-history
│   ├── POST   /audio/knock-analysis
│   └── POST   /audio/transcriptions
│
├── LAB SPECIMENS ───────────────────────────────────────────────
│   ├── GET/POST /watermelons
│   ├── POST     /watermelons/:id/ground-truth  ◀── ผ่าชิม → ป้อนกลับโมเดล
│   └── GET      /varieties, /varieties/calibration
│
├── AUTH ────────────────────────────────────────────────────────
│   ├── POST /auth/otp/send    (5 นาที · จำกัด 5 ครั้ง)
│   ├── POST /auth/otp/verify
│   └── POST /auth/social      (google / line)
│
├── STORAGE ─────────────────────────────────────────────────────
│   ├── POST /files, /storage/upload
│   ├── POST /storage/signed-url            ◀── HMAC-SHA256
│   └── GET  /storage/files/:token/:exp/:name
│
├── PDPA ────────────────────────────────────────────────────────
│   ├── PATCH /users/me/consent
│   ├── GET   /pdpa/export-my-data, /users/me/data-export
│   ├── POST  /pdpa/forget-me
│   └── GET   /pdpa/policy
│
├── CONTENT ─────────────────────────────────────────────────────
│   ├── GET /prompts, /folders, /knowledge
│   └── POST /feedback/reports
│
└── ADMIN & SYNC ────────────────────────────────────────────────
    ├── GET  /admin/statistics, /database/stats
    └── POST /database/sync                 ◀── offline PWA sync
```

### 4.2 Persistence (`server-storage.ts`)

```
                 persistentDb (singleton)
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
      getDb()          save()          logAudit()
    in-memory     debounce 200ms    วงแหวน 500 รายการ
      object             │
                         ▼
              เขียน .tmp → rename  ◀── atomic: ไฟล์ไม่พังกลางคัน
                         │
                         ▼
              data/watermelon_db.json
```

**DatabaseSchema** (13 คอลเล็กชัน):
`conversations · messages · prompts · folders · knowledge · reports ·
trainingCandidates · consents · watermelons · auditLogs · users ·
otpSessions · diseaseRecords`

> ⚠️ JSON file DB เหมาะกับการพัฒนาและ pilot เท่านั้น — เขียนทั้งไฟล์ทุกครั้ง
> ไม่มี transaction, ไม่มี index, ไม่ปลอดภัยเมื่อรันหลาย process
> **เส้นทางย้าย:** `DatabaseSchema` ถูกออกแบบให้ map ตรงกับตาราง SQL ได้
> → PostgreSQL + Prisma เมื่อผู้ใช้เกิน ~500 คน

### 4.3 Signed URL

```
generateSignedUrl(filename, op, ttl)
   │
   ├─► payload  = "read:leaf-001.jpg:1791234567"
   ├─► token    = HMAC-SHA256(payload, STORAGE_SECRET)
   └─► url      = /api/v1/storage/files/{token}/{expiresAt}/{filename}

GET url ──► verify HMAC + ตรวจหมดอายุ ──► ส่งไฟล์ | 403
```

ภาพแปลงของเกษตรกรจึงเข้าถึงได้เฉพาะคนที่มีลิงก์ที่เซ็นแล้วและยังไม่หมดอายุ

---

## 5. AI Pipeline

### 5.1 Vision — วินิจฉัยโรคจากภาพ

โมเดลคือ EfficientNet-B0 จำแนก 4 คลาส เสิร์ฟผ่าน ONNX Runtime
**ไม่มี fallback ที่เดาผลโรค** — เซอร์วิสล่มคือ 503 ไม่ใช่คำตอบปลอม
(รุ่นแรกใช้ `random.choices()` แล้วส่ง `confidence` 92–98% ซึ่งเกษตรกรนำไปพ่นยาได้)

```
 เกษตรกรถ่ายรูปใบ
        │
        ▼
 ┌──────────────────────────────────────────────────┐
 │ CLIENT: lib/media.ts                             │
 │  validateImage()   ชนิด + ขนาด ≤ 10 MB            │
 │  compressImage()   ด้านยาว 1600px, JPEG q0.85     │
 │                    4–12 MB ──► ~200–600 kB        │
 └──────────────┬───────────────────────────────────┘
                │ data URL
                ▼
 POST /api/v1/watermelon/disease-detect  { imageBase64, notes?, mode? }
                │
                ▼  server.ts — ทำหน้าที่ขนส่งเท่านั้น ไม่ตีความผล
 ┌──────────────────────────────────────────────────┐
 │ fastapi_service :8000   POST /predict-base64     │
 │                                                   │
 │ leafcheck.py ── ภาพนี้อ่านได้ไหม (3 ด่าน)         │
 │   แสง → มีเนื้อใบไหม → ความคม                     │
 │   เรียงตามลำดับที่แต่ละด่านทำลายหลักฐานของด่านถัดไป│
 │   ไม่ผ่าน ──► abstain: true + เหตุผลภาษาไทย       │
 │                                                   │
 │ leafcheck.py ── วัดพื้นที่ใบที่เปลี่ยนสี          │
 │   จากพิกเซลโดยตรง เป็นสัญญาณที่ไม่ขึ้นกับโมเดล    │
 │                                                   │
 │ inference.py ── เครื่องยนต์อ่านโมเดล              │
 │   1. ย่อภาพครั้งเดียวเหลือด้านยาว 768px           │
 │   2. ตัดบริเวณ: ภาพรวม + 4 ส่วนซ้อนทับ + กลางภาพ  │
 │   3. TTA พลิก 4 แบบ (ชุดเดียวกับตอนฝึก)           │
 │   4. ยิง ONNX ครั้งเดียวทั้ง batch (24 ภาพ)       │
 │   5. เฉลี่ย logits ต่อบริเวณ → หาร temperature    │
 │      → softmax                                    │
 │   6. aggregate() รวมผลแบบถ่วงความเสี่ยง           │
 └──────────────┬───────────────────────────────────┘
                │ { class_id, confidence, scores, model_version,
                │   abstain, quality, lesions, aggregation, regions,
                │   calibration, engine_version, mode }
                ▼
 ┌──────────────────────────────────────────────────┐
 │ src/lib/diseaseModel.ts — buildDetection()        │
 │ แหล่งความจริงเดียวของการแปลผลเป็นเรื่องเกษตร       │
 │                                                   │
 │  abstain? ──────────────────► 'unusable'          │
 │     ตรวจก่อนเกณฑ์ความมั่นใจทุกตัว เพราะภาพกำแพง   │
 │     ผ่านเกณฑ์ได้สบาย ๆ                             │
 │  escalated_from_healthy? ───► 'suspect'           │
 │  confidence < เกณฑ์? ───────► 'inconclusive'      │
 │  Healthy ≥ 90%? ────────────► 'healthy'           │
 │  โรค ≥ 70%? ────────────────► 'diagnosed'         │
 │                                                   │
 │  ประกอบจาก src/data/diseases.ts: อาการ, สารเคมี,  │
 │  ชีวภัณฑ์, การป้องกัน, PHI, ข้อจำกัดของผล          │
 └──────────────┬───────────────────────────────────┘
                │
                ├─► บันทึก diseaseRecords[] (+ engine, escalated,
                │    lesion_area, photo_quality, calibrated)
                ├─► logAudit("DISEASE_DETECT")
                ▼
   DiseaseResultCard · diagnosisToChatReply()
   อ่าน STATUS_PRESENTATION เพื่อเลือกคำ/ไอคอน/โทน
   ไม่มี ternary บน status ที่จะทำให้สถานะใหม่หลุดไปเป็น "ไม่พบโรค"
```

#### ทำไมเครื่องยนต์มีกลไกเท่านี้

ทุกอย่างมาจากตัวเลขเดียวใน `fastapi_service/metrics.json`:
**19 จาก 142 ภาพใบที่เป็นโรค ถูกตัดสินว่า "ใบปกติ"** (`Healthy` precision 0.62)
เกษตรกรตอบสนองต่อ "ใบปกติ" ด้วยการไม่ทำอะไร ขณะที่ accuracy 0.890 และ macro-F1 0.898
ซ่อนตัวเลขนั้นไว้ทั้งหมด

| กลไก | ปัญหาเชิงกายภาพ/สถิติที่แก้ |
|---|---|
| ซูมหลายบริเวณ | ภาพมือถือ 3000px ถูกย่อเป็น 224px แผลระยะแรก 2–3 มม. เหลือราวพิกเซลเดียว |
| TTA | ภาพก้ำกึ่งให้คำตอบแบบสุ่ม และขั้นตอนถัดไปหาค่าสูงสุดข้ามบริเวณ ซึ่งขยายสัญญาณรบกวน |
| กฎรวมผลทางเดียว | ต้นทุนผิดพลาดสองทางไม่เท่ากัน: เตือนผิด = เดินไปดูหนึ่งรอบ, พลาดโรค = ผลผลิต 60–80% |
| ตัวกรองคุณภาพภาพ | softmax 4 คลาสไม่มีคำตอบว่า "นี่ไม่ใช่ใบ" — ภาพกำแพงได้ `Anthracnose 57%` |

#### กฎรวมผล (`inference.aggregate`)

```
ผลจากภาพรวม = ผลตั้งต้น   ← เป็นผลที่ metrics.json บรรยายถึง

บริเวณที่ซูม ลบล้างได้ทางเดียวเท่านั้น:
  ภาพรวมว่า Healthy + บริเวณใดเห็นโรค ≥ 0.80 + บริเวณนั้นมีเนื้อใบ ≥ 0.35
      ──► รายงานโรคนั้น พร้อม escalated_from_healthy: true

  ภาพรวมเห็นโรค + ทุกบริเวณว่า Healthy
      ──► ยังรายงานโรค ❌ ลบล้างไม่ได้
          (มุมใบที่ยังเขียวบนใบติดเชื้อเป็นเรื่องปกติ ไม่ใช่หลักฐานว่าใบปกติ)
```

เกณฑ์ 0.80 สูงกว่า `MIN_DISEASE_CONFIDENCE` (0.70) เพราะบริเวณเดียวเป็นหลักฐานที่อ่อนกว่า
ภาพรวม และการหาค่าสูงสุดข้าม 5 บริเวณเพิ่มโอกาสได้คะแนนสูงแบบฟลุก
เกณฑ์เนื้อใบ 0.35 กันบริเวณที่เป็นดินหรือท้องฟ้าไม่ให้ยกธงเตือน

#### การปรับเทียบและเกณฑ์

| สิ่งที่ปรับ | สถานะปัจจุบัน | วัดด้วย |
|---|---|---|
| temperature | `1.0`, `fitted: false` — `confidence` เป็นคะแนน softmax ดิบ | `fit_calibration.py` |
| `MIN_HEALTHY_CONFIDENCE` | `0.90` จากการให้เหตุผลบน precision 0.62 | `evaluation.search_thresholds()` เสนอค่าได้ แต่ไม่เปลี่ยนให้เอง |
| `MIN_DISEASE_CONFIDENCE` | `0.70` จากการให้เหตุผล | เช่นเดียวกัน |

สองเกณฑ์นั้น**ไม่ถูกเปลี่ยนโดยอัตโนมัติ** เพราะกำหนดว่าจะบอกเกษตรกรให้พ่นสารหรือไม่
`fit_calibration.py` เสนอค่าที่ต้นทุนต่ำสุด (miss 10 : false alarm 2 : abstain 0.5)
ไว้ให้คนตัดสินใจพร้อมตัวเลขประกอบ

#### โหมด (ตั้งผ่าน `VISION_MODE` หรือ `mode` ต่อคำขอ)

| โหมด | บริเวณ | ภาพเข้าโมเดล | เวลา (CPU, 12 MP) |
|---|---|---|---|
| `fast` | ภาพรวม | 1 | ~160 ms |
| `balanced` *(ค่าเริ่มต้น)* | ภาพรวม + 4 ส่วน | 8 | ~275 ms |
| `deep` | ภาพรวม + 4 ส่วน + กลางภาพ | 24 | ~540 ms |

#### ขอบเขตที่ชัดเจนระหว่างสองภาษา

| อยู่ฝั่ง Python | อยู่ฝั่ง TypeScript |
|---|---|
| คะแนนความน่าจะเป็น 4 คลาส | ชื่อโรคภาษาไทย |
| ภาพนี้อ่านได้ไหม + ถ่ายใหม่อย่างไร | อัตราสารเคมี, ค่า PHI, ชีวภัณฑ์, การป้องกัน |
| สัดส่วนพิกเซลที่เปลี่ยนสี | เกณฑ์ความมั่นใจและการแปลเป็นสถานะ |
| กฎรวมผลข้ามบริเวณ | ข้อความข้อจำกัดและคำกำกับว่า AI เป็นเครื่องมือช่วยตัดสินใจ |

Python บอกว่า**ภาพมีอะไร** TypeScript บอกว่า**มันหมายถึงอะไรกับแปลง**
ข้อความไทยเรื่องการถ่ายภาพอยู่ฝั่ง Python ไม่ใช่ข้อยกเว้น เพราะความอ่านได้ของภาพ
เป็นคุณสมบัติของภาพ ซึ่งเป็นเรื่องของเซอร์วิสนั้น

### 5.2 Acoustic — วัดความหวานจากเสียงเคาะ

```
 เกษตรกรกดไมค์แล้วเคาะผล 3 ครั้ง
        │
        ▼
 ┌────────────────────────────────────────────────────┐
 │ CLIENT: useKnockRecorder()                         │
 │                                                     │
 │  getUserMedia({ echoCancellation: false,           │
 │                 noiseSuppression: false,           │
 │                 autoGainControl:  false })         │
 │        │          ▲                                 │
 │        │          └── ปิดทั้งหมด! DSP ของเบราว์เซอร์│
 │        │              จะกลืนเสียงเคาะสั้น ๆ ทิ้ง    │
 │        ├─► MediaRecorder (opus) ──► blob           │
 │        └─► AnalyserNode (fftSize 1024)             │
 │              └─► peak level ทุก frame              │
 │                    └─► waveform ขยับตามเสียงจริง    │
 │                                                     │
 │  หยุดอัด ──► ส่งวิเคราะห์อัตโนมัติ (แตะปุ่มเดียวจบ) │
 └──────────────┬─────────────────────────────────────┘
                │
                ├─► POST /files           (เก็บคลิป)
                └─► POST /conversations/:id/messages
                         { mode: "knock-analysis" }
                              │
                              ▼
                    knockAnalysis {
                      maturityClass, maturityGrade,
                      dominantFrequencyHz, snrDb,
                      sweetnessEstimateBrix,
                      probabilities { unripe, ripe, overripe },
                      recommendations[]
                    }
                              │
                              ▼
                      KnockResultCard
              + เทียบกับ /varieties ของสายพันธุ์ที่เลือก
                (minRipeHz – maxRipeHz → ในเกณฑ์ไหม)
```

### 5.3 Conversational — แชททั่วไป

```
POST /conversations/:id/messages { content, mode, allow_training }
        │
        ├── mode = "knock-analysis" ──► คำนวณ acoustic ก่อน
        │
        ▼
   มี GEMINI_API_KEY ?
        │
   ┌────┴────┐
   ▼         ▼
 Gemini    Expert System (hard-coded)
 2.5 Flash  • knock-analysis → สรุปผลเสียง
   │        • transcription  → ถอดข้อความ
   │        • general        → 3 จุดสังเกตแตงโม
   └────┬────┘
        ▼
  assistantMessage { content, knockAnalysis?, modelVersion }
        │
        └─► allow_training ? → trainingCandidates[]
                               (anonymizationStatus: completed)
```

**Consent gate:** `allow_training` มาจาก `useAuth().consent.improveModel`
ถ้าผู้ใช้ปิดสวิตช์ในหน้าตั้งค่า ข้อมูลจะไม่เข้าคิวฝึกโมเดล

---

## 6. Data Model

### 6.1 Backend (runtime)

```
   users ─────┬──────────────► conversations ────────► messages
   (id, phone,│  userId          (id, title,            (role, content,
    email,    │                   chatMode,              attachments[],
    role)     │                   messageCount)          knockAnalysis?)
              │
              ├──────────────► consents { analytics, improveModel, ... }
              │
              ├──────────────► auditLogs (วงแหวน 500)
              │
              └──────────────► otpSessions { code, expiresAt, attempts }
                                 (หมดอายุ 5 นาที, ลองได้ 5 ครั้ง)

   watermelons ──► groundTruth      ◀── ผ่าชิมจริง → ใช้ปรับเทียบโมเดล
   diseaseRecords                   ◀── ประวัติการสแกนต่อ farmId
   trainingCandidates               ◀── เข้าคิวฝึกโมเดล (ต้องมี consent)
   reports                          ◀── แจ้ง AI คลาดเคลื่อน (PDPA ม.35)
```

### 6.2 Frontend (static reference data)

| ไฟล์ | เนื้อหา | ใช้ที่ |
|---|---|---|
| `diseases.ts` | 8 โรค: อาการ · สภาพกระตุ้น · สารเคมี · ชีวภัณฑ์ · PHI | `/diseases`, landing demo |
| `cultivars.ts` | 5 สายพันธุ์ + เกณฑ์ความสุก 3 ระดับ | `/scanner`, `/cultivation` |
| `cultivation.ts` | 5 ระยะเติบโต + งานรายสัปดาห์ | `/cultivation` |
| `inputs.ts` | ปุ๋ย/สารอารักขา 12 รายการ + FRAC/IRAC | `/fertilizer` |
| `market.ts` | 5 ตลาดกลาง + กราฟ 15 วัน | `/market` |
| `recipes.ts` | 6 สูตร (รวมแปรรูปผลตกเกรด) | `/recipes` |
| `pricing.ts` | 3 แพ็กเกจ + ใบเสร็จ + FAQ | `/pricing`, `/billing` |
| `chat.ts` | prompt chips + quick tools | `/chat` |
| `status.ts` | 13 รหัส HTTP | `/status/:code` |
| `nav.ts` | เมนู sidebar + marketing | ทุก shell |

> ข้อมูลเหล่านี้เป็น static เพราะเป็น**ความรู้ทางวิชาการที่ไม่เปลี่ยนรายวัน**
> ยกเว้น `market.ts` ที่ควรย้ายไปเป็น API เมื่อมีแหล่งข้อมูลจริง

---

## 7. ลำดับการทำงานสำคัญ (Sequence Flows)

### 7.1 เข้าสู่ระบบด้วย OTP

```
 User          SignIn         auth store      Express          DB
  │               │                │              │             │
  ├─ กรอกเบอร์ ──►│                │              │             │
  │               ├─ requestOtp() ►│              │             │
  │               │                ├ normalize ───┤             │
  │               │                │  (ตัด - ออก) │             │
  │               │                ├─ POST /auth/otp/send ─────►│
  │               │                │              ├ สุ่ม 6 หลัก │
  │               │                │              ├ sessionToken├► otpSessions
  │               │                │◄─ { sessionToken, demoCode }│
  │               │                ├ เก็บ pendingOtp (ไม่ persist)
  │◄── ไปหน้า /otp ┤                │              │             │
  │               │                │              │             │
  ├─ กรอก 6 หลัก ►│ Otp            │              │             │
  │               ├─ verifyOtp() ─►│              │             │
  │               │                ├─ POST /auth/otp/verify ───►│
  │               │                │              ├ ตรวจหมดอายุ │
  │               │                │              ├ ตรวจ attempts
  │               │                │◄─ { user, token } ──────────┤
  │               │                ├ applyHeaders()             │
  │               │                │  Authorization + x-user-id │
  │               │                ├ persist → localStorage     │
  │◄── ไปหน้า /chat┤                │              │             │
```

### 7.2 วินิจฉัยโรคจากภาพ

```
 User      ChatAssistant     media.ts      api.ts      Express    FastAPI
  │             │               │            │            │          │
  ├─ เลือกภาพ ─►│               │            │            │          │
  │             ├─ validate ───►│            │            │          │
  │             │◄─ null (ผ่าน) │            │            │          │
  │             ├─ compress ───►│            │            │          │
  │             │◄─ dataUrl (ย่อแล้ว)        │            │          │
  │◄─ preview ──┤               │            │            │          │
  │             │               │            │            │          │
  ├─ กดส่ง ────►│               │            │            │          │
  │             ├── detectDisease() ────────►│            │          │
  │             │  (busy = true)             ├─ POST ────►│          │
  │             │                            │            ├─ 3 วิ ──►│
  │             │                            │            │◄─ ผล ────┤
  │             │                            │            ├ บันทึก   │
  │             │                            │◄─ diagnosis┤ audit    │
  │             │◄── DiseaseDetection ───────┤            │          │
  │◄─ การ์ดผล ──┤                            │            │          │
  │             │                                                     │
  │   ถ้าพลาด: toast.error() + ข้อความในฟีด + ปุ่ม "ลองส่งใหม่"       │
```

### 7.3 ออฟไลน์

```
 Browser ──► Service Worker ──► Network
                   │
     ┌─────────────┼──────────────┬────────────────┐
     ▼             ▼              ▼                ▼
  /api/*      navigate      /assets/*-hash.*   อื่น ๆ
     │             │              │                │
 network only  network first  cache first    stale-while-
     │          → shell         (immutable)   revalidate
     │             │
  ❌ offline       ▼
     │        index.html
     ▼        จาก cache
  503 + ข้อความไทย
  "ออฟไลน์อยู่ —
   เชื่อมต่อแล้วลองใหม่"
```

**กฎเหล็ก:** `/api/*` ห้าม cache และห้ามคืน 200 ปลอม
ราคาเก่าหรือ "บันทึกสำเร็จ" ทั้งที่ล้มเหลว อันตรายกว่า error ตรง ๆ

---

## 8. Deployment Topology

### 8.1 Development (2 process)

```
 ┌─────────────────────┐        ┌──────────────────────┐
 │ npm run dev:web     │        │ npm run dev          │
 │ Vite :5173          │──────► │ Express :3000        │
 │                     │ proxy  │ (tsx server.ts)      │
 │ HMR · source map    │ /api   │                      │
 └─────────────────────┘        └──────────┬───────────┘
                                           │ optional
                                           ▼
                                ┌──────────────────────┐
                                │ uvicorn main:app     │
                                │ FastAPI :8000        │
                                └──────────────────────┘
```

### 8.2 Production — Web (1 process, single origin)

```
                  ┌──────────────────────────────────┐
   Browser ──────►│ Express :3000                     │
                  │                                   │
                  │  /api/v1/*  ──► handlers          │
                  │  /*         ──► dist/ (static)    │
                  │                 index.html        │
                  └──────────────────────────────────┘
                  ไม่ต้องตั้ง CORS หรือ VITE_API_BASE_URL
                  เพราะ client ใช้ relative URL
```

### 8.3 Production — Mobile (Capacitor)

```
 ┌───────────────────────────────┐
 │ Android / iOS                  │
 │  ┌──────────────────────────┐  │
 │  │ WebView                  │  │        HTTPS
 │  │ origin: https://localhost│──┼──────────────────► API server
 │  │ assets: dist/ (bundled)  │  │   ต้องตั้ง
 │  └──────────────────────────┘  │   VITE_API_BASE_URL
 │                                │   (relative URL จะไม่ทำงาน!)
 │  สิทธิ์ที่ประกาศแล้ว:           │
 │   • INTERNET                   │
 │   • CAMERA                     │
 │   • RECORD_AUDIO               │
 │   • READ_MEDIA_IMAGES          │
 └───────────────────────────────┘

 npm run build && npm run cap:sync && npm run cap:open:android
```

---

## 9. Security & Privacy Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│  ขอบเขตที่ 1 — Transport                                        │
│  HTTPS · TLS 1.3 · CORS allowlist (ปัจจุบันเปิด * ต้องจำกัดก่อน prod) │
├─────────────────────────────────────────────────────────────────┤
│  ขอบเขตที่ 2 — Identity                                         │
│  OTP 6 หลัก · หมดอายุ 5 นาที · ลองได้ 5 ครั้ง                   │
│  Authorization: Bearer + x-user-id + x-user-role                │
│  ⚠️ token ปัจจุบันเป็น random hex ยังไม่ได้เซ็น/verify            │
├─────────────────────────────────────────────────────────────────┤
│  ขอบเขตที่ 3 — Ownership                                        │
│  conversations กรองด้วย userId                                  │
│  ของคนอื่น → 404 (ไม่ใช่ 403) เพื่อไม่บอกว่ามีอยู่จริง            │
├─────────────────────────────────────────────────────────────────┤
│  ขอบเขตที่ 4 — Object storage                                   │
│  HMAC-SHA256 signed URL + TTL                                   │
├─────────────────────────────────────────────────────────────────┤
│  ขอบเขตที่ 5 — PDPA                                             │
│  consent 5 สวิตช์ → allow_training ทุกคำขอ                      │
│  export (ม.30) · แก้ไข (ม.35) · ลบ (ม.33)                       │
│  auditLogs บันทึกทุกการกระทำสำคัญ                               │
└─────────────────────────────────────────────────────────────────┘

localStorage เก็บเฉพาะ: user · token · consent
ไม่เก็บ: รหัสผ่าน · OTP · pendingOtp  (ตัดด้วย partialize โดยตั้งใจ)
```

---

## 10. Build & Test Pipeline

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐
 │ npm run lint │──►│ npm run test │──►│ npm run build│──►│ cap:sync    │
 │ tsc --noEmit │   │ vitest (54)  │   │ vite build   │   │ (ถ้าทำมือถือ)│
 └──────────────┘   └──────────────┘   └──────────────┘   └─────────────┘
       │                   │                   │
       │                   │                   └─► dist/
       │                   │                       index      235 kB → 74 kB gz
       │                   │                       แต่ละหน้า    2–6 kB gz
       │                   │                       css          68 kB → 11 kB gz
       │                   │
       │                   ├─ lib/calc.test.ts        18 tests
       │                   ├─ lib/api.test.ts         11 tests
       │                   ├─ lib/router.test.tsx      7 tests
       │                   ├─ lib/media.test.ts        5 tests
       │                   ├─ store/auth.test.ts       8 tests
       │                   └─ ui/Segmented.test.tsx    5 tests
       │
       └─► ครอบคลุม: ตรรกะบริสุทธิ์ · HTTP client · state machine · a11y contract
           ยังไม่ครอบ: integration flow ของแชท (ดู PROJECT_LOG ข้อ 4)
```

**หมายเหตุ config:** `vitest.config.ts` ใช้ `esbuild: { jsx: 'automatic' }`
ไม่ใช้ `@vitejs/plugin-react` เพราะ vitest ใช้ vite ของตัวเอง (rollup)
ซึ่ง type ชนกับ vite 8 ของโปรเจกต์ (rolldown)

---

## 11. จุดต่อขยาย (Extension Points)

| อยากเพิ่ม | แก้ที่ไหน |
|---|---|
| หน้าจอใหม่ | สร้าง `routes/X.tsx` → เพิ่ม `lazy()` + 1 บรรทัดใน `ROUTES` ของ `App.tsx` |
| เมนู sidebar | `data/nav.ts` → `PRIMARY_NAV` หรือ `SECONDARY_NAV` |
| endpoint ใหม่ | เพิ่ม type + method ใน `lib/api.ts` (ที่เดียว) |
| โรคใหม่ | `data/diseases.ts` (frontend) + `WATERMELON_DISEASES` ใน `server.ts` |
| สายพันธุ์ใหม่ | `data/cultivars.ts` + `VARIETIES_DATA` ใน `server.ts` |
| โมเดล AI จริง | `fastapi_service/main.py` — Express เรียกให้อยู่แล้ว ไม่ต้องแก้ client |
| สี/ฟอนต์ | `src/index.css` `@theme` เท่านั้น (ห้ามสร้าง `tailwind.config.js`) |
| ตรรกะคำนวณ | `lib/calc.ts` + เขียน test (ห้ามเขียนซ้ำใน component) |
| ย้ายไป SQL | `server-storage.ts` — `DatabaseSchema` map ตรงกับตารางได้ |

---

## 12. ความมั่นคงปลอดภัยและการเตรียมสู่ Production (Security & Production Readiness)

### 12.1 รายการความเสี่ยงที่ได้รับการแก้ไขแล้ว (Resolved Security Vulnerabilities):
- ✅ **1. `/auth/otp/send` ปิดการส่ง `demoCode` สู่สาธารณะ:** ถอด `demoCode` ออกจาก Client Response ใน Production โดยค่าตั้งต้น, อนุญาตเฉพาะเมื่อตั้ง `ENABLE_DEMO_OTP="true"` ในสภาพแวดล้อม Development เท่านั้น และบันทึกรหัสลง Console Log ของเซิร์ฟเวอร์อย่างปลอดภัย
- ✅ **2. ออกและตรวจสอบโทเค็นด้วย Signed RFC 7519 JWT:** พัฒนาโมดูล `server-jwt.ts` ใช้การเข้ารหัส HMAC-SHA256 พร้อมตรวจสอบอายุ (`exp`), ป้องกัน Timing Attacks ด้วย `crypto.timingSafeEqual`, และมี Endpoint `/api/v1/auth/me` พร้อม Unit Tests 100%
- ✅ **3. ปิดกั้นช่องโหว่ CORS (Wildcard `*` Removed):** ตั้งค่า Allowed Origins ที่น่าเชื่อถือ (Vite dev, Express origin, Capacitor `https://localhost` และ `capacitor://localhost`) ป้องกัน CSRF
- ✅ **4. ป้องกันการโจมตีแบบ Brute-Force & Flood (IP Rate Limiting):** เพิ่ม Rate Limiter สไลด์ดิ้งวินโดว์สำหรับ OTP Request (จำกัด 5 ครั้งต่อ 10 นาที) และ OTP Verify (จำกัด 10 ครั้งต่อ 5 นาที) พร้อมตอบกลับสถานะ HTTP 429
- ✅ **5. กำจัดช่องโหว่ 4 High Severity CVEs:** ถอดแพ็กเกจ `firebase` ที่ไม่ได้ใช้งานออกจาก `package.json` ส่งผลให้ช่องโหว่ระดับ High หมดไป 100%

### 12.2 สิ่งที่อยู่ใน Roadmap ถัดไป:
| # | เรื่อง | สถานะ | เป้าหมาย |
|---|---|---|---|
| 1 | JSON file DB ➔ PostgreSQL | 🟡 วางแผน | Prisma / PostgreSQL เมื่อมีผู้ใช้งานเกิน 500 คน |
| 2 | Route Guard (`/plots`, `/settings`) | 🟡 รอคำสั่งเปิดใช้งาน | ปัจจุบันเปิดให้ผู้ใช้ทดลองเข้าถึงฟังก์ชันได้อิสระ |
| 3 | SMS Gateway Integration | 🟡 รอผู้ให้บริการ | เชื่อมต่อ ThaiBulkSMS / Twilio เมื่อพร้อมทดสอบจริง |

---

## 13. บริบท Workspace

`D:\พัฒนาเว็บแอปพลิเคชัน\AI\` (FaceAI_Model, ai_bridge.py, Antigravity_SDK)
เป็นเครื่องมือระดับ workspace สำหรับงาน face recognition
**ไม่เกี่ยวข้องกับ watermelon-ai** — ตรวจสอบแล้วไม่มีการอ้างอิงถึงกัน
