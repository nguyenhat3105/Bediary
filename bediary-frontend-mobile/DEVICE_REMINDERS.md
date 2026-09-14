# Thông báo lịch tiêm và lịch khám

- Nhắc lúc 08:00 theo giờ điện thoại, trước một ngày và đúng ngày hẹn.
- Nếu đồng bộ sau 08:00 trong ngày cần nhắc, thông báo được đặt sau khoảng 5 giây, không lặp mỗi lần tải lại.
- Bao gồm lịch tiêm mặc định theo ngày sinh, lịch tiêm tự thêm, lịch đã điều chỉnh, ngày khám và ngày tái khám trong Sổ sức khỏe (bé và người thân).
- Không nhắc mũi đã hoàn thành, hoãn, bỏ qua hoặc hủy. Đổi/xóa lịch sẽ hủy thông báo cũ sau khi đồng bộ thành công.
- Đồng bộ khi đăng nhập, đổi hồ sơ bé, trở lại app, thay đổi dữ liệu và mỗi phút khi app đang mở. Đăng xuất hủy các lịch nhắc trên thiết bị.
- Chạm thông báo mở trang Tiêm chủng hoặc Sổ sức khỏe.

## Kiểm tra trên Android

1. Dùng development build hoặc APK Bediary. Expo Go được bỏ qua để tránh lỗi module thông báo.
2. Cho phép thông báo trong cài đặt hệ thống. Mở app và tạo một lịch tiêm hoặc lịch khám vào ngày mai.
3. Trước 08:00: chờ đến 08:00. Sau 08:00: thông báo nhắc ngày mai xuất hiện sau khoảng 5 giây.
4. Đưa app xuống nền, kiểm tra thông báo trên thanh thông báo điện thoại. Chạm thông báo để mở trang tương ứng.
5. Sửa ngày hẹn, xóa lịch hoặc hoàn thành mũi tiêm; lịch nhắc cũ phải được hủy. Tải lại app nhiều lần không tạo thông báo trùng.
6. Kiểm tra thêm lịch tái khám, lịch của người thân và đăng xuất/đổi hồ sơ bé.

Kiểm tra logic: `node --test tests/reminderPlan.test.mjs`.

## Phạm vi hiện tại

Đây là thông báo cục bộ do hệ điều hành giữ lịch, không cần app mở liên tục sau khi đã đặt lịch. Giờ hiển thị thực tế có thể bị Android trì hoãn do tiết kiệm pin hoặc khi người dùng buộc dừng app.

Thay đổi từ web hoặc thiết bị khác chỉ được cập nhật khi điện thoại mở app/kết nối lại. Chưa có push từ backend để cập nhật khi app đóng. Tối đa 60 thông báo gần nhất được đặt để tránh vượt giới hạn hàng đợi; các lịch xa hơn được bổ sung khi mở lại app. Nếu từ chối quyền thông báo, cần bật lại trong cài đặt hệ thống rồi mở app.
