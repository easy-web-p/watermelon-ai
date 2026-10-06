# การนำขึ้นใช้งานจริง (Cloud Run + Firebase Hosting)

เอกสารนี้อธิบายการต่อเว็บจริงที่ <https://acoustic-fruit-ripeness.web.app> เข้ากับ backend

## ปัญหาที่ต้องแก้

ก่อนหน้านี้ `firebase.json` เสิร์ฟเฉพาะ `dist/` และ rewrite ทุก path ไปที่ `index.html`
ทำให้ `/api/v1/...` บนเว็บจริงตอบกลับเป็นหน้า HTML ไม่ใช่ JSON ตรวจได้ด้วย

```bash
curl -s -o /dev/null -w '%{content_type}\n' https://acoustic-fruit-ripeness.web.app/api/v1/health
# ก่อนแก้: text/html  ← คือหน้า index.html ไม่ใช่ API
```

`server.ts` (36 endpoints) และ `fastapi_service` จึงไม่เคยถูกเรียกจากเว็บจริง
หน้า `/disease-scan` ตกไปใช้ `clientDiseaseHeuristic.ts` แทน

## สถาปัตยกรรมหลังแก้

```
Firebase Hosting (dist/ + CDN)
  │
  ├── /api/**  ──rewrite──▶  Cloud Run: watermelon-api   (Dockerfile ที่ราก)
  │                                │
  │                                └──▶ Cloud Run: watermelon-vision
  │                                       ├── engine legacy4  4 คลาส ปรับเทียบแล้ว
  │                                       ├── engine wide9    9 คลาส
  │                                       └── engine claude   โมเดลภาษาอ่านภาพ
  │
  └── /**      ──────────────▶  index.html (SPA)
```

เหตุผลที่ rewrite ที่ Hosting ไม่ใช่ให้เบราว์เซอร์ยิงไป Cloud Run ตรง ๆ:
เว็บกับ API อยู่ origin เดียวกัน จึงไม่ต้องตั้ง CORS และคุกกี้ session ทำงานได้
ส่วน Capacitor (Android/iOS) มี origin เป็น `https://localhost` จึงยังต้องตั้ง
`VITE_API_BASE_URL` ชี้มาที่โดเมนนี้ตอน build แอป

## สิ่งที่ต้องมีก่อน

```bash
gcloud --version      # ถ้าไม่มี: https://cloud.google.com/sdk/docs/install
firebase --version    # มีแล้ว
docker --version      # มีแล้ว

gcloud auth login
gcloud config set project acoustic-fruit-ripeness
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

## 1. สร้างความลับใน Secret Manager

`server.ts` ปฏิเสธที่จะสตาร์ทใน production ถ้าไม่ได้ตั้ง `JWT_SECRET` และ
`STORAGE_SECRET` ซึ่งเป็นพฤติกรรมที่ต้องการ — ค่า fallback ถูก commit ไว้ใน repo
ใครที่อ่านซอร์สได้จะปลอม session ผู้ดูแลระบบและเซ็น URL อ่านไฟล์ใด ๆ ได้

```bash
# สร้างค่าสุ่มคนละตัว การหมุนตัวหนึ่งจะไม่ทำให้อีกตัวใช้ไม่ได้
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" \
  | gcloud secrets create JWT_SECRET --data-file=-
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" \
  | gcloud secrets create STORAGE_SECRET --data-file=-

# Gemini สำหรับแชทใน server.ts
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Claude สำหรับ engine วิเคราะห์ภาพ (ไม่บังคับ — ถ้าไม่ใส่ engine claude จะไม่ปรากฏ)
printf '%s' "$ANTHROPIC_API_KEY" | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
```

## 2. Deploy เซอร์วิสวิเคราะห์ภาพ

ต้องขึ้นก่อน เพราะ Node API ต้องรู้ URL ของมัน

```bash
gcloud run deploy watermelon-vision \
  --source fastapi_service \
  --region asia-southeast1 \
  --no-allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 4 \
  --min-instances 0 \
  --set-env-vars VISION_ENGINE=legacy4,CLAUDE_VISION_MODEL=claude-opus-5-5 \
  --set-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```

ค่าที่เลือกและเหตุผล:

| ค่า | เหตุผล |
|---|---|
| `--no-allow-unauthenticated` | เซอร์วิสนี้ไม่มีระบบยืนยันตัวตนของตัวเอง ผู้เรียกที่ตั้งใจคือ Node API เท่านั้น เปิดสาธารณะคือให้ใครก็เรียกโมเดลด้วยค่าใช้จ่ายของคุณ |
| `--memory 2Gi` | สองโมเดลรวมกันประมาณ 34 MB แต่ `legacy4` รัน 24 crop พร้อมกันในหนึ่ง batch ซึ่งกินหน่วยความจำชั่วคราวมากกว่าขนาดไฟล์หลายเท่า |
| `--timeout 300` | engine `claude` ที่ effort สูงใช้เวลาได้หลายนาที |
| `--concurrency 4` | อนุมานบน CPU ใช้ core เต็ม คำขอพร้อมกันมากเกินไปทำให้ทุกคำขอช้าลงพร้อมกัน |
| `--min-instances 0` | ยอมรับ cold start เพื่อไม่เสียค่า instance ตอนไม่มีคนใช้ ถ้าต้องการให้ตอบเร็วเสมอให้ตั้งเป็น 1 |

จด URL ที่ได้:

```bash
VISION_URL=$(gcloud run services describe watermelon-vision \
  --region asia-southeast1 --format 'value(status.url)')
echo "$VISION_URL"
```

## 3. Build หน้าเว็บแล้ว deploy Node API

`dist/` ถูกคัดลอกเข้าอิมเมจ ไม่ได้ build ข้างใน จึงต้อง build ก่อน

```bash
npm run lint && npm run test && npm run build

gcloud run deploy watermelon-api \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --min-instances 0 \
  --set-env-vars NODE_ENV=production,TRUST_PROXY=true,VISION_SERVICE_URL=$VISION_URL,VISION_CLAUDE_TIMEOUT_MS=180000 \
  --set-secrets JWT_SECRET=JWT_SECRET:latest,STORAGE_SECRET=STORAGE_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

`TRUST_PROXY=true` จำเป็นบน Cloud Run เพราะ rate limit ของ OTP และหน้าเข้าสู่ระบบ
อ่าน IP ผู้ใช้จาก `X-Forwarded-For` ถ้าไม่ตั้ง ทุกคำขอจะดูเหมือนมาจาก IP เดียวกัน
แล้วคนหนึ่งคนจะทำให้ทุกคนถูกจำกัดพร้อมกัน

### ให้ Node API เรียกเซอร์วิสวิเคราะห์ภาพที่ปิดสาธารณะได้

```bash
PROJECT_NUMBER=$(gcloud projects describe acoustic-fruit-ripeness --format 'value(projectNumber)')
gcloud run services add-iam-policy-binding watermelon-vision \
  --region asia-southeast1 \
  --member "serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role roles/run.invoker
```

> **ยังไม่เสร็จในขั้นนี้:** `server.ts` เรียกเซอร์วิสด้วย `fetch` ธรรมดา ซึ่งยังไม่แนบ
> ID token ของ Cloud Run คำขอจะได้ 403 ทางเลือกคือแนบ ID token จาก metadata server
> ก่อนเรียก หรือ deploy เซอร์วิสวิเคราะห์ภาพด้วย `--allow-unauthenticated`
> แล้วจำกัดด้วย VPC/Ingress แทน — ดูหัวข้อ "สิ่งที่ยังค้าง" ท้ายไฟล์

## 4. ต่อ Hosting เข้ากับ Cloud Run

หลังจากที่ deploy เซอร์วิส `watermelon-api` ขึ้น Cloud Run ในข้อ 3 เรียบร้อยแล้ว
ให้เปิดใช้งาน rewrite ใน `firebase.json` โดยเพิ่ม block ต่อไปนี้ไว้หน้า `**`:

```json
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "watermelon-api",
          "region": "asia-southeast1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
```

*(หมายเหตุ: หากยังไม่ได้ deploy Cloud Run หรือยังไม่ได้เปิด Cloud Run Admin API ในโปรเจกต์ Google Cloud
การใส่ rewrite ชี้ไปที่ Cloud Run จะทำให้ Firebase Hosting ปฏิเสธ deploy ด้วย HTTP 403)*

จากนั้น deploy Hosting อีกครั้ง:

```bash
firebase deploy --only hosting
```

ตรวจผล — ต้องได้ `application/json` ไม่ใช่ `text/html`

```bash
curl -s -o /dev/null -w '%{content_type}\n' https://acoustic-fruit-ripeness.web.app/api/v1/health
curl -s https://acoustic-fruit-ripeness.web.app/api/v1/watermelon/vision-engines | head -c 400
```

## 5. Build แอปมือถือ (ถ้าต้องการ)

WebView ของ Capacitor มี origin เป็น `https://localhost` จึงต้องชี้ API แบบ absolute

```bash
VITE_API_BASE_URL=https://acoustic-fruit-ripeness.web.app npm run build
npx cap sync
```

## สิ่งที่ยังค้าง

1. **การยืนยันตัวตนระหว่าง Node API กับเซอร์วิสวิเคราะห์ภาพ** — `server.ts` ยังเรียกด้วย
   `fetch` เปล่า ต้องเพิ่มการขอ ID token จาก metadata server
   (`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=<VISION_URL>`)
   แล้วใส่เป็น `Authorization: Bearer` ก่อนจะปิด `--allow-unauthenticated` ได้จริง

2. **ฐานข้อมูลเป็นไฟล์ JSON** — `data/watermelon_db.json` อยู่ในระบบไฟล์ของ container
   ซึ่ง Cloud Run ลบทิ้งทุกครั้งที่ instance ถูกรีไซเคิล และไม่แชร์ระหว่าง instance
   ข้อมูลที่ผู้ใช้บันทึกจะหาย ต้องย้ายไป Firestore หรือ Data Connect (มี schema อยู่แล้วใน
   `dataconnect/`) ก่อนเปิดให้ใช้งานจริง **นี่เป็นตัวติดที่ใหญ่ที่สุด**

3. **`uploads/` ก็เป็นระบบไฟล์เช่นกัน** — ภาพที่ผู้ใช้อัปโหลดจะหายไปพร้อม instance
   ต้องย้ายไป Cloud Storage

ข้อ 2 และ 3 ทำให้สถาปัตยกรรมนี้เหมาะกับการทดสอบบนโดเมนจริง แต่ยังไม่พร้อมรับผู้ใช้จริง
