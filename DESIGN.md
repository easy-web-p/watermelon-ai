# 🎨 Design System & UI Craft Playbook (DESIGN.md)

> คู่มือและกฎเกณฑ์การออกแบบส่วนต่อประสานผู้ใช้ (UI Craft & Design Principles)  
> อ้างอิงมาตรฐาน **Frontend Design (Anthropics)**, **Better UI (Jakub Krehel)** และ **UI Skills Playbook (Ibelick)**

---

## 🧭 1. ปรัชญาการออกแบบหลัก (Core Design Principles)

1. **Design must match the domain context (ดีไซน์ต้องมาจากเรื่องที่ทำ)**:
   - งานตรวจโรคพืชแตงโมสำหรับเกษตรกรต้องเข้าใจง่าย ชัดเจน ใช้งานกลางแดดได้ ไม่ใช่แดชบอร์ดการเงินที่เต็มไปด้วยตัวเลขรก
   - คำศัพท์ต้องเป็นภาษาที่เกษตรกรเข้าใจจริง (เช่น "ราน้ำค้าง", "พ่นช่วงเย็น", "เว้นระยะแดด") ไม่ใช่ศัพท์คอมพิวเตอร์
2. **Typography with Intent (เลือกฟอนต์อย่างตั้งใจ)**:
   - ใช้เพียง 1–2 ตระกูลฟอนต์ (เน้นอ่านง่าย สบายตา)
   - ความยาวบรรทัดไม่ควรเกิน 80 ตัวอักษร (`max-w-[70ch]` หรือ `max-w-xl`)
   - หัวข้อใช้ `text-balance` และเนื้อหาใช้ `text-pretty`
3. **Spend Boldness in One Place (ใส่ความกล้าไว้จุดเดียว)**:
   - ให้หน้าจอมี "ของเด่น" เพียงชิ้นเดียว (เช่น กล่องสแกนภาพ AI ใบแตงโมพร้อมการ์ดวินิจฉัยโรค)
   - ส่วนประกอบรอบข้างต้องเรียบ นิ่ง มีระเบียบ ตัดของตกแต่งที่ไม่ช่วยแก้ปัญหาออก

---

## 📐 2. กฎความเนี้ยบระดับไมโคร (Better UI Micro-Details)

### 1) Concentric Border Radius (สูตรมุมโค้งซ้อนกัน)
$$\text{Inner Radius} = \text{Outer Radius} - \text{Padding}$$
- **ห้าม:** ใช้ `rounded-2xl` ทั้งกล่องนอกและกล่องใน เพราะจะทำให้มุมดูบวมเบี้ยว
- **ตัวอย่าง:**
  - กล่องนอก: `border-radius: 24px;` (`rounded-3xl`), `padding: 8px;` (`p-2`)
  - กล่องใน: `border-radius: 16px;` (`rounded-2xl`)

### 2) Tactile Scale on Press (สัมผัสการกดปุ่มจริง)
- ปุ่มที่กดต้องยุบตัวที่สเกล **`scale(0.96)`** เท่านั้น (ห้ามต่ำกว่า 0.95 เพราะจะดูยวบเกินไป)
- ความเร็ว Transition ของการกด: `150ms` ด้วย `cubic-bezier(0.2, 0, 0, 1)`
- จุดสัมผัส (Touch Target) บนมือถือต้องมีขนาดอย่างน้อย **$44 \times 44\text{ px}$**

### 3) Optical Alignment & Icon Stroke
- ไอคอนข้างตัวหนังสือปกติ (Font Weight 400): ใช้เส้นหนา **1.5px**
- ไอคอนข้างตัวหนังสือหนา (Font Weight 600+): ใช้เส้นหนา **2.0px**
- จัดกึ่งกลางด้วยสายตา (Optical alignment) ไม่ยึดแค่ Geometric center เพียงอย่างเดียว

### 4) Transition Discipline (ห้ามเขียน `transition: all`)
- **ห้ามเด็ดขาด:** `transition: all` หรือ `transition-all`
- **ให้ระบุเฉพาะ Property ที่เปลี่ยนจริง:**
  - `transition-colors` (สีพื้นหลัง, ตัวหนังสือ, เส้นขอบ)
  - `transition-transform` (ตำแหน่ง, สเกล)
  - `transition-opacity` (ความโปร่งใส)

### 5) Image Placeholders & Numbers
- กำหนด `aspect-ratio` ให้กับพื้นที่รูปภาพเสมอ เพื่อไม่ให้เลย์เอาต์กระตุกตอนโหลด (Prevent Layout Shift)
- ตัวเลขสถิติ ความแม่นยำ เปอร์เซ็นต์ ให้ใช้ `tabular-nums` เสมอ เพื่อให้ตัวเลขเรียงตรงหลัก

---

## 🛠️ 3. CSS Utility Classes ที่ถูกกำหนดในระบบ

```css
/* Tactile Button Feedback */
.btn-tactile {
  min-height: 44px;
  min-width: 44px;
  transition-property: transform, background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
.btn-tactile:active {
  transform: scale(0.96);
}

/* Typography Balance */
h1, h2, h3, h4 {
  text-wrap: balance;
}
p, span, li {
  text-wrap: pretty;
}

/* Tabular Numbers */
.metric-num {
  font-variant-numeric: tabular-nums;
}
```
