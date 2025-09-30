# 📤 คู่มือการ Upload ข้อมูล Excel

## ✅ ฟีเจอร์ Upload ทำงานได้จริง 100%!

ระบบรองรับการ Upload Excel ผ่าน **Web Browser** โดยไม่ต้องใช้ Electron

---

## 🚀 วิธีการ Upload

### 1. เริ่มต้น Server

```bash
npm rebuild better-sqlite3
npm run test:server
```

### 2. เปิด Browser

```
http://localhost:3000
```

### 3. Upload Excel

1. คลิกเมนู **"Upload ข้อมูล"**
2. เลือกวิธี Upload:
   - **คลิกปุ่ม "เลือกไฟล์"** หรือ
   - **ลาก-วาง ไฟล์** มายัง upload zone หรือ
   - **คลิกที่ upload zone** เพื่อเลือกไฟล์

3. เลือกไฟล์ `H03_2010_2025.XLSx`

4. กดปุ่ม **"Upload และวิเคราะห์ข้อมูล"**

5. รอระบบประมวลผล (ใช้เวลา 1-5 วินาที)

6. ดูผลลัพธ์:
   - ✅ **สำเร็จ** - แสดงจำนวนรายการที่นำเข้า
   - ⚠️ **มีข้อผิดพลาด** - แสดงรายการที่มีปัญหา
   - ℹ️ **คำเตือน** - ข้อมูลที่ควรตรวจสอบ

---

## 📊 รูปแบบไฟล์ Excel

### คอลัมน์ที่จำเป็น (Required):

| คอลัมน์ | ตัวอย่าง | หมายเหตุ |
|---------|----------|----------|
| **Machine** | H03 | รหัสเครื่องจักร |
| **Symptoms of failure** | ไม่จับด้าย | อาการเสีย |
| **Date_failure** | 28/06/12 | วันที่เสีย (dd/mm/yy) |
| **Time_failure** | 08:00 | เวลาเสีย (HH:MM) |
| **repairer** | ธงชัย | ชื่อช่างซ่อม |

### คอลัมน์เพิ่มเติม (Optional):

| คอลัมน์ | ตัวอย่าง | หมายเหตุ |
|---------|----------|----------|
| **Machine_side** | 5 | หัวย่อยของเครื่อง |
| **How to fix** | ปรับตัวยันหัวหลอด | วิธีแก้ไข |
| **part_code** | S53029 | รหัสอะไหล่ที่เปลี่ยน |
| **name_part** | SERVO MOTOR | ชื่ออะไหล่ |
| **court_part** | 1 | จำนวนอะไหล่ |

---

## 🔧 การทำงานของระบบ

### Client-Side (Browser):
1. **อ่านไฟล์ Excel** ด้วย ExcelJS
2. **Parse ข้อมูล** เป็น JSON
3. **ส่งข้อมูล** ไปยัง Server ผ่าน API

### Server-Side (Node.js):
1. **Validate ข้อมูล** - ตรวจสอบความถูกต้อง
2. **Format ข้อมูล** - แปลงวันที่/เวลา
3. **Text Analysis** - วิเคราะห์ความคล้ายของอาการเสีย
4. **Import ลง Database** - บันทึกข้อมูล
5. **Return ผลลัพธ์** - ส่งกลับไปยัง Browser

---

## ✨ ข้อดีของวิธีนี้

✅ **ไม่ต้องใช้ Electron** - ทำงานใน Browser ธรรมดา
✅ **รองรับทุก OS** - Windows, macOS, Linux
✅ **ไม่ต้อง file path** - ระบบอ่านไฟล์เองอัตโนมัติ
✅ **Validate ข้อมูล** - ตรวจสอบก่อนนำเข้า
✅ **แสดง Progress** - มี loading indicator
✅ **รายงานผลลัพธ์** - แสดงรายละเอียดการนำเข้า

---

## 🐛 การแก้ปัญหา

### ❌ ไม่สามารถเลือกไฟล์ได้
- ตรวจสอบว่า Browser รองรับ File API
- ใช้ Browser สมัยใหม่ (Chrome, Firefox, Edge, Safari)

### ❌ Upload ไม่สำเร็จ
- ตรวจสอบว่า Server รันอยู่ (http://localhost:3000/api/health)
- ตรวจสอบ Console ใน DevTools (F12)
- ดู error message ที่แสดง

### ❌ ข้อมูลไม่ถูกต้อง
- ตรวจสอบรูปแบบไฟล์ Excel
- ตรวจสอบชื่อคอลัมน์ว่าตรงกับที่กำหนด
- ตรวจสอบรูปแบบวันที่/เวลา

### ❌ Server Error 500
- ดู Console ของ Server (terminal ที่รัน npm run test:server)
- ตรวจสอบว่า Database ใช้งานได้
- Restart Server

---

## 📝 ตัวอย่างข้อมูล

```
number | Machine | Machine_side | Symptoms of failure | Date_failure | Time_failure | repairer | How to fix | part_code | name_part | court_part
1      | H03     | 5           | ไม่จับด้าย           | 28/06/12     | 08:00       | ธงชัย    | ปรับตัวยันหัวหลอด |           |           |
2      | H03     | 11          | E12=X05            | 29/06/12     | 07:00       | พรชัย    | เปลี่ยนอะไหล่  | S53029    | SERVO MOTOR | 1
```

---

## 🔄 After Upload

หลังจาก Upload สำเร็จ:

1. **Dashboard** - ดูภาพรวมข้อมูลใหม่
2. **วิเคราะห์** - วิเคราะห์ความถี่การเสีย
3. **พยากรณ์** - ดูการพยากรณ์จากข้อมูลใหม่
4. **ประวัติ** - ค้นหาและดูประวัติการซ่อม

---

## 💡 Tips

- **Upload ทีละไฟล์** - สำหรับข้อมูลขนาดใหญ่
- **ตรวจสอบข้อมูลก่อน** - ใช้ Excel ตรวจสอบก่อน Upload
- **Backup Database** - สำรองข้อมูลเป็นประจำ
- **ใช้ชื่อไฟล์ที่มีความหมาย** - เช่น H03_2010_2025.xlsx

---

## 📚 เอกสารเพิ่มเติม

- [FINAL_SOLUTION.md](FINAL_SOLUTION.md) - วิธีการรัน System
- [README.md](README.md) - ภาพรวมระบบ
- [API Documentation](README.md#api-endpoints) - รายละเอียด API

---

**ระบบ Upload ทำงานได้เต็มรูปแบบ!** 🎉

เปิด http://localhost:3000 และลองใช้งานได้เลย!
