# คู่มือการติดตั้งและแก้ปัญหา

## ปัญหา: ไม่สามารถเริ่มต้น API Server ได้

### สาเหตุ

`better-sqlite3` เป็น native module ที่ต้อง compile สำหรับแต่ละ environment:
- Node.js: NODE_MODULE_VERSION 119
- Electron: NODE_MODULE_VERSION 127

### วิธีแก้ปัญหา ✅

## วิธีที่ 1: รันแบบ Web Server (แนะนำ - ใช้งานได้ทันที)

### ขั้นตอน:

```bash
# 1. Rebuild สำหรับ Node.js
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

### การใช้งาน:

เปิด web browser ไปที่: **http://localhost:3000**

โปรแกรมพร้อมใช้งานเต็มรูปแบบ! ✨

---

## วิธีที่ 2: รันแบบ Electron Desktop App

### ขั้นตอนการแก้ไข:

```bash
# 1. ติดตั้ง dependencies ทั้งหมด
npm install

# 2. Rebuild สำหรับ Electron
npm run rebuild

# 3. รัน Electron
npm start
```

### หมายเหตุ:
- Electron อาจมีปัญหาใน development environment
- แนะนำให้ใช้วิธีที่ 1 สำหรับการทดสอบและ development
- Build production app ด้วย `npm run build:mac` หรือ `npm run build:win`

---

## คำสั่งที่มีประโยชน์

### ติดตั้งใหม่ทั้งหมด
```bash
rm -rf node_modules package-lock.json data/*.db
npm install
npm rebuild better-sqlite3
```

### Rebuild สำหรับ Node.js
```bash
npm rebuild better-sqlite3
```

### Rebuild สำหรับ Electron
```bash
npx electron-rebuild
```

### ทดสอบ API
```bash
# รัน server
npm run test:server

# เปิด terminal ใหม่แล้วทดสอบ
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dashboard
```

---

## สถานการณ์ต่างๆ

### กรณีที่ 1: Development & Testing
**→ ใช้ Web Server** (`npm run test:server`)
- รันเร็ว
- Debug ง่าย
- ไม่ต้องกังวลเรื่อง native modules

### กรณีที่ 2: Production Desktop App
**→ ใช้ Electron** (`npm start` หรือ build)
- ต้อง rebuild ทุกครั้งหลัง `npm install`
- ใช้คำสั่ง: `npm run rebuild`

### กรณีที่ 3: Build สำหรับ Distribution
```bash
# Build สำหรับ macOS (Apple Silicon)
npm run build:mac

# Build สำหรับ Windows (x64)
npm run build:win
```

---

## การทดสอบว่าระบบทำงานได้

### 1. ทดสอบ Database
```bash
node -e "const DB = require('./src/database/schema'); const db = new DB(); console.log('✓ Database OK');"
```

### 2. ทดสอบ API Server
```bash
npm run test:server
```

เปิด browser: http://localhost:3000

### 3. ทดสอบ Upload Excel

เมื่อ API Server รันอยู่:

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/Users/teejakkrit/Desktop/pmm1/H03_2010_2025.XLSx"}'
```

---

## สรุป

### วิธีที่ง่ายที่สุด (Recommended):

```bash
# 1. Rebuild สำหรับ Node.js (ครั้งเดียว)
npm rebuild better-sqlite3

# 2. รัน server ทุกครั้ง
npm run test:server

# 3. เปิด browser
# http://localhost:3000
```

### สำหรับ Electron Desktop:

```bash
# 1. Rebuild สำหรับ Electron (ครั้งเดียว)
npm run rebuild

# 2. รัน Electron
npm start
```

---

## ข้อมูลเพิ่มเติม

- [README.md](README.md) - ภาพรวมระบบ
- [QUICK_START.md](QUICK_START.md) - เริ่มต้นใช้งาน
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - แก้ปัญหาอื่นๆ

---

## Support

หากยังมีปัญหา:
1. ตรวจสอบ error message ใน console
2. ลองติดตั้งใหม่ทั้งหมด
3. ตรวจสอบ Node.js version (>= 16.x)
4. ตรวจสอบว่า port 3000 ว่าง

**Happy Coding! 🚀**
