# Cloud Database Setup (Supabase PostgreSQL)

ทำครั้งเดียวตามลำดับนี้

## 1) ใส่ค่า DATABASE_URL
สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์ แล้วใส่:

```env
DATABASE_URL="postgresql://marktech_app:YOUR_REAL_PASSWORD@db.bmrokfjafcwybuclqdyo.supabase.co:5432/postgres"
```

- เปลี่ยน `YOUR_REAL_PASSWORD` เป็นรหัสจริงของ user `marktech_app`
- ห้ามใส่เครื่องหมาย `[` `]`

## 2) ติดตั้ง dependencies
```bash
npm install
```

## 3) Generate Prisma Client
```bash
npm run db:generate
```

## 4) Push schema ขึ้น Cloud DB
```bash
npm run db:push
```

ตารางที่จะถูกสร้าง: `AppState`

## 5) รันแอป
```bash
npm run dev
```

เมื่อเข้าแอปครั้งแรก ระบบจะ:
1. อ่านข้อมูลจาก `data/marktech-os.json` (ถ้ามี)
2. seed ลงตาราง `AppState` อัตโนมัติ
3. หลังจากนั้นอ่าน/เขียนจาก Cloud DB ทั้งหมด

## 6) ตรวจสอบ
เรียก API:
- `GET /api/app-data`

ถ้าสำเร็จ แปลว่าระบบใช้งาน Cloud DB แล้ว

## 7) เปิดใช้งาน Login + RBAC (แนะนำสำหรับใช้งานจริง)
เพิ่มค่าต่อไปนี้ใน `.env.local`:

```env
AUTH_SESSION_SECRET="ใส่รหัสสุ่มยาวอย่างน้อย 16 ตัวอักษร"

AUTH_CEO_USERNAME="ceo"
AUTH_CEO_PASSWORD="รหัสผ่าน_ceo"

AUTH_ADMIN_USERNAME="admin"
AUTH_ADMIN_PASSWORD="รหัสผ่าน_admin"

AUTH_FINANCE_USERNAME="finance"
AUTH_FINANCE_PASSWORD="รหัสผ่าน_finance"

AUTH_AM_USERNAME="am"
AUTH_AM_PASSWORD="รหัสผ่าน_am"
```

จากนั้น restart:

```bash
npm run dev
```

แล้วเข้า `http://localhost:3000/login` เพื่อล็อกอิน

## 8) เปิดใช้งาน Supabase Auth: Google + Phone OTP

เพิ่ม env สำหรับ Supabase Auth:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
```

> ถ้าตั้งค่านี้แล้ว หน้า `/login` จะมีปุ่ม `Continue with Google` และ `Phone OTP` อัตโนมัติ

### 8.1 เปิด Google Provider
1. ไปที่ Supabase Dashboard → `Authentication` → `Providers` → `Google`
2. เปิด `Enable sign in with Google`
3. ใส่ Client ID / Client Secret จาก Google Cloud Console
4. เพิ่ม Redirect URL ใน Google Console ให้ตรงกับ Supabase ที่แสดงในหน้านี้
5. กด Save

### 8.2 เปิด Phone OTP
1. ไปที่ Supabase Dashboard → `Authentication` → `Providers` → `Phone`
2. เปิดใช้งาน Phone provider
3. ตั้งค่า SMS provider (เช่น Twilio / MessageBird ตามแพลนที่ใช้)
4. กด Save

### 8.3 ผูก Role เพื่อ RBAC
ระบบอ่าน role จาก `app_metadata.role` ของ Supabase user

ค่าที่รองรับ:
- `ceo`
- `admin`
- `finance`
- `am`
- `content`
- `ads`

ถ้า user ไม่มี role ระบบจะใช้ `admin` เป็นค่าเริ่มต้น
