# Quick Start Guide

## การเริ่มต้นใช้งาน Preventive Maintenance System

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
cd /Users/teejakkrit/Desktop/pmm1
npm install
```

### ขั้นตอนที่ 2: ทดสอบ API Server

ก่อนรัน Electron ให้ทดสอบ API Server ก่อน:

```bash
npm run test:server
```

ถ้าสำเร็จจะเห็น:
```
Starting API Server...
✓ API Server running on http://localhost:3000
✓ API Server is running at http://localhost:3000
✓ Press Ctrl+C to stop
```

**ทดสอบ API:**

เปิด terminal ใหม่และรัน:
```bash
curl http://localhost:3000/api/health
```

ควรได้ผลลัพธ์:
```json
{"status":"ok","message":"Server is running"}
```

กด `Ctrl+C` เพื่อหยุด server

---

### ขั้นตอนที่ 3: รัน Electron App

**ปัญหาที่พบ:** ตอนนี้ Electron อาจจะมีปัญหาในการรัน

**แนวทางแก้ไข 2 วิธี:**

#### วิธีที่ 1: รัน API Server และเปิด Browser (แนะนำ)

1. รัน API Server:
```bash
npm run test:server
```

2. เปิด browser ไปที่:
```
http://localhost:3000
```

3. ใช้งานโปรแกรมผ่าน web browser

**ข้อดี:**
- ไม่ต้องรอ Electron build
- รันได้เร็ว
- ใช้ได้ทุกระบบปฏิบัติการ

---

#### วิธีที่ 2: แก้ไข Electron (สำหรับ Desktop App)

ถ้าต้องการรัน Electron จริง ๆ:

1. ตรวจสอบว่า Electron ติดตั้งถูกต้อง:
```bash
npm list electron
```

2. ลองรัน:
```bash
npm start
```

3. ถ้ายังไม่ได้ ให้ติดตั้งใหม่:
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

---

### ขั้นตอนที่ 4: Upload ข้อมูล

1. คลิกที่เมนู "Upload ข้อมูล"
2. เลือกไฟล์ Excel: `H03_2010_2025.XLSx`
3. กดปุ่ม "Upload และวิเคราะห์ข้อมูล"
4. รอให้ระบบประมวลผล

**หมายเหตุ:** ใน Demo Mode ต้องใช้ Electron เพื่อเลือกไฟล์ได้ ถ้ารันใน browser ให้ใช้ file path API

---

### ขั้นตอนที่ 5: ดูผลการวิเคราะห์

1. **Dashboard** - ดูภาพรวมทั้งหมด
2. **วิเคราะห์** - เลือกเครื่องเพื่อดูรายละเอียด
3. **พยากรณ์** - ดูการพยากรณ์และความเสี่ยง
4. **ประวัติ** - ดูประวัติการซ่อมทั้งหมด

---

## การใช้งานผ่าน API โดยตรง

สำหรับ Developer หรือการ integrate กับระบบอื่น:

### Start Server
```bash
npm run test:server
```

### API Examples

**ดูเครื่องจักรทั้งหมด:**
```bash
curl http://localhost:3000/api/machines
```

**ดู Dashboard:**
```bash
curl http://localhost:3000/api/dashboard
```

**วิเคราะห์ความถี่:**
```bash
curl "http://localhost:3000/api/analyze/frequency?machine=H03&startDate=2020-01-01&endDate=2025-12-31"
```

**พยากรณ์การเสีย:**
```bash
curl "http://localhost:3000/api/predict/next-failure?machine=H03"
```

**Risk Score:**
```bash
curl "http://localhost:3000/api/risk/score?machine=H03"
```

---

## ข้อมูลเพิ่มเติม

- [README.md](README.md) - ข้อมูลโครงสร้างและฟีเจอร์
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - คู่มือแก้ปัญหา

---

## สรุป

**วิธีที่ง่ายที่สุดในการทดสอบ:**

```bash
# Terminal 1: Start API Server
npm run test:server

# Browser: เปิด
http://localhost:3000
```

โปรแกรมจะทำงานได้เต็มรูปแบบผ่าน web browser!

---

## Next Steps

1. ✓ ทดสอบ API Server
2. ✓ Upload ข้อมูล Excel
3. ✓ ดูผลการวิเคราะห์
4. Build Electron App สำหรับ Production (ถ้าต้องการ)

```bash
# Build สำหรับ macOS
npm run build:mac

# Build สำหรับ Windows
npm run build:win
```
