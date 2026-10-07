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
  │                                       └── engine claude   ปิดอยู่ (เรียกแล้วเสียเงิน)
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

# Claude สำหรับ engine วิเคราะห์ภาพ — ข้ามข้อนี้ได้ถ้าไม่ต้องการใช้ตัวที่เสียเงิน
# engine claude ปิดอยู่ตามค่าเริ่มต้น ระบบตรวจโรคทำงานครบด้วยโมเดลในเครื่อง
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
  --set-env-vars VISION_ENGINE=legacy4
```

คำสั่งนี้ **ไม่เปิด engine `claude`** ซึ่งเป็นตัวเดียวที่เรียกแล้วเสียเงิน
เซอร์วิสจะขึ้นทะเบียนเฉพาะ `legacy4` กับ `wide9` ที่รันในเครื่อง ไม่มีค่าใช้จ่าย
ต่อการเรียก และหน้าจอจะเห็นแค่สองตัวนี้เพราะรายการมาจาก `GET /engines` จริง

ถ้าภายหลังต้องการเปิด ให้เติมเครดิตในบัญชี Anthropic ก่อน แล้วสั่งอัปเดตด้วย

```bash
gcloud run services update watermelon-vision --region asia-southeast1 \
  --update-env-vars VISION_ENABLE_CLAUDE=1,CLAUDE_VISION_MODEL=claude-opus-5-5 \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```

ปิดคืนด้วย `--update-env-vars VISION_ENABLE_CLAUDE=0` การถอดคีย์ออกก็ปิดได้
แต่สวิตช์ชัดเจนกว่าและไม่ต้องยุ่งกับความลับ

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
  --set-env-vars NODE_ENV=production,TRUST_PROXY=true,VISION_SERVICE_URL=$VISION_URL,VISION_CLAUDE_TIMEOUT_MS=180000,HISTORY_FIRESTORE=1,FIRESTORE_PROJECT_ID=acoustic-fruit-ripeness \
  --set-secrets JWT_SECRET=JWT_SECRET:latest,STORAGE_SECRET=STORAGE_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest
```

`HISTORY_FIRESTORE=1` **ต้องตั้งบน Cloud Run** ถ้าไม่ตั้ง ประวัติการสนทนาจะเก็บลงไฟล์
ในคอนเทนเนอร์ ซึ่งหายทุกครั้งที่ instance ถูกรีไซเคิลและไม่แชร์ระหว่าง instance
ดูวิธีเตรียม Firestore ที่หัวข้อถัดไป

ไม่ได้ตั้ง `CHAT_ENABLE_GEMINI` ไว้โดยเจตนา โมเดลแชทที่เสียเงินจึงปิดอยู่ แชทตอบด้วย
ระบบกฎในเครื่องซึ่งไม่มีค่าใช้จ่าย เปิดได้ด้วยการเพิ่ม `CHAT_ENABLE_GEMINI=1`
การใส่ `GEMINI_API_KEY` ไว้เฉย ๆ ไม่ทำให้เกิดค่าใช้จ่าย

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

### เตรียม Firestore สำหรับประวัติการสนทนา

ทำครั้งเดียวต่อโปรเจกต์

```bash
gcloud services enable firestore.googleapis.com
# ถ้ายังไม่มีฐานข้อมูล สร้างแบบ Native mode
gcloud firestore databases create --location asia-southeast1

PROJECT_NUMBER=$(gcloud projects describe acoustic-fruit-ripeness --format 'value(projectNumber)')
gcloud projects add-iam-policy-binding acoustic-fruit-ripeness --member "serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role roles/datastore.user
```

ไม่ต้องเขียน security rules เพราะเบราว์เซอร์ไม่ได้ต่อ Firestore ตรง ๆ ทุกคำขอผ่าน
`server.ts` ซึ่งตรวจสิทธิ์เจ้าของจาก JWT อยู่แล้ว (ดู `server-ownership.ts`)
ถ้าวันหนึ่งให้ไคลเอนต์อ่านตรง ต้องเขียน rules ก่อน ไม่งั้นข้อมูลของทุกคนอ่านได้จากภายนอก

ตรวจหลัง deploy ว่าใช้ Firestore จริง

```bash
curl -s https://acoustic-fruit-ripeness.web.app/api/v1/health
# ต้องได้  "history": { "backend": "firestore", "reason": "" }
# ถ้าได้ "file" ให้อ่าน reason ซึ่งบอกว่าขาดอะไร
```

## 4. ต่อ Hosting เข้ากับ Cloud Run

`firebase.json` มี rewrite นี้แล้ว (เพิ่มเมื่อ 2026-10-07 — เอกสารรุ่นก่อนอ้างว่ามีอยู่แล้ว
ทั้งที่ไฟล์จริงมีแต่ `** → /index.html` ซึ่งเป็นสาเหตุที่ `/api/v1/...` บนเว็บจริงตอบเป็น HTML):

```json
    "rewrites": [
      { "source": "/api/**", "run": { "serviceId": "watermelon-api", "region": "asia-southeast1" } },
      { "source": "**", "destination": "/index.html" }
    ]
```

ลำดับสำคัญ — `/api/**` ต้องมาก่อน `**` ถ้าสลับกัน ทุก path จะถูกจับโดย `**`
แล้วส่งคืน `index.html` ซึ่งเป็นอาการเดิมที่ทำให้ `/api/v1/...` ตอบเป็น HTML

> **ข้อควรระวัง:** rewrite ชี้ไปที่เซอร์วิส `watermelon-api` ซึ่งต้อง deploy ตามข้อ 3
> ให้เสร็จก่อน ถ้ายังไม่มีเซอร์วิสนั้น หรือยังไม่ได้เปิด Cloud Run Admin API
> Firebase Hosting จะปฏิเสธ deploy ด้วย HTTP 403 — ให้ทำข้อ 2 และ 3 ให้จบก่อนเสมอ

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

## engine ตัวไหนเสียเงิน

| engine | ที่รัน | ค่าใช้จ่ายต่อการเรียก | เปิดอยู่ตามค่าเริ่มต้น |
|---|---|---|---|
| `legacy4` | ในเครื่อง/ใน container | ไม่มี | ใช่ (เป็นตัวเริ่มต้น) |
| `wide9` | ในเครื่อง/ใน container | ไม่มี | ใช่ ถ้ามีไฟล์ `wide9.onnx` |
| `claude` | API ภายนอก | **มี** คิดตามโทเคนและขนาดภาพ | **ไม่** ต้องตั้ง `VISION_ENABLE_CLAUDE=1` |

`GET /engines` รายงาน `costs_money` รายตัว หน้าจอใช้ค่านี้ตัดสินใจว่าจะเสนอตัวไหน
จึงไม่ต้องมีรายชื่อ engine ที่เสียเงินเขียนฝังไว้ที่ฝั่งหน้าเว็บ

การตั้งคีย์ไว้ใน `.env` หรือใน Secret Manager **ไม่ทำให้ engine claude เปิดเอง**
มีเทสต์คุมข้อนี้ไว้ที่ `fastapi_service/test_engines_optin.py`

```bash
cd fastapi_service && python -m pytest -q    # 12 เทสต์ ไม่เรียก API จริง
```

## อ่านรหัสสถานะเมื่อวิเคราะห์ภาพไม่สำเร็จ

เซอร์วิสวิเคราะห์ภาพแยกความล้มเหลวสองกลุ่ม เพราะสองกลุ่มนี้ต้องทำต่างกัน

| รหัส | ความหมาย | ต้องทำอะไร |
|---|---|---|
| 422 | ภาพหรือคำขอไม่ถูกต้อง เช่นไฟล์เสีย หรือชื่อ engine ที่ไม่มีในทะเบียน | ผู้ใช้ถ่ายใหม่ หรือผู้เรียกแก้คำขอ |
| 502 | เหตุชั่วคราว เครือข่ายสะดุด โควตาต่อนาทีเต็ม ต้นทางรับไม่ทัน | ลองใหม่ได้ มีโอกาสสำเร็จ |
| 503 | เหตุที่ต้องแก้ค่าที่ตั้งไว้ก่อน คีย์ใช้ไม่ได้ เครดิตหมด ชื่อโมเดลผิด | **ลองใหม่ไม่ช่วย** ต้องไปแก้ที่ผู้ดูแลระบบ |

`engine claude` ต้องมีเครดิตในบัญชี Anthropic ด้วย ไม่ใช่มีแค่คีย์ ถ้าคีย์ถูกต้อง
แต่เครดิตหมด เซอร์วิสจะตอบ 503 พร้อมบอกว่าให้ใช้ `legacy4` หรือ `wide9`
ที่รันในเครื่องแทนได้ ไม่ใช่ตอบ 502 ซึ่งจะทำให้หน้าจอชวนผู้ใช้กดซ้ำไปเรื่อย ๆ

การจำแนกนี้มีเทสต์คุมที่ `fastapi_service/test_engines_errors.py` (ไม่เรียก API จริง
จึงรันได้ตอนไม่มีคีย์และไม่มีค่าใช้จ่าย)

```bash
cd fastapi_service && python -m pytest test_engines_errors.py -q
```

## สิ่งที่ยังค้าง

1. **การยืนยันตัวตนระหว่าง Node API กับเซอร์วิสวิเคราะห์ภาพ** — `server.ts` ยังเรียกด้วย
   `fetch` เปล่า ต้องเพิ่มการขอ ID token จาก metadata server
   (`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=<VISION_URL>`)
   แล้วใส่เป็น `Authorization: Bearer` ก่อนจะปิด `--allow-unauthenticated` ได้จริง

2. ~~**ฐานข้อมูลเป็นไฟล์ JSON**~~ — **แก้แล้วเฉพาะประวัติการสนทนา** (2026-10-07)
   ห้องสนทนาและข้อความไปอยู่บน Firestore เมื่อตั้ง `HISTORY_FIRESTORE=1`
   (ดู `server-history-store.ts`)

   **ส่วนที่เหลือใน `watermelon_db.json` ยังไม่ได้ย้าย** — ผู้ใช้, ความยินยอม, แปลง,
   รายงาน, ประวัติผลสแกน (`diseaseRecords`), audit log ยังอยู่ในไฟล์และยังหาย
   เมื่อ instance ถูกรีไซเคิล ย้ายได้ด้วยรูปแบบเดียวกับที่ทำไว้แล้ว

3. **`uploads/` ก็เป็นระบบไฟล์เช่นกัน** — ภาพที่ผู้ใช้อัปโหลดจะหายไปพร้อม instance
   ต้องย้ายไป Cloud Storage

ข้อ 2 (ส่วนที่เหลือ) และข้อ 3 ยังทำให้สถาปัตยกรรมนี้เหมาะกับการทดสอบบนโดเมนจริง
มากกว่ารับผู้ใช้จริง อาการที่ผู้ใช้จะเห็นก่อนคือรูปที่แนบในแชทหายหลัง instance
ถูกรีไซเคิล เพราะ `uploads/` ยังเป็นระบบไฟล์ (ข้อ 3) ขณะที่ตัวข้อความยังอยู่ครบ
