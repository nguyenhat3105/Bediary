import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormSheet from './FormSheet';
import { colors } from '../theme/colors';

const guides = [
  ['book-outline', 'Nhật ký chăm sóc', 'Ghi lại sinh hoạt mỗi ngày', ['Chọn ngày muốn xem trong trang Nhật ký.', 'Chọn loại hoạt động để ghi thông tin. Kiểm tra nội dung trước khi lưu.', 'Với giọng nói: chọn loại hoạt động, chạm micro và nói, ví dụ “Bé bú 60 ml”. Kiểm tra văn bản và chỉ số được nhận dạng rồi lưu.']],
  ['trending-up-outline', 'Theo dõi tăng trưởng', 'Quản lý từng lần đo', ['Nhập cân nặng theo kg, chiều cao theo cm; có thể ghi một hoặc cả hai chỉ số.', 'Trong lịch sử, chọn Chỉnh sửa để sửa lần đo hoặc Xóa để loại bỏ lần nhập sai.', 'Xóa một lần đo sẽ xóa cả cân nặng và chiều cao của lần đó.']],
  ['calendar-outline', 'Lịch tiêm chủng', 'Đánh dấu và điều chỉnh lịch', ['Chạm vào thẻ mũi tiêm để chuyển giữa Chưa tiêm và Đã tiêm. Chờ lưu xong trước khi thao tác tiếp.', 'Chạm biểu tượng bút chì để chỉnh sửa thông tin; chọn ngày hẹn bằng lịch.', 'Mũi đã đánh dấu hoàn thành nằm trong mục Đã tiêm.']],
  ['heart-outline', 'Sổ sức khỏe & đọc ảnh', 'Lưu hồ sơ và đơn thuốc', ['Chọn đúng sổ trước khi thêm hồ sơ hoặc thuốc.', 'Chọn Nhập từ ảnh, chụp rõ toàn bộ giấy khám hoặc chọn ảnh có sẵn.', 'Kiểm tra và sửa nội dung AI đọc được trước khi lưu. Chạm trường ngày để mở lịch; dùng dấu x để bỏ ngày chưa rõ.']],
  ['people-outline', 'Gia đình & quyền truy cập', 'Cùng theo dõi các bé', ['Chọn đúng hồ sơ bé trước khi ghi dữ liệu.', 'Ba mẹ hoặc quản trị viên có thể chỉnh sửa dữ liệu tăng trưởng, tiêm chủng và sức khỏe.', 'Thành viên VIEWER được xem thông tin và ghi nhật ký; không được sửa dữ liệu y tế.']],
  ['help-buoy-outline', 'Khi tính năng chưa hoạt động', 'Các bước kiểm tra nhanh', ['Dữ liệu chưa cập nhật: kiểm tra mạng rồi kéo xuống để tải lại trang.', 'Micro: kiểm tra quyền micro và dịch vụ nhận dạng giọng nói của điện thoại. Sau khi đã cấp quyền, app không hỏi lại mỗi lần.', 'Thông báo: kiểm tra quyền thông báo trong cài đặt điện thoại.', 'OCR hoặc AI báo lỗi: đọc thông báo, thử lại sau; có thể nhập hồ sơ thủ công khi cần.']],
];

export default function HelpSheet({ onClose }) {
  const [expanded, setExpanded] = useState(0);
  return <FormSheet onClose={onClose}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <View style={{ flex: 1 }}><Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>Trợ giúp Bediary</Text><Text style={{ marginTop: 6, color: colors.text2, lineHeight: 21 }}>Hướng dẫn để chăm sóc bé thuận tiện hơn mỗi ngày.</Text></View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng trợ giúp" style={{ padding: 12 }}><Ionicons name="close" size={24} color={colors.text2} /></Pressable>
    </View>
    {guides.map(([icon, title, subtitle, steps], index) => <View key={title} style={{ marginBottom: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden' }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === index }} onPress={() => setExpanded(expanded === index ? null : index)} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <View style={{ flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text><Text style={{ marginTop: 4, fontSize: 12, color: colors.text2 }}>{subtitle}</Text></View>
        <Ionicons name={expanded === index ? 'chevron-up' : 'chevron-down'} size={18} color={colors.hint} />
      </Pressable>
      {expanded === index && <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>{steps.map((step, i) => <View key={step} style={{ flexDirection: 'row', gap: 10 }}><Text style={{ color: colors.primary, fontWeight: '800', width: 20 }}>{i + 1}.</Text><Text style={{ flex: 1, color: colors.text2, lineHeight: 22 }}>{step}</Text></View>)}</View>}
    </View>)}
  </FormSheet>;
}
