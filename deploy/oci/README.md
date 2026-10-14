# OCI Always Free deployment

ชุดนี้รัน Watermelon AI ทั้งระบบบน OCI Ampere A1 VM เครื่องเดียวโดยไม่ใช้ CPU/RAM
ของคอมพิวเตอร์เจ้าของแอป:

- Caddy เปิดเฉพาะพอร์ต 80/443 และออกใบรับรอง HTTPS อัตโนมัติ
- Node API, FastAPI Vision และ Ollama อยู่ใน private Docker network
- `data/`, `uploads/`, โมเดล Ollama และใบรับรองมี volume ถาวร
- Claude Vision และ Gemini ปิดไว้ตามค่าเริ่มต้นเพื่อไม่ให้เกิดค่า API
- `bootstrap.sh` สุ่ม `JWT_SECRET` และ `STORAGE_SECRET` บน VM ไม่ส่งค่าจากเครื่องขึ้นไป

## ขนาด VM

เลือก `VM.Standard.A1.Flex` ที่มีป้าย Always Free ใช้ 2 OCPU / RAM 12 GB และ Ubuntu
24.04 ARM64 ใน home region ของบัญชี ใช้ boot volume ภายในโควตา Always Free

ใน Security List/Network Security Group เปิด inbound เฉพาะ:

- TCP 22 จาก IP ผู้ดูแลเท่านั้น
- TCP 80 จากทุกที่
- TCP 443 จากทุกที่
- UDP 443 จากทุกที่ (HTTP/3; ตัดออกได้โดยเว็บยังทำงานผ่าน TCP)

ห้ามเปิด 3000, 8000, 8080 หรือ 11434 สู่ Internet

## ส่งไฟล์จากเครื่อง Windows

```powershell
powershell -ExecutionPolicy Bypass -File deploy/oci/package.ps1
scp .\watermelon-ai-oci.tar.gz ubuntu@VM_PUBLIC_IP:/tmp/
```

ไฟล์แพ็กเกจไม่รวม `.env`, ฐานข้อมูลผู้ใช้, uploads, cache หรือ Git history แต่รวม
ONNX weights ที่จำเป็นและ `dist/` ซึ่งผ่าน lint, test และ build แล้ว

## ติดตั้งบน VM

```bash
sudo mkdir -p /opt/watermelon-ai
sudo tar -xzf /tmp/watermelon-ai-oci.tar.gz -C /opt/watermelon-ai
sudo chown -R "$USER":"$USER" /opt/watermelon-ai
cd /opt/watermelon-ai
bash deploy/oci/bootstrap.sh
```

สคริปต์จะสร้าง hostname ฟรีรูปแบบ `watermelon-<PUBLIC-IP>.sslip.io`, ออก HTTPS,
ดาวน์โหลด `qwen3.5:4b`, สตาร์ตทุกบริการ และตรวจ `/api/v1/health`

## ตรวจและดูแลระบบ

```bash
cd /opt/watermelon-ai/deploy/oci
sudo docker compose --env-file .env.oci ps
sudo docker compose --env-file .env.oci logs --tail=200
curl -fsS "https://$(sed -n 's/^PUBLIC_HOST=//p' .env.oci)/api/v1/health"
```

สำรองข้อมูลอย่างน้อยสองโฟลเดอร์นี้ออกนอก VM และทดสอบ restore เป็นระยะ:

```text
deploy/oci/state/data/
deploy/oci/state/uploads/
```

OCI Always Free ไม่มี SLA และอาจ reclaim เครื่องที่เข้าเกณฑ์ idle จึงต้องมี backup
แม้ระบบจะตั้ง `restart: unless-stopped` ให้กลับมาหลัง reboot แล้วก็ตาม
