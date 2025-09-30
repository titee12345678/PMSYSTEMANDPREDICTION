# 🚀 เริ่มใช้งาน Preventive Maintenance System

## ⚠️ สำคัญ: Electron มีปัญหา

ตอนนี้ Electron Desktop App มีปัญหาเกี่ยวกับ module loading ใน Electron 30+

**แนะนำให้ใช้วิธีรันแบบ Web Server แทน** (ทำงานได้เต็มรูปแบบ!)

---

## ✅ วิธีที่ 1: รันแบบ Web Server (แนะนำ)

### ขั้นตอน:

```bash
# 1. Rebuild better-sqlite3 สำหรับ Node.js (ครั้งเดียว)
npm rebuild better-sqlite3

# 2. รัน API Server
npm run test:server
```

### ผลลัพธ์:
```
Starting API Server...
✓ API Server running on http://localhost:3000
✓ API Server is running at http://localhost:3000
✓ Press Ctrl+C to stop
```

### เปิดใช้งาน:

**เปิด Web Browser ไปที่:**
```
http://localhost:3000
```

โปรแกรมพร้อมใช้งานเต็มรูปแบบ! ✨

---

## 📋 ฟีเจอร์ที่ใช้งานได้ทั้งหมด:

### 1. Dashboard
- แสดงภาพรวมเครื่องจักรทั้งหมด
- Risk Score แต่ละเครื่อง
- การเสียล่าสุดและพยากรณ์

### 2. Upload ข้อมูล
- อัปโหลดไฟล์ Excel (.xlsx, .xls)
- ตรวจสอบข้อมูลอัตโนมัติ
- รองรับภาษาไทย

### 3. วิเคราะห์
- ความถี่การเสีย
- การใช้อะไหล่
- รูปแบบการเสีย (เวลา, วัน)
- อะไหล่ที่ควรเตรียม

### 4. พยากรณ์
- พยากรณ์วันที่จะเสียครั้งต่อไป
- Risk Assessment
- ความต้องการอะไหล่ล่วงหน้า 90 วัน
- คำแนะนำการบำรุงรักษา

### 5. ประวัติ
- ดูประวัติการซ่อมทั้งหมด
- ค้นหาและกรอง
- Pagination

---

## 🔧 API Endpoints (สำหรับ Integration)

เมื่อ server รันอยู่ที่ `http://localhost:3000`:

### ข้อมูลพื้นฐาน
```bash
# Health Check
curl http://localhost:3000/api/health

# รายการเครื่องจักร
curl http://localhost:3000/api/machines

# Dashboard
curl http://localhost:3000/api/dashboard
```

### การวิเคราะห์
```bash
# สรุปเครื่องจักร
curl http://localhost:3000/api/machines/H03/summary

# ความถี่การเสีย
curl "http://localhost:3000/api/analyze/frequency?machine=H03&startDate=2020-01-01&endDate=2025-12-31"

# การใช้อะไหล่
curl "http://localhost:3000/api/analyze/parts?machine=H03"

# รูปแบบการเสีย
curl "http://localhost:3000/api/analyze/patterns?machine=H03"

# แนะนำ inventory
curl "http://localhost:3000/api/analyze/inventory?machine=H03&months=3"
```

### การพยากรณ์
```bash
# พยากรณ์การเสียครั้งต่อไป
curl "http://localhost:3000/api/predict/next-failure?machine=H03"

# พยากรณ์ความต้องการอะไหล่
curl "http://localhost:3000/api/predict/parts?machine=H03&days=90"

# Risk Score
curl "http://localhost:3000/api/risk/score?machine=H03"
```

### ประวัติ
```bash
# ประวัติทั้งหมด
curl http://localhost:3000/api/records

# ประวัติเครื่องจักรเฉพาะ
curl "http://localhost:3000/api/records?machine=H03&limit=20"
```

---

## 📁 การ Upload ข้อมูล Excel

### ผ่าน API (สำหรับ automation):

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "/path/to/H03_2010_2025.xlsx"
  }'
```

### ผ่าน Web Interface:

1. เปิด http://localhost:3000
2. คลิกเมนู "Upload ข้อมูล"
3. เลือกไฟล์ `H03_2010_2025.XLSx`
4. กดปุ่ม "Upload และวิเคราะห์ข้อมูล"

---

## 🛠️ การแก้ปัญหา

### Port 3000 ถูกใช้งานอยู่

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### ติดตั้งใหม่ทั้งหมด

```bash
rm -rf node_modules package-lock.json data/*.db
npm install
npm rebuild better-sqlite3
npm run test:server
```

### Database Error

```bash
# สร้าง directory และ reset database
mkdir -p data
rm -f data/*.db
npm run test:server
```

---

## 📊 ข้อมูลตัวอย่าง

ไฟล์: `H03_2010_2025.XLSx`

โครงสร้าง:
- Machine, Machine_side
- Symptoms of failure
- Date_failure, Time_failure
- repairer, How to fix
- part_code, name_part, court_part

---

## 🚫 เกี่ยวกับ Electron Desktop App

**ปัญหาปัจจุบัน:**
- Electron 30+ มีปัญหา module loading
- `require('electron')` return string แทน object
- อาจเป็นเพราะ Node.js v20 compatibility

**ทางเลือก:**
1. ใช้ Web Server (แนะนำ - ทำงานได้เต็มรูปแบบ)
2. Downgrade Electron เป็น version 25 หรือต่ำกว่า
3. รอ bug fix จาก Electron team

---

## 📚 เอกสารเพิ่มเติม

- [README.md](README.md) - ภาพรวมระบบ
- [INSTALL.md](INSTALL.md) - คู่มือติดตั้ง
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - แก้ปัญหา
- [QUICK_START.md](QUICK_START.md) - เริ่มต้นด่วน

---

## ✅ สรุป

**คำสั่งที่ต้องใช้:**
```bash
npm rebuild better-sqlite3  # ครั้งเดียว
npm run test:server          # ทุกครั้งที่ใช้งาน
```

**จากนั้นเปิด:** http://localhost:3000

โปรแกรมพร้อมใช้งานแล้ว! 🎉
