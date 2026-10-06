# เซอร์วิสวิเคราะห์ภาพ (FastAPI + ONNX Runtime) สำหรับ Cloud Run
#
# ไม่ติดตั้ง PyTorch ในอิมเมจนี้ เพราะเส้นทางเสิร์ฟใช้ ONNX Runtime เท่านั้น
# (ดูเหตุผลที่หัวไฟล์ model.py) การใส่ torch เข้ามาจะทำให้อิมเมจโตขึ้นหลาย GB
# โดยไม่ได้ใช้ ส่วนการเทรนและ export ทำบนเครื่องที่มี torch แล้วนำไฟล์ .onnx มาวาง

FROM python:3.12-slim AS base

# onnxruntime ต้องการ libgomp1 ส่วน Pillow ต้องการ libjpeg กับ zlib
# ติดตั้งเท่าที่ใช้จริง ไม่เอา build-essential ติดมาในอิมเมจสุดท้าย
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# โค้ดและไฟล์โมเดล — คัดลอกหลังติดตั้ง dependency เพื่อให้แก้โค้ดแล้ว build ใหม่เร็ว
COPY *.py ./
COPY model.onnx model.onnx.json metrics.json ./
# wide9 เป็นตัวเสริม ถ้าไม่มีไฟล์เซอร์วิสยังสตาร์ทได้ (ดู engines.build_registry)
# ใช้ * เพื่อให้ไม่พังตอน build ถ้าไม่ได้วางไฟล์ไว้
COPY wide9.onnx* wide9.labels.json* ./
# calibration.json เป็นตัวเสริม ถ้าไม่มีจะรายงานว่ายังไม่ปรับเทียบ
COPY calibration.json* ./

# รันด้วยผู้ใช้ที่ไม่ใช่ root
RUN useradd --create-home --shell /usr/sbin/nologin vision \
    && chown -R vision:vision /app
USER vision

# Cloud Run ส่งพอร์ตมาทาง $PORT และต้องฟังที่ 0.0.0.0
ENV PORT=8080
EXPOSE 8080

# เซอร์วิสโหลดโมเดลตอนสตาร์ท (lifespan) และปฏิเสธที่จะสตาร์ทถ้าไฟล์โมเดลหาย
# ซึ่งเป็นพฤติกรรมที่ต้องการ: deploy ที่โมเดลหายต้องไม่ดูเหมือนว่าปกติ
#
# worker เดียวโดยเจตนา — แต่ละ worker โหลดโมเดลลงหน่วยความจำของตัวเอง
# ให้ Cloud Run ขยายจำนวน instance แทนการเพิ่ม worker ในหนึ่ง container
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
