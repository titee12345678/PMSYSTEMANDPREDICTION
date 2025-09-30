# 🔧 Quick Fix Guide - แก้ปัญหาด่วน

## ❌ "Unexpected token '<'" Error

### สาเหตุ:
Browser พยายาม parse HTML เป็น JSON (Server ส่ง HTML แทน JSON)

### แก้ไข:

#### 1. ตรวจสอบ Server รันอยู่
```bash
curl http://localhost:3000/api/health
```

ควรได้: `{"status":"ok","message":"Server is running"}`

ถ้าไม่ได้ ให้รัน:
```bash
npm run test:server
```

#### 2. ตรวจสอบ URL ถูกต้อง
เปิด DevTools (F12) -> Console
ดู error message จะบอก URL ที่เรียก

#### 3. Clear Cache
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

#### 4. ตรวจสอบ API endpoint
```bash
curl -X POST http://localhost:3000/api/upload-data \
  -H "Content-Type: application/json" \
  -d '{"records":[],"fileName":"test.xlsx"}'
```

---

## ❌ "Failed to fetch" Error

### สาเหตุ:
ไม่สามารถเชื่อมต่อกับ Server

### แก้ไข:

1. **ตรวจสอบ Server รันอยู่**
   ```bash
   npm run test:server
   ```

2. **ตรวจสอบ Port 3000 ว่าง**
   ```bash
   # macOS/Linux
   lsof -i :3000

   # ถ้ามีอะไรใช้ port 3000 อยู่
   lsof -ti:3000 | xargs kill -9
   ```

3. **Restart Server**
   ```bash
   # Kill old server
   pkill -f "node.*test-server"

   # Start new server
   npm run test:server
   ```

---

## ❌ Database Error

### สาเหตุ:
better-sqlite3 ถูก compile ผิด version

### แก้ไข:

```bash
# Rebuild สำหรับ Node.js
npm rebuild better-sqlite3

# Restart server
npm run test:server
```

---

## ❌ Excel Parse Error

### สาเหตุ:
ไฟล์ Excel format ผิด หรือ missing columns

### แก้ไข:

1. **ตรวจสอบคอลัมน์**
   - Machine ✓
   - Symptoms of failure ✓
   - Date_failure ✓
   - Time_failure ✓
   - repairer ✓
   - How to fix

2. **ตรวจสอบรูปแบบวันที่**
   - Format: dd/mm/yy
   - ตัวอย่าง: 28/06/12

3. **ตรวจสอบรูปแบบเวลา**
   - Format: HH:MM
   - ตัวอย่าง: 08:00

---

## 🔄 Reset ทั้งหมด

ถ้าทุกอย่างไม่ทำงาน:

```bash
# 1. Stop all servers
pkill -f "node.*test-server"
pkill -f "electron"

# 2. Clean up
rm -rf node_modules package-lock.json data/*.db

# 3. Reinstall
npm install

# 4. Rebuild for Node.js
npm rebuild better-sqlite3

# 5. Start server
npm run test:server

# 6. Open browser
# http://localhost:3000
```

---

## 📋 Checklist การทำงาน

ก่อน Upload ตรวจสอบ:

- [ ] Server รันอยู่ (`npm run test:server`)
- [ ] Browser เปิดอยู่ที่ `http://localhost:3000`
- [ ] ไฟล์ Excel มีคอลัมน์ครบ
- [ ] ไม่มี error ใน Console (F12)
- [ ] API health check ตอบกลับ (`curl http://localhost:3000/api/health`)

---

## 🆘 ยังไม่ได้?

### เปิด DevTools (F12)

1. **Console Tab**
   - ดู error messages
   - ดู API calls
   - ดู response

2. **Network Tab**
   - ดู request ที่ส่งไป
   - ดู response ที่ได้กลับมา
   - ตรวจสอบ Status Code (200 = OK)

3. **แคปหน้าจอ error**
   - Console error
   - Network tab
   - Error message บนหน้าเว็บ

---

## 📞 Debug Info

เมื่อรายงานปัญหา ให้แนบข้อมูลนี้:

```bash
# Node version
node --version

# npm version
npm --version

# OS
uname -a  # macOS/Linux
ver       # Windows

# Check server
curl http://localhost:3000/api/health

# Check if server running
ps aux | grep node
```

---

**Tips:** ใช้ `Ctrl+Shift+R` (หรือ `Cmd+Shift+R`) เพื่อ hard refresh browser หลังแก้ไขโค้ด!
