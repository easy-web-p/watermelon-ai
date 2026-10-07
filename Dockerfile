# Node API (server.ts) สำหรับ Cloud Run
#
# อิมเมจนี้เสิร์ฟทั้ง REST API และไฟล์สแตติกใน dist/ เหมือนที่ `npm start`
# ทำบนเครื่อง ส่วน Firebase Hosting จะ rewrite เฉพาะ /api/** มาที่นี่
# (ดู firebase.json) หน้าเว็บยังเสิร์ฟจาก Hosting ซึ่งมี CDN อยู่หน้า
#
# ต้อง build ก่อน deploy เพราะ dist/ ถูกคัดลอกเข้าอิมเมจ ไม่ได้ build ข้างใน
# ดูขั้นตอนทั้งหมดที่ DEPLOY.md

FROM node:24-slim AS deps
WORKDIR /app
# ติดตั้งจาก lockfile เพื่อให้ได้เวอร์ชันเดียวกับที่ทดสอบไว้
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
# ใช้ glob ไม่ใช่รายชื่อ เพราะรายชื่อที่ตกหล่นไม่แสดงอาการตอน build
# แต่คอนเทนเนอร์จะพังตอนสตาร์ตด้วย ERR_MODULE_NOT_FOUND ซึ่งเกิดขึ้นแล้วครั้งหนึ่ง
# เมื่อแยกตรรกะความปลอดภัยออกเป็น server-ownership.ts, server-cost-policy.ts
# และ server-history-store.ts แล้วลืมเติมในรายชื่อนี้
COPY server*.ts ./
COPY src ./src
# หน้าเว็บที่ build แล้ว — server.ts เสิร์ฟโฟลเดอร์นี้เมื่อคำขอไม่ใช่ /api
COPY dist ./dist

# tsx อยู่ใน devDependencies ซึ่งไม่ได้ติดตั้งในชั้น deps
# ติดตั้งแยกเฉพาะตัวที่จำเป็นต่อการรัน เพื่อไม่เอา devDependencies ทั้งชุดมา
RUN npm install --no-save tsx@^4.21.0

RUN useradd --create-home --shell /usr/sbin/nologin api \
    && mkdir -p /app/data /app/uploads \
    && chown -R api:api /app
USER api

# Cloud Run ส่งพอร์ตมาทาง $PORT
ENV PORT=8080
EXPOSE 8080

# server.ts ปฏิเสธที่จะสตาร์ทใน production ถ้าไม่ได้ตั้ง JWT_SECRET และ
# STORAGE_SECRET (ดู .env.example) ซึ่งเป็นพฤติกรรมที่ต้องการ:
# การรันด้วยค่า fallback ที่ commit ไว้ใน repo หมายถึงใครก็ปลอม session ได้
CMD ["npx", "tsx", "server.ts"]
