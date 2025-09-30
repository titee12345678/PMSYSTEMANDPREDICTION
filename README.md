# Preventive Maintenance Management System (PMM)

ระบบจัดการบำรุงรักษาเชิงป้องกันพร้อมการพยากรณ์ด้วย Machine Learning

## ฟีเจอร์หลัก

### 1. การจัดการข้อมูล
- **Upload ไฟล์ Excel** - รองรับไฟล์ `.xlsx` และ `.xls`
- **ตรวจสอบข้อมูล** - ตรวจสอบความถูกต้องของข้อมูลก่อนนำเข้า
- **รองรับภาษาไทย** - รองรับการอ่าน-เขียนภาษาไทยเต็มรูปแบบ
- **Text Analysis** - วิเคราะห์ความคล้ายคลึงของอาการเสียและวิธีแก้ไข

### 2. การวิเคราะห์ข้อมูล
- **ความถี่การเสีย** - วิเคราะห์ความถี่การเสียของแต่ละเครื่อง/หัว
- **การใช้อะไหล่** - วิเคราะห์การใช้อะไหล่และอายุการใช้งาน
- **รูปแบบการเสีย** - วิเคราะห์รูปแบบการเสียตามเวลาและวัน
- **ความเร่งด่วน** - คำนวณความเร่งด่วนในการเปลี่ยนอะไหล่

### 3. การพยากรณ์ (Prediction)
- **พยากรณ์การเสีย** - ทำนายวันที่จะเกิดการเสียครั้งต่อไป
- **Risk Score** - คำนวณคะแนนความเสี่ยงของแต่ละเครื่อง
- **ความต้องการอะไหล่** - พยากรณ์อะไหล่ที่จะต้องใช้ในอนาคต
- **คำแนะนำ** - แนะนำการบำรุงรักษาตามข้อมูลที่วิเคราะห์

### 4. Dashboard และรายงาน
- **ภาพรวมระบบ** - แสดงสถานะเครื่องจักรทั้งหมด
- **กราฟและชาร์ต** - แสดงข้อมูลด้วย Chart.js
- **ประวัติการซ่อม** - ดูประวัติการซ่อมทั้งหมดพร้อมค้นหา

## เทคโนโลยีที่ใช้

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **better-sqlite3** - Database (SQLite with UTF-8 support)

### Frontend
- **HTML/CSS/JavaScript** - UI
- **Bootstrap 5** - CSS framework
- **Chart.js** - Data visualization
- **ExcelJS** - Excel file processing

### Desktop
- **Electron** - Desktop application framework
- Build สำหรับ macOS (Apple Silicon) และ Windows (x64)

## โครงสร้างโปรเจค

```
pmm1/
├── src/
│   ├── api/
│   │   └── server.js           # Express API server
│   ├── database/
│   │   └── schema.js           # Database schema และ queries
│   ├── services/
│   │   ├── excelProcessor.js  # Excel processing และ validation
│   │   ├── dataAnalyzer.js    # Data analysis functions
│   │   └── predictor.js       # ML prediction models
│   ├── utils/
│   │   └── textAnalysis.js    # Text similarity analysis
│   └── electron/
│       ├── main.js            # Electron main process
│       └── preload.js         # Electron preload script
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js             # Main app logic
│       ├── dashboard.js       # Dashboard page
│       ├── upload.js          # Upload page
│       ├── analysis.js        # Analysis page
│       ├── prediction.js      # Prediction page
│       └── records.js         # Records page
├── data/                      # Database files (created automatically)
└── package.json
```

## การติดตั้ง

### ติดตั้ง Dependencies

```bash
npm install
```

### รันโปรแกรม (Development Mode)

```bash
npm start
```

หรือ

```bash
npm run dev
```

### Build สำหรับ Production

**สำหรับ macOS (Apple Silicon):**
```bash
npm run build:mac
```

**สำหรับ Windows (x64):**
```bash
npm run build:win
```

**Build ทั้งสองระบบ:**
```bash
npm run build
```

ไฟล์ที่ build เสร็จจะอยู่ใน folder `dist/`

## รูปแบบข้อมูล Excel

ไฟล์ Excel ต้องมีคอลัมน์ดังนี้:

| คอลัมน์ | คำอธิบาย | จำเป็น | ตัวอย่าง |
|---------|----------|--------|----------|
| Machine | รหัสเครื่องจักร | ✓ | H03 |
| Machine_side | หัวย่อยของเครื่อง |  | 5 |
| Symptoms of failure | อาการเสีย | ✓ | ไม่จับด้าย |
| Date_failure | วันที่เสีย (dd/mm/yy) | ✓ | 28/06/12 |
| Time_failure | เวลา (HH:MM) | ✓ | 08:00 |
| repairer | ชื่อช่างซ่อม | ✓ | ธงชัย |
| How to fix | วิธีแก้ไข | ✓ | ปรับตัวยันหัวหลอด |
| part_code | รหัสอะไหล่ |  | S53029 |
| name_part | ชื่ออะไหล่ |  | SERVO MOTOR |
| court_part | จำนวนอะไหล่ |  | 1 |

## API Endpoints

### Upload และจัดการข้อมูล
- `POST /api/upload` - Upload และประมวลผล Excel
- `GET /api/machines` - ดึงรายการเครื่องจักรทั้งหมด
- `GET /api/records` - ดึงประวัติการซ่อม

### การวิเคราะห์
- `GET /api/machines/:machine/summary` - สรุปข้อมูลเครื่องจักร
- `GET /api/analyze/frequency` - วิเคราะห์ความถี่การเสีย
- `GET /api/analyze/parts` - วิเคราะห์การใช้อะไหล่
- `GET /api/analyze/patterns` - วิเคราะห์รูปแบบการเสีย
- `GET /api/analyze/inventory` - แนะนำอะไหล่ที่ควรเตรียม

### การพยากรณ์
- `GET /api/predict/next-failure` - พยากรณ์การเสียครั้งต่อไป
- `GET /api/predict/parts` - พยากรณ์ความต้องการอะไหล่
- `GET /api/risk/score` - คำนวณ Risk Score

### Dashboard
- `GET /api/dashboard` - ข้อมูลภาพรวมทั้งหมด

## Algorithm และ ML Models

### 1. Text Similarity (Levenshtein Distance)
ใช้สำหรับวิเคราะห์ความคล้ายคลึงของอาการเสียและวิธีแก้ไข

### 2. Failure Prediction (Weighted Moving Average)
- คำนวณช่วงเวลาระหว่างการเสีย
- ใช้ Weighted Average โดยให้น้ำหนักกับข้อมูลล่าสุดมากกว่า
- คำนวณ Confidence Interval (95%)

### 3. Risk Score Calculation
คำนวณจากปัจจัย:
- ความถี่การเสียใน 30 วันล่าสุด
- Trend (เพิ่มขึ้น/ลดลง/คงที่)
- ระยะเวลาตั้งแต่เสียครั้งล่าสุด

### 4. Part Replacement Urgency
คำนวณจาก:
- อายุการใช้งานเฉลี่ย
- อายุต่ำสุดที่เคยใช้
- ระยะเวลาตั้งแต่เปลี่ยนครั้งล่าสุด

## การใช้งาน

### 1. Upload ข้อมูล
1. ไปที่หน้า "Upload ข้อมูล"
2. เลือกไฟล์ Excel หรือลากมาวาง
3. กดปุ่ม "Upload และวิเคราะห์ข้อมูล"
4. ระบบจะตรวจสอบและนำเข้าข้อมูล

### 2. ดู Dashboard
1. ไปที่หน้า "Dashboard"
2. ดูภาพรวมเครื่องจักรทั้งหมด
3. เรียงตาม Risk Score

### 3. วิเคราะห์ข้อมูล
1. ไปที่หน้า "วิเคราะห์"
2. เลือกเครื่องจักร (และหัวย่อยถ้ามี)
3. กดปุ่ม "วิเคราะห์"
4. ดูผลการวิเคราะห์ทั้งหมด

### 4. พยากรณ์
1. ไปที่หน้า "พยากรณ์"
2. เลือกเครื่องจักร
3. กดปุ่ม "พยากรณ์"
4. ดูผลการพยากรณ์และคำแนะนำ

## License

MIT

## ผู้พัฒนา

Preventive Maintenance Management System
# PMSYSTEMANDPREDICTION
