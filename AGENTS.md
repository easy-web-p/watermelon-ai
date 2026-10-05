# Watermelon AI — ข้อตกลงการทำงานร่วมกันของ AI สองตัว

> โปรเจกต์นี้ดูแลโดย AI สองตัวที่แบ่งงานกันชัดเจน
> อ่านไฟล์นี้ก่อนแก้โค้ดทุกครั้ง เพื่อไม่ให้แก้ทับกัน

| AI | ขอบเขต | สิ่งที่ตัดสินใจได้เอง |
|---|---|---|
| **Claude Code** | Backend · API · Data · Logic · Security | สัญญา API, โครงสร้างข้อมูล, ตรรกะคำนวณ, ความปลอดภัย |
| **Antigravity** | Frontend · UI · UX · Design System | เลย์เอาต์, สี, ตัวอักษร, อนิเมชัน, คอมโพเนนต์ภาพ |

---

## 1. ความเป็นเจ้าของไฟล์ (File Ownership)

### 🔧 Claude Code เป็นเจ้าของ

```
server.ts                      API หลัก 36 endpoints
server-storage.ts              persistence + signed URL
fastapi_service/               โมเดล vision
data/watermelon_db.json        ฐานข้อมูล

src/lib/api.ts                 ◀── สัญญา API (ไฟล์สำคัญที่สุดระหว่างเรา)
src/lib/calc.ts                ตรรกะคำนวณ (รหัสผ่าน, แปลง, เงิน)
src/lib/media.ts               บีบอัดภาพ, อัดเสียง
src/lib/export.ts              PDF / CSV / clipboard
src/store/                     session, consent, server state

src/data/*.ts                  ข้อมูลอ้างอิงเชิงวิชาการ ⚠️ ดูข้อ 4
src/**/*.test.ts(x)            เทสต์ทั้งหมด

android/app/src/main/AndroidManifest.xml
ios/App/App/Info.plist         สิทธิ์ native
.env .env.example
```

### 🎨 Antigravity เป็นเจ้าของ

```
src/routes/*.tsx               ทุกหน้าจอ (ส่วนที่เป็นภาพ)
src/components/ui/             Button, Card, Badge, Modal, ...
src/components/layout/         AppShell, Sidebar, MarketingShell
src/components/brand/          Logo, MelonAvatar
src/index.css                  design tokens (@theme) ทั้งหมด

public/assets/                 รูปภาพ
public/manifest.json           PWA manifest
public/icons/                  ไอคอนแอป
index.html
```

### 🤝 ต้องคุยกันก่อนแก้

```
src/components/domain/         การ์ดแสดงผลจาก AI
                               → รูปลักษณ์ = Antigravity
                               → ชื่อ field ที่ใช้ = Claude Code
src/App.tsx                    route table (ส่วนใหญ่เป็น UI)
package.json                   เพิ่ม dependency ต้องแจ้งอีกฝ่าย
public/sw.js                   กลยุทธ์ cache กระทบทั้งสองฝั่ง
```

---

## 2. กฎการข้ามเส้น (Interface Rules)

### Antigravity → Backend

- **ห้ามเรียก `fetch` ตรง ๆ ในหน้าจอ** ต้องผ่าน `src/lib/api.ts` เท่านั้น
- ถ้าต้องการข้อมูลที่ยังไม่มี **อย่า hard-code แล้วทำเป็นว่ามี** — แจ้ง Claude Code ให้เพิ่ม endpoint
- ชื่อ field ที่ API ส่งมาเปลี่ยนไม่ได้เอง (เช่น `confidence_percentage`, `knockAnalysis`)

### Claude Code → UI

- **ห้ามแก้ `className` เพื่อความสวยงาม** ถ้าไม่ได้เกี่ยวกับ bug
- **ห้ามแก้ค่าใน `@theme`** ของ `src/index.css`
- เมื่อเพิ่ม endpoint ใหม่: เพิ่ม type + method ใน `api.ts` แล้ว**แจ้ง Antigravity** พร้อมตัวอย่าง response

### ตัวอย่างการส่งงานที่ถูกต้อง

```
Antigravity: "หน้า /plots อยากได้ข้อมูลสภาพอากาศรายแปลง"
             ↓
Claude Code: เพิ่ม GET /api/v1/plots/:id/weather
             เพิ่ม type WeatherReading + api.plotWeather() ใน api.ts
             แจ้งกลับพร้อม shape ของ response
             ↓
Antigravity: เรียก api.plotWeather(id) แล้วออกแบบการ์ดแสดงผล
```

---

## 3. กฎที่ทั้งสองฝ่ายต้องรักษา

เหล่านี้ไม่ใช่เรื่องสไตล์ — ละเมิดแล้วมีผลต่อผลผลิตจริงของเกษตรกร

1. **ห้ามแสดงคำแนะนำสารเคมีโดยไม่มีค่า PHI** (ระยะปลอดภัยก่อนเก็บเกี่ยว)
2. **ห้ามตัดข้อความกำกับว่า AI เป็นเครื่องมือช่วยตัดสินใจ** (ใต้แถบพิมพ์แชท, หน้า `/terms`)
3. **ห้ามตัดข้อความ "เจ้าหน้าที่จะไม่ขอ OTP"** (หน้า `/otp`, `/security`) — กัน social engineering
4. **ห้ามกลืน error เป็นค่าว่างหรือค่า default** — โหลดไม่ได้ต้องบอกผู้ใช้ตรง ๆ
5. **ห้ามให้ service worker cache `/api/`** — ราคาเก่าหรือ "บันทึกสำเร็จ" ปลอม อันตรายกว่า error
6. **ห้ามกุข้อมูล** — ไม่สร้างรีวิวเกษตรกร ผลวิจัย หรือตัวเลขที่ไม่มีแหล่งอ้างอิง

---

## 4. ข้อมูลวิชาการ (`src/data/*.ts`)

ไฟล์เหล่านี้ดูเหมือนเป็น "เนื้อหา" แต่เป็นข้อมูลที่มีผลต่อความปลอดภัย:

| ไฟล์ | ความเสี่ยงถ้าผิด |
|---|---|
| `diseases.ts` | อัตราสารเคมีผิด → พืชตาย หรือสารตกค้างเกินมาตรฐาน |
| `inputs.ts` | กลุ่ม FRAC/IRAC ผิด → เชื้อดื้อยา |
| `tankmix.ts` | ลำดับผสมผิด → ตะกอนจับก้อน อุดหัวฉีด |
| `cultivars.ts` | ค่า Brix ผิด → เก็บเกี่ยวผิดเวลา |

**Antigravity แก้ได้:** ข้อความบรรยาย, ชื่อที่แสดงผล, การจัดกลุ่มเพื่อแสดง
**Antigravity ห้ามแก้:** ตัวเลขอัตรา, ค่า PHI, กลุ่มสารออกฤทธิ์, ลำดับผสม

ถ้าต้องแก้ตัวเลข ให้แจ้ง Claude Code พร้อมแหล่งอ้างอิง

---

## 5. ก่อนส่งงานทุกครั้ง

```bash
npm run lint    # tsc --noEmit ต้องสะอาด
npm run test    # ต้องผ่านทั้งหมด
npm run build   # ต้อง build ผ่าน
```

ถ้าแก้ของอีกฝ่ายจนเทสต์พัง **อย่าลบเทสต์** — แจ้งเจ้าของไฟล์

---

## 6. เอกสารอ้างอิง

| ไฟล์ | เนื้อหา | ใครดูแล |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | สถาปัตยกรรมระบบทั้งหมด | Claude Code |
| [PROJECT_LOG.md](PROJECT_LOG.md) | สถานะงาน, สิ่งที่เหลือ, ข้อห้าม | ทั้งคู่ |
| [DESIGN.md](DESIGN.md) | กฎการออกแบบ UI | Antigravity |
| `D:\stitch_watermelon_ai_chatbot\` | ต้นฉบับ UI 44 หน้า | อ้างอิงเท่านั้น |

> **หมายเหตุเรื่องสีใน DESIGN.md:** ส่วนข้อความบรรยายระบุ `#FF3B5C` และ `#2D8A58`
> แต่ token จริงที่ Stitch ใช้คือ `#ba0035` และ `#006a3d` (ตรวจยืนยันจาก tailwind config
> ใน `code.html` แล้ว) — **ให้ยึดค่าใน `src/index.css` เป็นหลัก**
