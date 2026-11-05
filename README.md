# ระบบบันทึกและติดตามประวัติการย้ายจุดติดตั้งสื่อ (Static Media Relocation & Impact Monitoring System)

ระบบแดชบอร์ดและบริหารจัดการการย้ายจุดติดตั้งสื่อโฆษณาภายนอกที่อยู่อาศัย (Out-of-Home / Static Media) แบบครบวงจร พัฒนาในรูปแบบ Standalone Web Application (Single-Page Application) พร้อมใช้งานได้ทันทีโดยไม่ต้องติดตั้ง Web Server หรือ Node.js

---

## 🌟 จุดเด่นและฟังก์ชันหลัก (Key Features)

1. **Executive KPI Dashboard:**
   - สรุปจำนวนป้ายที่ย้ายทั้งหมด (รวมเคสเสร็จสิ้น และเคสคงค้าง)
   - สรุปค่าใช้จ่ายทางตรง (Direct Cost: ค่ารื้อถอน + ฐานราก + ค่าติดตั้งใหม่)
   - สรุปการสูญเสียรายได้ช่วงย้าย (Opportunity Loss: คำนวณจาก Downtime และอัตราค่าโฆษณาต่อวัน)
   - สรุปผลกระทบทางการเงินสุทธิรวม (Total Financial Impact)

2. **กราฟแนวโน้มปริมาณและผลกระทบรายเดือน (Interactive Chart):**
   - กราฟแท่งคู่กับเส้นแนวโน้ม (Dual-Axis) แสดงปริมาณป้ายและมูลค่าผลกระทบสะสมรายเดือน
   - Tooltip แสดงข้อมูลประเภทสื่อ (Media Type Breakdown) และจำนวนงานแบบ Pop-up เมื่อนำเมาส์ไปชี้ที่จุดข้อมูล

3. **ตารางสรุปเปรียบเทียบรายปี (Yearly Benchmark Summary Matrix):**
   - เปรียบเทียบสถิติแยกตามรอบปี (Before 2024, 2024, 2025, 2026)
   - แจกแจงสัดส่วนประเภทสื่อและสัดส่วนมูลค่าผลกระทบ

4. **ระบบกรองข้อมูลและค้นหาขั้นสูง (Multi-criteria Filtering):**
   - เลือกดูข้อมูลตามรอบปี (Quick Filter Pills: ทั้งหมด, Before 2024, 2024, 2025, 2026)
   - กรองตามช่วงเดือน, ประเภทสื่อ (Cookies, Standard Bushelter, Metro Poster, ฯลฯ), สาเหตุการย้าย, และบริษัทผู้ดูแล
   - ค้นหาแบบละเอียดข้ามฟิลด์ (Media ID, ทำเล, เขต, บริษัท, รายละเอียด)

5. **ระบบจัดการข้อมูล (Data Management):**
   - บันทึกรายการใหม่หรือแก้ไขข้อมูลป้ายผ่าน Modal Form
   - บันทึกข้อมูลลงเบราว์เซอร์อัตโนมัติด้วย LocalStorage (เวอร์ชัน 5)
   - ส่งออกข้อมูลเป็นไฟล์ **CSV (UTF-8 with BOM)** รองรับการเปิดใช้งานบน Microsoft Excel ได้อย่างถูกต้อง 100% ภาษาไทยไม่เพี้ยน

---

## 🚀 วิธีการติดตั้งและเผยแพร่ (Deployment Guide)

### วิธีที่ 1: เผยแพร่ผ่าน Netlify (ง่ายและเร็วที่สุด - ไม่เกิน 1 นาที)
1. เข้าไปที่ [Netlify Drop](https://app.netlify.com/drop)
2. ลากโฟลเดอร์นี้ (`media_relocation_dist` หรือโฟลเดอร์ที่มีไฟล์ `index.html`) ไปวางในช่อง **"Drag and drop your site output folder here"**
3. Netlify จะสร้าง URL เว็บไซต์พร้อมใช้งานทันที (เช่น `https://your-site-name.netlify.app`) สามารถแชร์ให้ทีมเปิดดูได้ทันที

### วิธีที่ 2: เชื่อมต่อผ่าน GitHub + Netlify (CI/CD อัตโนมัติ)
1. นำไฟล์ขึ้น GitHub Repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Static Media Relocation System"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
2. ล็อกอินเข้า [Netlify Dashboard](https://app.netlify.com/)
3. คลิก **"Add new site"** $\rightarrow$ **"Import an existing project"** $\rightarrow$ เลือก **GitHub**
4. เลือก Repository ที่สร้างไว้ แล้วกด **"Deploy site"**
5. ทุกครั้งที่มีการอัปเดตโค้ดบน GitHub ทาง Netlify จะ Build และ Deploy ให้ทันที

### วิธีที่ 3: ใช้งานผ่าน GitHub Pages (ฟรีบน GitHub)
1. เข้าไปที่หน้า Repository บน GitHub $\rightarrow$ คลิกแถบ **"Settings"**
2. เลือกเมนู **"Pages"** ทางด้านซ้าย
3. ในส่วน **Build and deployment** $\rightarrow$ **Branch** ให้เลือก `main` และโฟลเดอร์ `/ (root)` แล้วกด **Save**
4. ภายใน 1-2 นาที GitHub จะสร้าง URL สำหรับเปิดเว็บ เช่น `https://<your-username>.github.io/<your-repo-name>/`

---

## 📁 โครงสร้างไฟล์ในโฟลเดอร์

* `index.html` : ไฟล์หน้าเว็บหลักแบบ Single-Page บรรจุโค้ด HTML, Tailwind CSS, Chart.js และชุดข้อมูลตั้งต้น 74 ป้าย
* `latest_media_relocation_data.csv` : ไฟล์สำรองฐานข้อมูล 74 รายการ เข้ารหัสด้วย UTF-8 with BOM รองรับ Excel
* `README.md` : เอกสารคู่มือการใช้งานและโครงสร้างระบบ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **HTML5 & Vanilla JavaScript (ES6+)**
* **Tailwind CSS** (ผ่าน CDN สำหรับหน้าตา Modern Dark Dashboard)
* **Chart.js** (สำหรับกราฟิก Data Visualization)
* **Lucide Icons** (สำหรับไอคอนระบบ)
* **Flatpickr** (สำหรับปฏิทินเลือกวันที่)
