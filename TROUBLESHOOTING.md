# คู่มือแก้ปัญหา (Troubleshooting Guide)

## ปัญหาที่พบบ่อย

### 1. ไม่สามารถเริ่มต้น API Server ได้

**สาเหตุ:** Database directory ยังไม่ถูกสร้าง

**วิธีแก้:**
```bash
mkdir -p data
```

หรือรันโปรแกรมอีกครั้ง ระบบจะสร้าง directory อัตโนมัติ

---

### 2. npm start แสดง Error "Cannot read properties of undefined (reading 'whenReady')"

**สาเหตุ:** Electron binary ยังไม่ถูก download

**วิธีแก้:**
```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

หรือ

```bash
# ติดตั้ง Electron อีกครั้ง
npm install electron --save-dev
```

---

### 3. ไม่สามารถติดตั้ง better-sqlite3 ได้

**สาเหตุ:** ต้องการ build tools สำหรับ native modules

**วิธีแก้ (macOS):**
```bash
xcode-select --install
```

**วิธีแก้ (Windows):**
```bash
npm install --global windows-build-tools
```

---

### 4. Port 3000 ถูกใช้งานอยู่แล้ว

**วิธีแก้:**

ปิดโปรแกรมที่ใช้ port 3000:

**macOS/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## การทดสอบระบบ

### ทดสอบ API Server แยกต่างหาก

```bash
npm run test:server
```

ควรเห็น:
```
✓ API Server running on http://localhost:3000
```

จากนั้นเปิด browser ไปที่: http://localhost:3000/api/health

ควรได้ผลลัพธ์:
```json
{"status":"ok","message":"Server is running"}
```

### ทดสอบ Database

```bash
node -e "const DB = require('./src/database/schema'); const db = new DB(); console.log('✓ Database OK');"
```

---

## วิธีรันโปรแกรม

### วิธีที่ 1: รันด้วย npm

```bash
npm start
```

### วิธีที่ 2: รัน API Server เฉพาะ (สำหรับ development)

```bash
npm run test:server
```

จากนั้นเปิด browser ไปที่: http://localhost:3000

### วิธีที่ 3: รันด้วย script

**macOS/Linux:**
```bash
./start-app.sh
```

**Windows:**
```bash
npm start
```

---

## การตรวจสอบระบบ

### ตรวจสอบ dependencies

```bash
npm list --depth=0
```

ควรเห็น:
- better-sqlite3
- electron
- exceljs
- express

### ตรวจสอบ Node.js version

```bash
node --version
```

ต้องการ Node.js >= 16.x

### ตรวจสอบ npm version

```bash
npm --version
```

ต้องการ npm >= 8.x

---

## Debug Mode

เปิด Debug Mode ใน DevTools:

1. เปิดโปรแกรม
2. กด `Cmd+Option+I` (macOS) หรือ `Ctrl+Shift+I` (Windows)
3. ดู Console สำหรับ error messages

---

## ติดต่อขอความช่วยเหลือ

ถ้าปัญหายังไม่ได้รับการแก้ไข:

1. รวบรวม error messages จาก Console
2. บันทึก log files
3. ระบุ OS และ version ที่ใช้
4. อธิบายขั้นตอนที่ทำให้เกิด error

---

## Known Issues

### macOS

- **Permission Denied:** Run `chmod +x start-app.sh`
- **Gatekeeper Warning:** System Preferences > Security & Privacy > Open Anyway

### Windows

- **Antivirus Blocking:** Add exception for the app folder
- **Build Tools Missing:** Install `windows-build-tools`

### Linux

- **Missing Libraries:** Install `libsqlite3-dev`
  ```bash
  sudo apt-get install libsqlite3-dev
  ```

---

## การ Reset โปรแกรม

ถ้าต้องการเริ่มต้นใหม่:

```bash
# ลบ database
rm data/*.db

# ลบ node_modules
rm -rf node_modules package-lock.json

# ติดตั้งใหม่
npm install

# รันโปรแกรม
npm start
```
