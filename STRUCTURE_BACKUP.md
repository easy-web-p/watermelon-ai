# 🍉 Watermelon AI (Acoustic Fruit Ripeness) - System Architecture & Structure Backup

> บันทึกโครงสร้างระบบฉบับสมบูรณ์ ก่อนปรับเปลี่ยนโครงสร้างเป็น Pure REST API Backend Service  
> บันทึกเมื่อ: 2 ตุลาคม 2026

---

## 📌 1. ภาพรวมสถาปัตยกรรม (Architecture Overview)

ระบบ Watermelon AI ถูกพัฒนาขึ้นเพื่อแก้ปัญหาการประเมินความสุกของแตงโมโดยไม่ต้องผ่าผล (Non-destructive Ripeness Inspection) ผ่านเทคโนโลยี:
1. **Acoustic Resonant Frequency Analysis**: วิเคราะห์ความถี่เสียงเคาะ (80–600 Hz) ด้วย Fast Fourier Transform (FFT)
2. **Multi-modal AI with Google Gemini**: ถอดความเสียง, วิเคราะห์ภาพภายนอก (สีขั้ว, จุดสัมผัสดิน), และให้คำแนะนำ
3. **PWA & Offline Capability**: ติดตั้งลงหน้าจอโฮม รองรับการบันทึกข้อมูลในสวนขณะออฟไลน์ด้วย IndexedDB และซิงก์ขึ้นคลาวด์เมื่อมีสัญญาณ
4. **Persistent JSON Database & Secure Storage**: เก็บข้อมูลในไฟล์ `data/watermelon_db.json` พร้อมระบบความปลอดภัย HMAC-SHA256 Pre-signed URLs
5. **PDPA Compliance**: รองรับมาตรา 19, 31 (Data Portability), 33 (Right to Erasure) และแต่งตั้ง DPO ในระบบ
6. **Firebase Integration**: รองรับ Firebase Hosting, Firestore Sync, Cloud Storage, และ Google Authentication รวมถึงไฟล์คอนฟิกสำหรับ Android Studio (`google-services.json`)

---

## 📂 2. รายการไฟล์และโฟลเดอร์ในระบบเดิม (Full File Inventory)

### 2.1 ไฟล์การตั้งค่ารากฐาน (Root Configuration)
- `package.json`: นิยาม Dependencies และ Scripts (`dev`, `build`, `lint`)
- `tsconfig.json`: การตั้งค่า TypeScript Compiler
- `vite.config.ts`: การตั้งค่า Vite Build สำหรับ React และ Tailwind CSS v4
- `.env` & `.env.example`: ตัวแปรสภาพแวดล้อม (Gemini API Key, Firebase Config)
- `firebase.json`: การตั้งค่า Firebase Hosting และ SPA Rewrites
- `.firebaserc`: รหัสโปรเจกต์ Firebase (`acoustic-fruit-ripeness`)
- `google-services.json`: คอนฟิก Android SDK (Package `watermelon.ai`)
- `metadata.json`: ข้อมูลความสามารถและสิทธิ์ของแอปพลิเคชัน
- `server.ts`: Node.js Express Server พร้อม 18+ REST Endpoints และ Vite SSR/Dev middleware
- `server-storage.ts`: Persistent JSON Engine พร้อม Atomic File Writing, Backup และ HMAC Signed URLs

### 2.2 โฟลเดอร์ข้อมูลและสื่อ (Data & Storage)
- `data/watermelon_db.json`: ฐานข้อมูล JSON ของระบบ (Users, Conversations, Messages, Prompts, Folders, Knowledge, Audit Logs, Specimens)
- `uploads/`: โฟลเดอร์เก็บไฟล์เสียงเคาะ (`.webm`, `.wav`) และรูปภาพที่ผู้ใช้อัปโหลด

### 2.3 โฟลเดอร์สาธารณะและ PWA (Public Directory)
- `public/manifest.json`: Web App Manifest สำหรับ PWA (Add to Home Screen)
- `public/sw.js`: Service Worker สำหรับการแคชออฟไลน์และ Background Sync
- `public/icons/icon.svg`: ไอคอนแอปพลิเคชัน
- `public/audio/samples/`: ตัวอย่างไฟล์เสียงเคาะแตงโมจริง:
  - `ripe-sample.wav` (ความถี่ ~145 Hz สุกพอดี)
  - `unripe-sample.wav` (ความถี่ ~185 Hz ดิบ)
  - `overripe-sample.wav` (ความถี่ ~120 Hz สุกเกิน/ไส้ล้ม)

### 2.4 โค้ดส่วนหน้าเว็บและคอมโพเนนต์ (Frontend Source `src/`)
- `src/App.tsx`: App Shell ควบคุมการนำทางและแสดงผลตาม Role
- `src/main.tsx`: Entry point ของ React 19
- `src/index.css`: Tailwind CSS v4 stylesheets
- `src/components/chat/`:
  - `AcousticWaveformVisualizer.tsx`: กราฟคลื่นเสียงและสเปกตรัม FFT แบบ Real-time
  - `ChatComposer.tsx`: กล่องพิมพ์ข้อความ, อัดเสียงเคาะ, ถ่ายภาพ
  - `ChatMessage.tsx`: กล่องข้อความแชท แสดงผลคะแนนความสุกและคลื่นเสียง
  - `ChatSidebar.tsx`: แถบเมนูด้านข้างและประวัติการสนทนา
  - `ChatWorkspace.tsx`: พื้นที่หลักสำหรับการสนทนากับ AI
- `src/components/lab/`:
  - `WatermelonLabView.tsx`: ห้องแล็บวิเคราะห์เสียงขั้นสูง และ Batch Processing
  - `AcousticCalibrationModal.tsx`: ระบบตัดเสียงรบกวน (Noise Reduction) และสอบเทียบความถี่ตามสายพันธุ์
  - `WatermelonCertificateModal.tsx`: ใบรับรองคุณภาพแตงโมดิจิทัล
- `src/components/auth/`:
  - `AuthModal.tsx`: เข้าสู่ระบบด้วย Google Firebase, OTP เบอร์โทร และบัญชีทดสอบ
  - `RoleBadgeSelector.tsx`: สลับบทบาท (เกษตรกร, พ่อค้าคนกลาง, ผู้บริโภค, แอดมิน)
- `src/components/consent/`:
  - `CookieBanner.tsx`: แบนเนอร์ขอความยินยอมตาม PDPA
  - `PdpaRightsModal.tsx`: ใช้สิทธิ์ขอลบข้อมูล (Forget Me) และดาวน์โหลดข้อมูล (Data Portability)
- `src/components/pwa/`:
  - `PwaInstallBanner.tsx`: แถบแนะนำติดตั้งสโตร์ลงหน้าจอโฮม
  - `OfflineIndicator.tsx`: ป้ายแจ้งสถานะออฟไลน์และปุ่มซิงก์ข้อมูล
- `src/components/admin/AdminDashboard.tsx`: แดชบอร์ดตรวจสอบระบบและ Audit Logs
- `src/components/folders/FoldersView.tsx`: จัดการโฟลเดอร์แปลงปลูก
- `src/components/prompts/PromptsView.tsx`: จัดการคลังชุดคำสั่ง Prompt
- `src/components/varieties/WatermelonVarietiesView.tsx`: ฐานข้อมูลสายพันธุ์แตงโม
- `src/components/simulator/WatermelonSimulatorView.tsx`: แบบจำลองเสียงเคาะแตงโม
- `src/components/feedback/ReportDialog.tsx`: ส่งรายงานปัญหา
- `src/components/knowledge/KnowledgeView.tsx`: คลังความรู้
- `src/components/settings/SettingsView.tsx`: ตั้งค่าระบบ
- `src/components/help/HelpView.tsx`: คู่มือการใช้งาน
- `src/components/landing/LandingPage.tsx`: หน้าแรกสำหรับผู้ใช้ทั่วไป
- `src/components/errors/`: `ForbiddenView.tsx`, `NotFoundView.tsx`

### 2.5 Library & Helpers (`src/lib/` & `src/hooks/`)
- `src/lib/audio-analyzer.ts`: FFT Engine, Bandpass Filtering (80-600Hz), Spectral Peak Detection
- `src/lib/offline-storage.ts`: IndexedDB Database Client สำหรับเก็บข้อมูลออฟไลน์
- `src/lib/firebase.ts`: การตั้งค่า Firebase Web SDK
- `src/lib/firebase-sync.ts`: การซิงก์ข้อมูลระหว่าง Local กับ Firestore/Cloud Storage
- `src/lib/api.ts`: API Client สำหรับเชื่อมต่อ Backend Endpoints
- `src/lib/pwa.ts`: ฟังก์ชันลงทะเบียน Service Worker
- `src/lib/security.ts`: การจัดการรหัสผ่านและความปลอดภัย
- `src/lib/route-permissions.ts`: การตรวจสอบสิทธิ์ตามบทบาท (RBAC)
- `src/hooks/useAudioRecorder.ts`: Custom React Hook จัดการไมโครโฟนและสตรีมเสียง
- `src/stores/`: Zustand stores (`auth-store.ts`, `chat-store.ts`, `consent-store.ts`)
- `src/types/`: TypeScript Type Definitions (`chat.ts`, `consent.ts`)

---

## 📡 3. รายการ REST API Endpoints ทั้งหมด (Backend Specification)

| ลำดับ | Method | Endpoint | หน้าที่การทำงาน |
|---|---|---|---|
| 1 | `GET` | `/api/v1/health` | ตรวจสอบสถานะการทำงานของเซิร์ฟเวอร์ |
| 2 | `GET` | `/api/v1/database/stats` | ดูสถิติ Database (ขนาด, จำนวนระเบียน, ประวัติการ Backup) |
| 3 | `POST` | `/api/v1/media/presigned-upload-url` | ขอ Pre-signed URL สำหรับอัปโหลดไฟล์สื่อ (HMAC ปลอดภัย) |
| 4 | `PUT` | `/api/v1/media/upload/:fileKey` | อัปโหลดไฟล์ Binary (ภาพถ่าย, เสียงเคาะ) เข้าเครื่อง |
| 5 | `GET` | `/api/v1/media/download/:fileKey` | ขอ Pre-signed URL สำหรับดาวน์โหลด/สตรีมไฟล์ |
| 6 | `GET` | `/api/v1/media/stream/:fileKey` | สตรีมไฟล์ภาพหรือเสียงโดยตรงผ่าน HMAC Signature |
| 7 | `GET` | `/api/v1/conversations` | ดึงรายการห้องสนทนาทั้งหมด |
| 8 | `POST` | `/api/v1/conversations` | สร้างห้องสนทนาใหม่ |
| 9 | `GET` | `/api/v1/conversations/:id/messages` | ดึงประวัติข้อความในห้องสนทนา |
| 10 | `POST` | `/api/v1/conversations/:id/messages` | ส่งข้อความแชท + วิเคราะห์คลื่นเสียง/รูปภาพผ่าน Gemini AI |
| 11 | `POST` | `/api/v1/transcribe` | ถอดเสียงพูดจากไฟล์เสียงเป็นข้อความภาษาไทย |
| 12 | `GET` | `/api/v1/prompts` | ดึงรายการชุดคำสั่ง AI Prompts |
| 13 | `POST` | `/api/v1/prompts` | สร้างชุดคำสั่ง AI Prompt ใหม่ |
| 14 | `GET` | `/api/v1/folders` | ดึงรายการโฟลเดอร์แปลงปลูก |
| 15 | `POST` | `/api/v1/folders` | สร้างโฟลเดอร์แปลงปลูกใหม่ |
| 16 | `GET` | `/api/v1/watermelons` | ดึงรายการตัวอย่างแตงโมที่บันทึกไว้ |
| 17 | `POST` | `/api/v1/watermelons` | บันทึกผลการวิเคราะห์แตงโมลูกใหม่ |
| 18 | `GET` | `/api/v1/varieties` | ดึงฐานข้อมูลมาตรฐานสายพันธุ์แตงโมไทย |
| 19 | `GET` | `/api/v1/varieties/calibration` | ดึงค่าสอบเทียบความถี่เสียงตามสายพันธุ์ |
| 20 | `POST` | `/api/v1/varieties/calibration` | บันทึก/อัปเดตค่าสอบเทียบความถี่เสียง |
| 21 | `GET` | `/api/v1/audit-logs` | ดึงประวัติ Audit Log สำหรับตรวจสอบความปลอดภัย |
| 22 | `POST` | `/api/v1/auth/social-login` | ระบบล็อกอินผ่าน Social (Google / LINE) |
| 23 | `POST` | `/api/v1/auth/phone-otp/request` | ขอรหัส OTP เบอร์โทรศัพท์ |
| 24 | `POST` | `/api/v1/auth/phone-otp/verify` | ยืนยันรหัส OTP เบอร์โทรศัพท์ |
| 25 | `GET` | `/api/v1/pdpa/policy` | ดึงนโยบายความเป็นส่วนตัวและข้อมูล DPO |
| 26 | `POST` | `/api/v1/pdpa/forget-me` | ใช้สิทธิ์ลบข้อมูลส่วนตัวทั้งหมด (Right to Erasure) |
| 27 | `GET` | `/api/v1/pdpa/export-my-data` | ส่งออกข้อมูลส่วนบุคคลทั้งหมดเป็น JSON (Data Portability) |

---

## 🔄 วิธีการ Rollback หรือนำโครงสร้างหน้าเว็บกลับมาใช้ในอนาคต

โครงสร้างทั้งหมดได้ถูกบันทึกไว้อย่างปลอดภัยใน **Git Repository** เรียบร้อยแล้ว หากในอนาคตต้องการนำโค้ดหน้าเว็บทั้งหมดกลับมา สามารถใช้คำสั่ง:
```bash
git checkout full-web-backup
```
หรือสลับ Branch ไปมาได้ตลอดเวลาโดยไม่มีข้อมูลใดสูญหาย
