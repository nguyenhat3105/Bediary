# Bediary

Bediary là ứng dụng nhật ký chăm sóc em bé dành cho gia đình. Dự án gồm backend Spring Boot và frontend React/Vite, hỗ trợ ghi nhật ký sinh hoạt, theo dõi tăng trưởng, lịch tiêm, album gia đình riêng tư và trợ lý AI chăm sóc bé.

## Tính năng chính

- Đăng ký, đăng nhập bằng JWT.
- Tạo gia đình hoặc tham gia bằng mã mời.
- Phân quyền thành viên:
  - `ADMIN`: ba mẹ, có quyền thêm/sửa/xóa dữ liệu.
  - `VIEWER`: ông bà/người thân, chủ yếu xem dữ liệu.
- Nhật ký sinh hoạt của bé:
  - Ghi nhanh một chạm: bú/ăn, ngủ, thay tã.
  - Thêm hoạt động vào lịch sử theo ngày.
  - Chỉnh sửa chi tiết hoạt động cũ: thời gian, lượng sữa, món ăn, thời lượng ngủ, loại tã, ghi chú.
- Tăng trưởng:
  - Nhập cân nặng, chiều cao.
  - Xem chỉ số mới nhất, lịch sử đo và nhận xét theo chuẩn tăng trưởng.
- Lịch tiêm:
  - Thêm lịch tiêm, đánh dấu hoàn thành, xóa mũi tiêm.
- Routine/lịch sinh hoạt.
- Album/feed ảnh gia đình, upload file local qua backend.
- Trợ lý AI:
  - Nút AI nổi ở các trang đã đăng nhập.
  - Tự lấy ngữ cảnh trang hiện tại, ví dụ nhật ký hôm nay, tăng trưởng, lịch tiêm.
  - Chat chăm sóc bé bằng tiếng Việt qua Groq/OpenAI-compatible API.
- Seed SQL để reset và test nhanh dữ liệu mẫu.

## Công nghệ

### Backend

- Java 21
- Spring Boot 3
- Spring Security + JWT
- Spring Data JPA / Hibernate
- PostgreSQL
- JSONB cho metadata tracking
- Groq API cho AI chat/caption
- Local file upload qua thư mục `uploads/`

### Frontend

- React 18
- Vite 5
- Axios
- React Router
- date-fns
- lucide-react
- CSS custom design system trong `src/index.css`

## Cấu trúc thư mục

```text
Bediary/
├─ bediary-backend/
│  ├─ src/main/java/com/bediary/
│  │  ├─ config/
│  │  ├─ controller/
│  │  ├─ dto/
│  │  ├─ entity/
│  │  ├─ exception/
│  │  ├─ repository/
│  │  ├─ security/
│  │  └─ service/
│  ├─ src/main/resources/
│  │  ├─ application.yml
│  │  └─ bediary_test_seed.sql
│  └─ pom.xml
├─ bediary-frontend/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ App.jsx
│  │  └─ index.css
│  ├─ package.json
│  └─ vite.config.js
├─ run-backend.bat
├─ run-frontend.bat
├─ seed-test-data.bat
└─ README.md
```

## Yêu cầu môi trường

Cài sẵn:

- Java JDK 21
- Maven 3.9+
- Node.js 18+ hoặc 20+
- npm
- PostgreSQL 15+
- PostgreSQL CLI `psql` nếu muốn chạy file seed bằng `.bat`

Kiểm tra nhanh:

```powershell
java -version
mvn -version
node -v
npm -v
psql --version
```

## Cấu hình database

Tạo database PostgreSQL:

```sql
CREATE DATABASE bediary_db;
```

Backend mặc định đọc cấu hình trong:

```text
bediary-backend/src/main/resources/application.yml
```

Các biến môi trường quan trọng:

```env
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=change-me-to-a-very-long-secret-at-least-32-bytes
UPLOAD_DIR=uploads
BASE_URL=http://localhost:8080/api/v1
GROQ_API_KEY=your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

Gợi ý: không commit API key thật lên Git. Nên set bằng biến môi trường trên máy local.

## Chạy project nhanh bằng file `.bat`

Ở thư mục root `Bediary/`:

```powershell
.\run-backend.bat
```

Mở terminal khác:

```powershell
.\run-frontend.bat
```

Frontend chạy tại:

```text
http://localhost:5173
```

Backend chạy tại:

```text
http://localhost:8080/api/v1
```

## Chạy project thủ công

### 1. Chạy backend

```powershell
cd C:\Users\CONG NHAT\Downloads\Bediary\bediary-backend
mvn spring-boot:run
```

Nếu muốn truyền biến môi trường trong PowerShell:

```powershell
$env:DB_USERNAME='postgres'
$env:DB_PASSWORD='your_postgres_password'
$env:GROQ_API_KEY='your_groq_api_key'
mvn spring-boot:run
```

### 2. Chạy frontend

```powershell
cd C:\Users\CONG NHAT\Downloads\Bediary\bediary-frontend
npm install
npm run dev
```

Vite proxy đang cấu hình trong `bediary-frontend/vite.config.js`:

```js
proxy: {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  }
}
```

Frontend gọi API qua base URL:

```js
/api/v1
```

## Seed dữ liệu test

File seed:

```text
bediary-backend/src/main/resources/bediary_test_seed.sql
```

Chạy bằng batch file:

```powershell
.\seed-test-data.bat
```

Hoặc chạy thủ công:

```powershell
psql -U postgres -d bediary_db -f .\bediary-backend\src\main\resources\bediary_test_seed.sql
```

Tài khoản test:

```text
ADMIN:  parent@bediary.test  / password123
VIEWER: grandma@bediary.test / password123
Invite code: BEDIARY1
```

## Build và kiểm tra

### Backend

```powershell
cd bediary-backend
mvn test
```

### Frontend

```powershell
cd bediary-frontend
npm run build
```

Preview bản build:

```powershell
npm run preview
```

## Các route frontend chính

| Route | Mô tả |
| --- | --- |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |
| `/family-setup` | Tạo hoặc tham gia gia đình |
| `/` | Trang chủ/tổng quan |
| `/tracking` | Nhật ký sinh hoạt, thêm/sửa lịch sử |
| `/growth` | Theo dõi tăng trưởng |
| `/vaccinations` | Lịch tiêm |
| `/routines` | Routine/lịch sinh hoạt |
| `/feed` | Album/feed gia đình |
| `/notifications` | Thông báo |
| `/premium` | Trang premium |
| `/ai` | Trang AI assistant đầy đủ |

Ngoài route `/ai`, app còn có nút trợ lý AI nổi trên các trang đã đăng nhập.

## API backend chính

Backend có context path `/api/v1`, vì vậy endpoint đầy đủ có dạng `http://localhost:8080/api/v1/...`.

### Auth

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/auth/register` | Đăng ký |
| `POST` | `/auth/login` | Đăng nhập |
| `GET` | `/auth/me` | Lấy session hiện tại |

### Family

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/families/create` | Tạo gia đình |
| `POST` | `/families/join` | Tham gia bằng mã mời |
| `DELETE` | `/families/current` | Xóa gia đình hiện tại |

### Tracking

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/tracking/log` | Tạo hoạt động mới |
| `PUT` | `/tracking/{id}` | Chỉnh sửa hoạt động cũ |
| `GET` | `/tracking/daily?date=YYYY-MM-DD` | Lấy nhật ký theo ngày |

Payload mẫu:

```json
{
  "activityType": "FEED",
  "startTime": "2026-07-02T01:00:00Z",
  "endTime": null,
  "metadata": {
    "value": 120,
    "unit": "ml",
    "food": "cháo bí đỏ",
    "note": "bé ăn tốt"
  }
}
```

`activityType` thường dùng:

```text
FEED
SLEEP
DIAPER
```

Metadata gợi ý:

```json
{
  "value": 120,
  "unit": "ml",
  "food": "chuối nghiền",
  "durationMinutes": 90,
  "diaper_type": "WET",
  "note": "ghi chú thêm"
}
```

### Growth

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/growth/record` | Ghi chỉ số cân nặng/chiều cao |
| `GET` | `/growth/latest` | Lấy chỉ số mới nhất |
| `GET` | `/growth/history?page=0&size=20` | Lấy lịch sử tăng trưởng |

Payload mẫu:

```json
{
  "weightKg": 7.8,
  "heightCm": 68.5
}
```

### Vaccinations

| Method | Path | Mô tả |
| --- | --- | --- |
| `GET` | `/vaccinations` | Danh sách lịch tiêm |
| `POST` | `/vaccinations` | Thêm mũi tiêm |
| `POST` | `/vaccinations/{id}/complete` | Đánh dấu hoàn thành |
| `DELETE` | `/vaccinations/{id}` | Xóa mũi tiêm |

### Routines

| Method | Path | Mô tả |
| --- | --- | --- |
| `GET` | `/routines` | Danh sách routine |
| `POST` | `/routines` | Tạo routine |
| `PUT` | `/routines/{id}` | Cập nhật routine |
| `DELETE` | `/routines/{id}` | Xóa routine |
| `POST` | `/routines/{id}/log` | Log routine |
| `PATCH` | `/routines/{id}/reschedule` | Dời lịch routine |

### Media

| Method | Path | Mô tả |
| --- | --- | --- |
| `GET` | `/media/feed?page=0&size=10` | Lấy feed ảnh/video |
| `POST` | `/media/upload` | Upload file local |
| `POST` | `/media/{postId}/react` | Like/unlike bài viết |

### AI

| Method | Path | Mô tả |
| --- | --- | --- |
| `POST` | `/ai/chat` | Chat với trợ lý AI chăm sóc bé |
| `POST` | `/ai/caption` | Gợi ý caption ảnh |

Payload chat mẫu:

```json
{
  "question": "Hãy nhận xét chế độ sinh hoạt của bé hôm nay",
  "context": "Dữ liệu nhật ký hôm nay..."
}
```

Lưu ý:

- `/ai/chat` không yêu cầu premium.
- Cần `GROQ_API_KEY` hợp lệ để gọi AI thật.
- Nếu Groq lỗi hoặc thiếu key, backend trả câu fallback an toàn.

## Test trên điện thoại

### Cùng mạng Wi-Fi

1. Lấy IP laptop:

```powershell
ipconfig
```

Tìm `IPv4 Address`, ví dụ:

```text
192.168.1.25
```

2. Chạy frontend với host LAN:

```powershell
cd bediary-frontend
npm run dev -- --host 0.0.0.0
```

3. Trên điện thoại mở:

```text
http://192.168.1.25:5173
```

### Kết nối bằng dây USB Android

Cách 1: USB tethering

1. Cắm điện thoại vào laptop.
2. Bật `USB tethering` trên Android.
3. Chạy:

```powershell
ipconfig
```

4. Lấy IP của adapter USB/RNDIS.
5. Trên điện thoại mở:

```text
http://IP_CUA_LAPTOP:5173
```

Cách 2: ADB reverse

```powershell
adb devices
adb reverse tcp:5173 tcp:5173
adb reverse tcp:8080 tcp:8080
```

Sau đó trên Android mở:

```text
http://localhost:5173
```

## Lỗi thường gặp

### Không tải được dữ liệu

Kiểm tra:

- Backend có chạy ở `http://localhost:8080/api/v1` không.
- Frontend proxy trong `vite.config.js` có trỏ tới `http://localhost:8080` không.
- Token hết hạn: đăng xuất và đăng nhập lại.
- User đã tạo hoặc tham gia gia đình chưa.

### AI không trả lời

Kiểm tra:

- Backend đã restart sau khi sửa code chưa.
- `GROQ_API_KEY` có hợp lệ không.
- Backend log có lỗi Groq/network không.
- Context gửi lên có quá dài không. Hiện `AiChatRequest.context` cho phép tối đa `12000` ký tự.

### Điện thoại không mở được localhost

Trên điện thoại không dùng `localhost` của laptop, trừ khi dùng `adb reverse`. Nếu test qua Wi-Fi hoặc USB tethering, dùng IP laptop.

### PostgreSQL lỗi password

Set biến môi trường trước khi chạy backend:

```powershell
$env:DB_USERNAME='postgres'
$env:DB_PASSWORD='your_password'
mvn spring-boot:run
```

### Port bị chiếm

Kiểm tra process dùng port:

```powershell
netstat -ano | findstr :8080
netstat -ano | findstr :5173
```

## Ghi chú bảo mật

- Không commit `GROQ_API_KEY`, `JWT_SECRET`, mật khẩu database thật.
- JWT chứa `userId` và `familyId`; backend luôn lấy family từ token/session, không tin `family_id` từ request client.
- Các truy vấn dữ liệu gia đình cần filter theo `familyId` để tránh lộ dữ liệu chéo gia đình.
- Viewer không nên được phép ghi dữ liệu chăm sóc.

## Quy trình phát triển đề xuất

1. Chạy PostgreSQL.
2. Chạy backend.
3. Chạy frontend.
4. Seed dữ liệu nếu cần test nhanh.
5. Login bằng tài khoản test.
6. Test các luồng chính:
   - tạo/join family
   - tracking thêm nhanh
   - tracking thêm/sửa lịch sử
   - growth thêm chỉ số
   - vaccination thêm/complete
   - AI assistant theo từng trang
   - upload album/feed


"# Bediary" 
