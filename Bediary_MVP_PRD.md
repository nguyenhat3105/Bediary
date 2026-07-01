# BEDIARY - MASTER PRODUCT REQUIREMENT DOCUMENT (MVP PHASE)
**Version:** 1.0.0
**Target IDE:** VS Code (với GitHub Copilot)
**Version Control:** Git (Khuyến nghị sử dụng Fork client để quản lý nhánh tính năng / merge request)

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT CONTEXT)
Bediary là ứng dụng kết hợp giữa "Nhật ký theo dõi sinh hoạt của bé" và "Mạng xã hội riêng tư cho gia đình".
Mục tiêu cốt lõi của phiên bản MVP là giải quyết triệt để sự lười biếng trong việc nhập liệu của bố mẹ (Frictionless Tracking) và tạo ra một luồng chia sẻ hình ảnh/video khép kín, an toàn (Role-based access).

---

## 2. TIÊU CHUẨN CÔNG NGHỆ (TECH STACK & ARCHITECTURE)

### 2.1. Backend (Core API)
- **Ngôn ngữ & Framework:** Java 21, Spring Boot 3.x
- **Bảo mật:** Spring Security + JWT (JSON Web Token). Phân quyền API nghiêm ngặt theo `family_id`.
- **Database:** PostgreSQL (Relational Data) + Hibernate (Spring Data JPA).
- **Lưu trữ Media:** AWS S3 hoặc Firebase Cloud Storage (Dùng Signed URL để bảo mật file).
- **Caching & Queue (Tùy chọn cho sau này):** Redis.

### 2.2. Frontend (Cross-platform)
- **Web App (Dành cho Viewer/Ông bà & Admin Dashboard):** ReactJS (Khởi tạo bằng Vite), Tailwind CSS, Axios, React Router.
- **Mobile App (Ứng dụng chính cho Bố/Mẹ):** React Native (Expo) - Tập trung vào UI vuốt/chạm (Swipeable) và Native Widgets.

### 2.3. Quy trình làm việc (Git Workflow)
- **Nhánh chính:** `main` (Production), `develop` (Staging).
- **Nhánh tính năng:** Tạo từ nhánh `develop` theo format `feature/tên-tính-năng` (Sử dụng Fork để trực quan hóa commit tree và giải quyết conflict trước khi merge).

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU (DATABASE SCHEMA - POSTGRESQL)

Cấu trúc Entity cho Spring Data JPA:

### `users`
- `id` (UUID, Primary Key)
- `email` (Varchar 255, Unique, Not Null)
- `password_hash` (Varchar 255, Not Null)
- `full_name` (Varchar 100, Not Null)
- `avatar_url` (Varchar 500, Nullable)
- `created_at` (Timestamp, Default Current_Timestamp)

### `families`
- `id` (UUID, Primary Key)
- `baby_name` (Varchar 100, Not Null)
- `baby_dob` (Date, Not Null)
- `baby_gender` (Varchar 10 - MALE, FEMALE)
- `invite_code` (Varchar 20, Unique) - Dùng để mời thành viên.

### `family_members` (Mapping Users <-> Families)
- `id` (UUID, Primary Key)
- `family_id` (UUID, Foreign Key -> `families.id`)
- `user_id` (UUID, Foreign Key -> `users.id`)
- `role` (Varchar 20 - ADMIN, VIEWER)

### `tracking_logs`
- `id` (UUID, Primary Key)
- `family_id` (UUID, Foreign Key)
- `created_by` (UUID, Foreign Key -> `users.id`)
- `activity_type` (Varchar 50 - SLEEP, FEED, DIAPER)
- `start_time` (Timestamp, Not Null)
- `end_time` (Timestamp, Nullable)
- `metadata` (JSONB) - Chứa dữ liệu linh hoạt (VD: `{"amount_ml": 150, "diaper_type": "POOP"}`)

### `media_posts`
- `id` (UUID, Primary Key)
- `family_id` (UUID, Foreign Key)
- `uploaded_by` (UUID, Foreign Key -> `users.id`)
- `media_url` (Varchar 500, Not Null) - Link gốc hoặc ID từ S3/Firebase.
- `media_type` (Varchar 20 - IMAGE, VIDEO)
- `caption` (Text, Nullable)
- `created_at` (Timestamp)

---

## 4. CHI TIẾT API CONTRACTS (RESTFUL API)

*Prefix chuẩn: `/api/v1`*

### 4.1. Authentication & Family Setup
- **POST `/auth/register`**
  - Body: `{ email, password, full_name }`
  - Response: `{ token, user_id }`
- **POST `/families/create`** (Tạo profile cho bé)
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ baby_name, baby_dob, baby_gender }`
  - Response: `{ family_id, invite_code }`
- **POST `/families/join`** (Ông bà nhập mã để vào xem)
  - Body: `{ invite_code }`

### 4.2. Tracking System (Nhật ký 1 chạm)
- **POST `/tracking/log`**
  - Ghi chú: Xử lý request siêu tốc từ Widget.
  - Body: 
    ```json
    {
      "activity_type": "FEED",
      "start_time": "2026-07-01T08:30:00Z",
      "metadata": { "unit": "ml", "value": 120 }
    }
    ```
- **GET `/tracking/daily?date=YYYY-MM-DD`**
  - Trả về danh sách log trong ngày, sort theo `start_time` DESC để vẽ Timeline UI.

### 4.3. Media Feed (Chia sẻ khoảnh khắc)
- **GET `/media/feed?page=0&size=10`**
  - Trả về danh sách ảnh/video của family hiện tại (Dành cho ReactJS View-only và App).
  - *Bảo mật:* Backend tự extract `family_id` từ JWT Token của người request, KHÔNG truyền `family_id` qua param để tránh IDOR attack.
- **POST `/media/upload/presigned-url`**
  - Trả về 1 URL tạm thời để Frontend đẩy file trực tiếp lên S3/Firebase, giảm tải cho Backend Server.

---

## 5. BẢO MẬT & BUSINESS LOGIC KHẮT KHE (SYSTEM RULES)

1. **Security Rules (Firebase/S3 & Spring Security):**
   - Chỉ `ROLE_ADMIN` mới được gọi các method `POST`, `PUT`, `DELETE` trên data của bé.
   - `ROLE_VIEWER` chỉ có quyền `GET`. Mọi request thay đổi data từ `ROLE_VIEWER` phải bị block trả về `403 Forbidden`.
2. **Data Isolation (Cách ly dữ liệu):**
   - Không một API nào cho phép query chéo dữ liệu giữa các `family_id`. JPA Repositories phải luôn filter thêm mệnh đề `WHERE family_id = ?`.

---

## 6. HƯỚNG DẪN PROMPTING DÀNH CHO AI (AI CODING ASSISTANT)

Khi sử dụng tài liệu này với GitHub Copilot hoặc các công cụ AI trong VS Code, hãy copy-paste từng lệnh dưới đây vào chatbox:

**Step 1: Khởi tạo Backend (Spring Boot)**
> "Tôi đang xây dựng Backend cho app Bediary. Hãy đọc file PRD này. Đầu tiên, hãy gen cho tôi file `pom.xml` bao gồm các dependencies: Spring Web, Spring Security, Spring Data JPA, PostgreSQL Driver, và JWT (io.jsonwebtoken). Sử dụng Java 21 và Spring Boot 3.x."

**Step 2: Dựng Entities (JPA)**
> "Dựa vào mục 3 (Database Schema) trong PRD, hãy viết cho tôi toàn bộ các class Entity bằng Java. Nhớ sử dụng annotation `@Entity`, `@Table`, các relationship `@OneToMany`, `@ManyToOne`, và `@JdbcTypeCode(SqlTypes.JSON)` cho trường metadata của tracking_logs."

**Step 3: Dựng API & Logic (Controller + Service)**
> "Hãy tạo `TrackingController` và `TrackingService` phục vụ mục 4.2 trong PRD. Nhớ implement logic: Extract `user_id` và `family_id` từ JWT Authentication Principal (Spring Security) thay vì nhận từ request payload để đảm bảo bảo mật."

**Step 4: Khởi tạo Frontend (ReactJS)**
> "Tôi muốn dựng giao diện View-only Web App cho Ông/Bà bằng ReactJS. Khởi tạo cấu trúc dự án với Vite và TailwindCSS. Sau đó, viết một component `Feed.jsx` gọi API `GET /api/v1/media/feed`. Component này cần có UI dạng thẻ ảnh lớn, cuộn dọc mượt mà."