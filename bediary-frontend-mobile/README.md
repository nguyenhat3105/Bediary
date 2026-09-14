# Bediary Mobile

Ứng dụng mobile Expo/React Native cho Bediary. Frontend web hiện tại vẫn nằm ở `bediary-frontend`; thư mục này là app mobile riêng để build Android/iOS.

## Chạy local

```bash
npm install
npm start
```

Nếu Expo Go trên điện thoại báo `Failed to download remote update`, chạy LAN bằng IP Wi-Fi của laptop:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.2.199"
npm run start:lan
```

Kiểm tra trên trình duyệt điện thoại:

```text
http://192.168.2.199:8081/status
```

Nếu không thấy `packager-status:running`, điện thoại chưa truy cập được Metro server. Kiểm tra Windows Firewall hoặc dùng tunnel:

```powershell
npm run start:tunnel
```

Tạo file `.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:8080/api/v1
```

Không dùng `localhost` khi test trên điện thoại thật, vì `localhost` là chính thiết bị Android.

## Build Android cho CH Play

```bash
npx eas build -p android --profile production
```

Upload file `.aab` lên Play Console ở track Internal testing trước.
