package com.bediary.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Source-linked care scenarios, checked 2026-09-08; not a diagnostic engine or clinical sign-off. */
final class AiHealthKnowledge {
    private AiHealthKnowledge() {}

    static String forQuestion(String question) {
        String q = Normalizer.normalize(question.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd');
        StringBuilder result = new StringBuilder("Hướng dẫn tình huống bổ sung, đối chiếu nguồn ngày 2026-09-08 (chưa phải phê duyệt lâm sàng). Chỉ áp dụng mục liên quan, đúng tuổi; ưu tiên hướng dẫn nguồn rõ dưới đây nếu tài liệu nội bộ mâu thuẫn.\n");
        if (matches(q, "ho|nghet mui|kho khe|kho tho|kho ngu")) result.append("""
                [CARE-RESP] Ho/nghẹt mũi và khó ngủ; trẻ dưới 5 tuổi, chú ý đặc biệt trẻ nhỏ.
                Cần làm rõ phần chưa biết: tuổi, khởi phát, thở có gắng sức/ngừng thở không, nhiệt độ, bú/uống và tiểu so với thường ngày.
                Ho/nghẹt mũi có thể làm gián đoạn ngủ và bú; không đủ để khẳng định viêm tiểu phế quản hoặc bệnh cụ thể.
                Nếu thở khó, ngừng thở, tím/xám môi hoặc khó đánh thức: tìm cấp cứu ngay, không chờ trả lời thêm.
                Nếu bú ít rõ rệt hoặc triệu chứng xấu đi: cần nhân viên y tế đánh giá. Có thể cho bú từng cữ nhỏ thường xuyên hơn nếu trẻ vẫn bú được; giữ thẳng khi thức và có người trông, tránh khói thuốc.
                Nguồn: https://www.nhs.uk/conditions/bronchiolitis/
                Không tự khuyên thuốc ho/cảm không kê đơn cho trẻ nhỏ; không dùng mật ong cho trẻ dưới 12 tháng. Có thể hỏi dược sĩ về nước muối mũi phù hợp khi nghẹt mũi ảnh hưởng bú, không tự kê liều.
                Nguồn: https://www.healthychildren.org/English/health-issues/conditions/chest-lungs/Pages/Coughs-and-Colds-Medicines-or-Home-Remedies.aspx
                """);
        if (matches(q, "ngu|giac|ho|nghet mui")) result.append("""
                [CARE-SLEEP] Giấc ngủ của trẻ nhỏ: hỏi khó vào giấc hay thức vì ho/đau/nghẹt mũi, diễn biến mới và nếp ngủ trước đó. Khi có triệu chứng mới, xử lý triệu chứng trước khi đề xuất thay lịch ngủ.
                Trẻ nhũ nhi cần nằm ngửa trên mặt ngủ phẳng, chắc, không có gối hoặc vật mềm; không kê cao đầu/nệm để chữa ho, không chuyển lời khuyên bế thẳng khi thức thành tư thế ngủ.
                Nguồn: https://www.nhs.uk/baby/caring-for-a-newborn/sudden-infant-death-syndrome-sids/
                """);
        if (matches(q, "sot|nong|nhiet|moc rang")) result.append("""
                [CARE-FEVER] Sốt: cần nhiệt độ đo, cách đo, tuổi và tình trạng thở/tỉnh táo/bú. Sờ nóng chưa chứng minh sốt.
                Trẻ dưới 3 tháng có nhiệt độ từ 38°C cần được bác sĩ đánh giá ngay; không chờ có đủ các dấu hiệu khác hoặc tự kê thuốc.
                Không quy sốt thực sự cho mọc răng. Mọc răng có thể gây khó chịu ở lợi; cần xem xét bệnh khác nếu trẻ sốt hoặc có vẻ ốm.
                Nguồn: https://www.healthychildren.org/English/health-issues/conditions/fever/Pages/Fever-and-Your-Baby.aspx
                """);
        if (matches(q, "non|tieu chay|bu kem|bu it|bo bu|mat nuoc")) result.append("""
                [CARE-FEED] Nôn/tiêu chảy/bú giảm: làm rõ thời gian, số lần, máu hoặc màu bất thường, khả năng giữ được sữa/dịch, lần tiểu gần nhất và mức tỉnh táo. Không suy ra mất nước chỉ từ nhật ký chưa nhập đủ.
                Khó đánh thức, dấu hiệu mất nước hoặc không duy trì được lượng uống cần đánh giá y tế. Không tự pha dung dịch bù nước hay đưa liều; không thay sữa bằng nước theo suy đoán.
                Nguồn: https://healthiertogether.westlondon.nhs.uk/application/files/4115/9109/6760/NHS_Diarrhoea_and_Vomiting_Advice_Sheet.pdf
                """);
        return result.toString();
    }

    private static boolean matches(String value, String expression) {
        return Pattern.compile("(?<![a-z0-9])(?:" + expression + ")(?![a-z0-9])").matcher(value).find();
    }
}
