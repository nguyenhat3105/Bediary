import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native'
import { AppAlert as Alert } from '../utils/appAlert'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import useCompactChat from '../utils/useCompactChat'
import { useFocusEffect } from '@react-navigation/native'
import PrimaryButton from '../components/PrimaryButton'
import { dashboardApi, doctorChatApi, growthApi, healthApi, trackingApi, vaccinationApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import { formatDate, listFromResponse, todayIso, unwrap } from '../utils/format'

const ACTIVITY_LABELS = {
  FEED: 'Ăn / bú',
  SLEEP: 'Ngủ',
  PEE: 'Đi tiểu',
  POOP: 'Đi tiêu',
  DIAPER: 'Tã',
}

const HEALTH_LABELS = {
  CHECKUP: 'Lần khám',
  CONDITION: 'Bệnh lý',
  HEREDITARY: 'Di truyền',
  MEDICATION: 'Thuốc',
  ALLERGY: 'Dị ứng',
  NOTE: 'Ghi chú',
}

function daysUntil(value) {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return Math.round((date - today) / 86400000)
}

function valueText(value, unit = '') {
  if (value === null || value === undefined || value === '') return '--'
  return `${value}${unit ? ` ${unit}` : ''}`
}

function trackingDetail(log) {
  const metadata = log.metadata || {}
  return [
    metadata.value ? `${metadata.value} ${metadata.unit || 'ml'}` : '',
    metadata.food || '',
    metadata.durationMinutes ? `${metadata.durationMinutes} phút` : '',
    metadata.diaper_type ? `Loại tã: ${metadata.diaper_type}` : '',
    metadata.note || '',
  ].filter(Boolean).join(', ')
}

function healthDetail(record) {
  return [
    record.diagnosis ? `Chẩn đoán: ${record.diagnosis}` : '',
    record.medicationName ? `Thuốc: ${record.medicationName}` : '',
    record.medicationDosage ? `Liều dùng đã lưu: ${record.medicationDosage}` : '',
    record.notes ? `Ghi chú: ${record.notes}` : '',
    record.nextFollowUpDate ? `Hẹn lại: ${formatDate(record.nextFollowUpDate)}` : '',
  ].filter(Boolean).join('; ')
}

function buildDoctorSummary({ dashboard, growth, tracking, vaccinations, healthRecords, upcomingHealth, parentNote }) {
  const babyName = dashboard?.babyNickname || dashboard?.babyName || 'Bé'
  const today = todayIso()
  const vaccineItems = vaccinations
    .map((item) => ({ ...item, due: daysUntil(item.scheduledDate) }))
    .filter((item) => !item.completedAt && item.scheduledDate)
    .sort((a, b) => (a.due ?? 9999) - (b.due ?? 9999))
    .slice(0, 6)
  const importantHealth = healthRecords
    .filter((record) => ['MEDICATION', 'ALLERGY', 'CONDITION', 'CHECKUP'].includes(record.recordType))
    .slice(0, 8)

  return [
    `TÓM TẮT THÔNG TIN GỬI BÁC SĨ - Bediary`,
    `Ngày tạo: ${formatDate(today)}`,
    '',
    `1. Thông tin bé`,
    `- Tên bé: ${babyName}`,
    `- Tuổi: ${dashboard?.babyAgeText || '--'}`,
    `- Ngày sinh: ${formatDate(dashboard?.babyDob)}`,
    '',
    `2. Tăng trưởng mới nhất`,
    growth ? `- Cân nặng: ${valueText(growth.weightKg, 'kg')} | Chiều cao: ${valueText(growth.heightCm, 'cm')} | Ngày đo: ${formatDate(growth.recordedAt)}` : '- Chưa có dữ liệu tăng trưởng.',
    growth?.statusText ? `- Nhận xét hệ thống: ${growth.statusText}` : '',
    growth?.suggestion ? `- Gợi ý theo dõi: ${growth.suggestion}` : '',
    '',
    `3. Nhật ký hôm nay`,
    tracking.length ? tracking.slice(0, 12).map((log, index) => `- ${index + 1}. ${ACTIVITY_LABELS[log.activityType] || log.activityType || 'Hoạt động'}${trackingDetail(log) ? `: ${trackingDetail(log)}` : ''}`).join('\n') : '- Chưa có nhật ký hôm nay.',
    '',
    `4. Tiêm chủng cần lưu ý`,
    vaccineItems.length ? vaccineItems.map((item) => {
      const status = item.due < 0 ? `quá hạn ${Math.abs(item.due)} ngày` : item.due === 0 ? 'đến lịch hôm nay' : `còn ${item.due} ngày`
      return `- ${item.vaccineName || item.name}${item.doseNumber ? ` mũi ${item.doseNumber}` : ''}: ${formatDate(item.scheduledDate)} (${status})`
    }).join('\n') : '- Không có mũi tiêm sắp tới/quá hạn trong dữ liệu hiện tại.',
    '',
    `5. Sổ sức khỏe / bệnh sử đã lưu`,
    importantHealth.length ? importantHealth.map((record) => `- [${HEALTH_LABELS[record.recordType] || record.recordType}] ${record.title || 'Không tiêu đề'} - ${formatDate(record.eventDate)}${healthDetail(record) ? `: ${healthDetail(record)}` : ''}`).join('\n') : '- Chưa có hồ sơ sức khỏe quan trọng đã lưu.',
    '',
    `6. Lịch hẹn / theo dõi gần nhất`,
    upcomingHealth.length ? upcomingHealth.slice(0, 5).map((record) => `- ${record.title || 'Lịch hẹn'}: ${formatDate(record.nextFollowUpDate)}${record.facility ? ` tại ${record.facility}` : ''}`).join('\n') : '- Chưa có lịch hẹn theo dõi.',
    '',
    `7. Ghi chú của ba mẹ`,
    parentNote?.trim() || '- Chưa nhập ghi chú thêm.',
    '',
    'Lưu ý: Nội dung này là bản tổng hợp dữ liệu đã lưu trong app để trao đổi với bác sĩ/người có chuyên môn, không phải chẩn đoán tự động.',
  ].filter((line) => line !== '').join('\n')
}

function formatMessageTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function DoctorShareScreen({ navigation }) {
  const compact = useCompactChat()
  const insets = useSafeAreaInsets()
  const chatScrollRef = useRef(null)

  const [dashboard, setDashboard] = useState(null)
  const [growth, setGrowth] = useState(null)
  const [tracking, setTracking] = useState([])
  const [vaccinations, setVaccinations] = useState([])
  const [healthRecords, setHealthRecords] = useState([])
  const [upcomingHealth, setUpcomingHealth] = useState([])
  const [doctorMessages, setDoctorMessages] = useState([])
  const [parentNote, setParentNote] = useState('')
  const [doctorInput, setDoctorInput] = useState('')
  const [activeTab, setActiveTab] = useState('summary')
  const [refreshing, setRefreshing] = useState(false)

  // FIX 1: editable summary – seeded from buildDoctorSummary, user can edit freely
  const [editableSummary, setEditableSummary] = useState('')
  const [summaryEdited, setSummaryEdited] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [dashboardRes, growthRes, trackingRes, vaccineRes, healthRes, upcomingRes, doctorChatRes] = await Promise.allSettled([
        dashboardApi.get(),
        growthApi.latest(),
        trackingApi.daily(todayIso()),
        vaccinationApi.list(),
        healthApi.list(),
        healthApi.upcoming(120),
        doctorChatApi.messages(),
      ])
      if (dashboardRes.status === 'fulfilled') setDashboard(unwrap(dashboardRes.value))
      if (growthRes.status === 'fulfilled') setGrowth(unwrap(growthRes.value))
      if (trackingRes.status === 'fulfilled') setTracking(listFromResponse(trackingRes.value))
      if (vaccineRes.status === 'fulfilled') setVaccinations(listFromResponse(vaccineRes.value))
      if (healthRes.status === 'fulfilled') setHealthRecords(listFromResponse(healthRes.value))
      if (upcomingRes.status === 'fulfilled') setUpcomingHealth(listFromResponse(upcomingRes.value))
      if (doctorChatRes.status === 'fulfilled') setDoctorMessages(listFromResponse(doctorChatRes.value))
      // Reset edited state on refresh so the new auto-generated summary shows
      setSummaryEdited(false)
    } catch (error) {
      Alert.alert('Không thể tổng hợp dữ liệu', error.response?.data?.message || 'Thử lại sau nhé.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Auto-generated summary
  const autoSummary = useMemo(() => buildDoctorSummary({
    dashboard, growth, tracking, vaccinations, healthRecords, upcomingHealth, parentNote,
  }), [dashboard, growth, tracking, vaccinations, healthRecords, upcomingHealth, parentNote])

  // Seed editable summary whenever auto-summary updates AND user hasn't manually edited
  useEffect(() => {
    if (!summaryEdited) {
      setEditableSummary(autoSummary)
    }
  }, [autoSummary, summaryEdited])

  function handleSummaryChange(text) {
    setEditableSummary(text)
    setSummaryEdited(true)
  }

  function resetSummary() {
    setEditableSummary(autoSummary)
    setSummaryEdited(false)
  }

  async function shareSummary() {
    try {
      await Share.share({ message: editableSummary })
    } catch (error) {
      Alert.alert('Không thể chia sẻ', error.message || 'Thử lại sau nhé.')
    }
  }

  function scrollChatToBottom(animated = true) {
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd?.({ animated }))
  }

  async function sendDoctorMessage(content = doctorInput) {
    const text = content.trim()
    if (!text) return
    setDoctorInput('')
    try {
      const response = await doctorChatApi.send(text)
      setDoctorMessages((items) => [...items, unwrap(response)])
      setActiveTab('chat')
      scrollChatToBottom()
    } catch (error) {
      Alert.alert('Chưa gửi được tin nhắn', error.response?.data?.message || 'Thử lại sau nhé.')
      setDoctorInput(text)
    }
  }

  // ── Shared top section (tabs + info pills) rendered in both layouts ──────
  const TopSection = (
    <>
      {/* Header */}
      <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Gửi bác sĩ</Text>
          {!compact && <Text style={styles.subtitle}>Tổng hợp dữ liệu bé để trao đổi với bác sĩ thật.</Text>}
        </View>
      </View>

      {/* Doctor banner */}
      {!compact && <>
      <View style={{ borderRadius: 24, padding: 16, backgroundColor: '#EEF3FF', borderWidth: 1, borderColor: '#DDE8FF', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#4A6CF7', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="medical" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900' }}>Bản tóm tắt cho buổi khám</Text>
            <Text style={{ marginTop: 3, color: colors.text2, fontSize: 12, lineHeight: 17 }}>App chỉ chuẩn bị thông tin đã lưu. Quyết định y tế vẫn thuộc về bác sĩ.</Text>
          </View>
        </View>
      </View>

      {/* Info pills */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <InfoPill icon="today-outline" label="Nhật ký" value={tracking.length} />
        <InfoPill icon="heart-outline" label="Hồ sơ" value={healthRecords.length} />
        <InfoPill icon="medical-outline" label="Tiêm" value={vaccinations.length} />
      </View>

      {/* Tabs */}
      </>}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: 14 }}>
        <Segment label="Tóm tắt" icon="document-text-outline" active={activeTab === 'summary'} onPress={() => setActiveTab('summary')} />
        <Segment label="Chat bác sĩ" icon="chatbubbles-outline" active={activeTab === 'chat'} onPress={() => setActiveTab('chat')} />
      </View>
    </>
  )

  // ── TAB: Summary (full scrollable page) ─────────────────────────────────
  if (activeTab === 'summary') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.page, { paddingBottom: 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          {TopSection}

          {/* Parent note */}
          <View style={[styles.card, { marginBottom: 16, gap: 10 }]}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Ghi chú muốn hỏi bác sĩ</Text>
            <TextInput placeholderTextColor="#787078"
              value={parentNote}
              onChangeText={setParentNote}
              multiline
              placeholder="Ví dụ: 2 ngày nay bé bú ít hơn, ngủ hay tỉnh, có ho nhẹ vào ban đêm..."
              style={[styles.input, { minHeight: 110, maxHeight: 180, paddingTop: 14, textAlignVertical: 'top' }]}
            />
          </View>

          {/* FIX 1: Editable summary */}
          <View style={[styles.card, { marginBottom: 18 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '900' }}>Nội dung sẽ gửi</Text>
                {summaryEdited ? (
                  <Text style={{ marginTop: 3, color: colors.warning, fontSize: 11, fontWeight: '700' }}>✏️ Đã chỉnh sửa thủ công</Text>
                ) : (
                  <Text style={{ marginTop: 3, color: colors.hint, fontSize: 11 }}>Tự động tổng hợp — có thể chỉnh sửa</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {summaryEdited ? (
                  <Pressable
                    onPress={resetSummary}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.warningBg, borderWidth: 1, borderColor: '#FFE0C0' }}
                  >
                    <Ionicons name="refresh-outline" size={13} color={colors.orange} />
                    <Text style={{ color: colors.orange, fontSize: 11, fontWeight: '900' }}>Khôi phục</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={load}
                  style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="refresh" size={15} color={colors.text2} />
                </Pressable>
              </View>
            </View>

            <TextInput placeholderTextColor="#787078"
              value={editableSummary}
              onChangeText={handleSummaryChange}
              multiline
              textAlignVertical="top"
              style={[styles.input, {
                minHeight: 280,
                paddingTop: 14,
                fontSize: 12,
                lineHeight: 19,
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
              }]}
            />
          </View>

          <PrimaryButton onPress={shareSummary}>Chia sẻ cho bác sĩ</PrimaryButton>
          <Pressable
            onPress={() => sendDoctorMessage(editableSummary)}
            style={{ marginTop: 10, borderRadius: 18, paddingVertical: 14, backgroundColor: colors.primaryPale, alignItems: 'center', borderWidth: 1, borderColor: '#FFD6E4' }}
          >
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '900' }}>Gửi bản tóm tắt vào chat</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── TAB: Chat (fixed layout — static header + flex chat box + pinned input) ──
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      {/* Static header section */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {TopSection}

        {/* Doctor info card */}
        {!compact && <View style={{ borderRadius: 20, padding: 14, backgroundColor: '#F7FAFF', borderWidth: 1, borderColor: '#DDE8FF', flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#4A6CF7', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="nutrition-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900' }}>Bác sĩ dinh dưỡng</Text>
            <Text style={{ marginTop: 2, color: colors.hint, fontSize: 11, lineHeight: 16 }}>Trao đổi trực tiếp dựa trên dữ liệu và bản tóm tắt của bé.</Text>
          </View>
        </View>}
      </View>

      {/* FIX 2: Fixed-height chat box with internal scroll */}
      <View style={{
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#231C22',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        overflow: 'hidden',
      }}>
        <ScrollView
          ref={chatScrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 16 }}
          showsVerticalScrollIndicator={true}
          onContentSizeChange={() => scrollChatToBottom(false)}
        >
          {doctorMessages.length ? (
            doctorMessages.map((message) => (
              <DoctorBubble key={message.id || `${message.createdAt}-${message.content}`} message={message} />
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primary} />
              <Text style={{ marginTop: 12, color: colors.text, fontSize: 15, fontWeight: '900' }}>Chưa có tin nhắn</Text>
              <Text style={{ marginTop: 6, color: colors.hint, fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 }}>Gửi câu hỏi hoặc bản tóm tắt để bác sĩ có đủ thông tin trước khi tư vấn.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Pinned input bar */}
      <View style={{
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
      }}>
        <TextInput placeholderTextColor="#787078"
          value={doctorInput}
          onChangeText={setDoctorInput}
          placeholder="Nhập nội dung muốn hỏi bác sĩ..."
          multiline
          style={[styles.input, { minHeight: 50, maxHeight: 110, paddingTop: 14, textAlignVertical: 'top' }]}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => sendDoctorMessage(editableSummary)}
            style={{ flex: 1, borderRadius: 14, paddingVertical: 12, backgroundColor: colors.primaryPale, alignItems: 'center', borderWidth: 1, borderColor: '#FFD6E4' }}
          >
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900' }}>📋 Gửi tóm tắt</Text>
          </Pressable>
          <Pressable
            onPress={() => sendDoctorMessage()}
            disabled={!doctorInput.trim()}
            style={{
              width: 52,
              borderRadius: 14,
              backgroundColor: doctorInput.trim() ? colors.primary : '#F4B6C8',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function Segment({ label, icon, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        borderRadius: 14,
        paddingVertical: 10,
        backgroundColor: active ? '#fff' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        shadowColor: '#000',
        shadowOpacity: active ? 0.06 : 0,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: active ? 1 : 0,
      }}
    >
      <Ionicons name={icon} size={15} color={active ? colors.primary : colors.hint} />
      <Text style={{ color: active ? colors.primary : colors.hint, fontSize: 12, fontWeight: '900' }}>{label}</Text>
    </Pressable>
  )
}

function DoctorBubble({ message }) {
  const isDoctor = message.senderRole === 'DOCTOR'
  return (
    <View style={{ alignSelf: isDoctor ? 'flex-start' : 'flex-end', maxWidth: '92%', gap: 4 }}>
      <Text style={{ color: colors.hint, fontSize: 10, fontWeight: '800', textAlign: isDoctor ? 'left' : 'right' }}>
        {isDoctor ? `BS. ${message.senderName || 'Bác sĩ'}` : message.senderName || 'Gia đình'}
        {message.createdAt ? ` · ${formatMessageTime(message.createdAt)}` : ''}
      </Text>
      <View style={{
        borderRadius: 18,
        padding: 12,
        backgroundColor: isDoctor ? '#F7FAFF' : colors.primaryLight,
        borderWidth: 1,
        borderColor: isDoctor ? '#DDE8FF' : '#FFD6E4',
      }}>
        <Text selectable style={{ color: colors.text2, fontSize: 13, lineHeight: 20 }}>{message.content}</Text>
      </View>
    </View>
  )
}

function InfoPill({ icon, label, value }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={{ marginTop: 6, color: colors.text, fontSize: 18, fontWeight: '900' }}>{value}</Text>
      <Text numberOfLines={1} style={{ marginTop: 2, color: colors.hint, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  )
}
