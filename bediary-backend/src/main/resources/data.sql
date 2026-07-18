-- ============================================================
-- Care Tips Seed Data — Bediary v2
-- 15+ tips covering ages 0–180 days
-- Categories: FOOD, TIP, MILESTONE
-- Source types: MEDICAL, FOLK
-- ============================================================

INSERT INTO care_tips (id, start_day, end_day, category, title, content, source_type, is_premium, created_at)
VALUES

-- ── 0–7 days (Newborn) ───────────────────────────────────────────────────────
(gen_random_uuid(), 0, 7, 'TIP', 'Kẹp rốn sơ sinh',
 'Giữ vùng rốn của bé luôn khô thoáng. Vệ sinh bằng cồn 70° sau mỗi lần tắm. Cuống rốn thường rụng trong 1–2 tuần.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 0, 7, 'FOOD', 'Sữa non — vàng lỏng quý giá',
 'Sữa non (colostrum) trong 3–5 ngày đầu giàu kháng thể, vitamin A và protein. Hãy cho bé bú đủ sữa non để tăng sức đề kháng tự nhiên.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 0, 7, 'TIP', 'Cách đặt bé ngủ an toàn',
 'Luôn đặt bé nằm ngửa khi ngủ. Không dùng gối hoặc chăn mền dày trong nôi. Nhiệt độ phòng lý tưởng là 24–26°C.',
 'MEDICAL', false, now()),

-- ── 8–30 days (1 month) ──────────────────────────────────────────────────────
(gen_random_uuid(), 8, 30, 'MILESTONE', 'Bé nhận ra giọng mẹ',
 'Ở tuần thứ 2–4, bé bắt đầu quay đầu về phía giọng nói quen thuộc. Hãy thường xuyên nói chuyện và hát cho bé nghe.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 8, 30, 'FOOD', 'Tần suất bú sữa mẹ',
 'Bé sơ sinh cần bú 8–12 lần mỗi ngày (khoảng 2–3 giờ/lần). Đừng để bé nhịn quá 4 giờ mà không bú, kể cả ban đêm.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 8, 30, 'TIP', 'Tắm nắng đúng cách',
 'Cho bé tiếp xúc ánh nắng sáng sớm (trước 8 giờ sáng) 10–15 phút/ngày giúp tổng hợp vitamin D tự nhiên. Tránh để ánh nắng trực tiếp vào mắt bé.',
 'FOLK', false, now()),

-- ── 31–60 days (2 months) ────────────────────────────────────────────────────
(gen_random_uuid(), 31, 60, 'MILESTONE', 'Nụ cười xã hội đầu tiên',
 'Từ tuần thứ 6–8, bé có thể mỉm cười đáp lại khuôn mặt và giọng nói của bố mẹ. Đây là cột mốc phát triển cảm xúc quan trọng!',
 'MEDICAL', false, now()),

(gen_random_uuid(), 31, 60, 'TIP', 'Massage cho bé sơ sinh',
 'Massage nhẹ nhàng vùng bụng bé theo chiều kim đồng hồ giúp giảm đầy hơi, cải thiện tiêu hóa. Thực hiện sau khi tắm hoặc trước giờ ngủ.',
 'FOLK', false, now()),

(gen_random_uuid(), 31, 60, 'TIP', 'Tiêm phòng mũi đầu tiên',
 'Lịch tiêm phòng cơ bản tháng thứ 2 bao gồm: 5 trong 1 (DPT-Hib-VGB), bại liệt, viêm phổi. Theo dõi bé 30 phút sau tiêm.',
 'MEDICAL', false, now()),

-- ── 61–90 days (3 months) ────────────────────────────────────────────────────
(gen_random_uuid(), 61, 90, 'MILESTONE', 'Bé có thể ngẩng đầu',
 'Ở tháng thứ 3, bé có thể ngẩng và giữ đầu thẳng khi nằm sấp 30–60 giây. Hãy tập nằm sấp (tummy time) 3–4 lần/ngày, mỗi lần 3–5 phút.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 61, 90, 'FOOD', 'Bảo quản sữa mẹ vắt ra',
 'Sữa mẹ mới vắt có thể để ở nhiệt độ phòng 4 giờ, trong ngăn mát tủ lạnh 4 ngày, trong ngăn đông 6 tháng. Rã đông bằng cách ngâm trong nước ấm.',
 'MEDICAL', false, now()),

-- ── 91–120 days (4 months) ───────────────────────────────────────────────────
(gen_random_uuid(), 91, 120, 'MILESTONE', 'Bé bắt đầu phát âm',
 'Tháng thứ 4, bé bắt đầu bi bô, phát ra các âm nguyên âm như "a", "e", "ư". Hãy bắt chước và phản hồi lại để khuyến khích phát triển ngôn ngữ.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 91, 120, 'TIP', 'Nhận biết dấu hiệu mọc răng',
 'Chảy nước dãi nhiều, hay cắn đồ vật, quấy khóc đêm có thể là dấu hiệu mọc răng. Dùng vòng gặm nướu đã làm lạnh để giảm đau cho bé.',
 'FOLK', false, now()),

-- ── 121–150 days (5 months) ──────────────────────────────────────────────────
(gen_random_uuid(), 121, 150, 'MILESTONE', 'Bé tự lật người',
 'Khoảng tháng thứ 4–5, nhiều bé bắt đầu tự lật từ nằm ngửa sang nằm sấp. Đảm bảo an toàn xung quanh bé khi đặt trên mặt phẳng cao.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 121, 150, 'FOOD', 'Chuẩn bị cho ăn dặm',
 'Tháng 5–6 là thời điểm chuẩn bị ăn dặm. Dấu hiệu sẵn sàng: bé ngồi vững có hỗ trợ, quan tâm đến thức ăn, không còn phản xạ đẩy lưỡi.',
 'MEDICAL', false, now()),

-- ── 151–180 days (6 months) ──────────────────────────────────────────────────
(gen_random_uuid(), 151, 180, 'FOOD', 'Bắt đầu ăn dặm — BLW hay bột?',
 'WHO khuyến nghị ăn dặm từ 6 tháng. Có thể chọn phương pháp bột/cháo loãng hoặc BLW (Baby-Led Weaning). Bắt đầu với 1 bữa/ngày, thực phẩm một nguyên liệu.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 151, 180, 'MILESTONE', 'Bé bắt đầu ngồi có hỗ trợ',
 'Ở tháng thứ 6, bé có thể ngồi thẳng lưng khi có chỗ tựa. Tiếp tục tập ngồi không hỗ trợ — cột mốc này thường đạt được ở tháng 7–9.',
 'MEDICAL', false, now()),

(gen_random_uuid(), 151, 180, 'TIP', 'Phát triển nhận thức qua đồ chơi',
 'Đồ chơi kích thích giác quan: sách vải nhiều màu, chuông lắc, gương an toàn. Chơi ú òa giúp bé hiểu khái niệm "vật thể vẫn tồn tại khi khuất tầm nhìn" (object permanence).',
 'MEDICAL', true, now()),

(gen_random_uuid(), 151, 180, 'FOOD', 'Thực phẩm nguy hiểm cần tránh',
 'Tuyệt đối không cho bé dưới 1 tuổi ăn mật ong (nguy cơ ngộ độc botulism), sữa bò nguyên chất, thức ăn cứng nguy hiểm hóc nghẹn.',
 'MEDICAL', false, now());
