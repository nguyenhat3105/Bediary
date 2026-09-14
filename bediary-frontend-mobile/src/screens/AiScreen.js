import { useRef, useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { aiApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import useCompactChat from '../utils/useCompactChat'
import ChatMarkdown from '../components/ChatMarkdown'
import FormSheet from '../components/FormSheet'

const SAMPLE_PROMPTS = [
  { label: 'Chăm sóc bé', text: 'Bé 6 tháng cần biết những gì?', icon: 'book-outline', bg: '#E0F2FE', color: '#0284C7', requiresBabyContext: false },
  { label: 'Nhật ký', text: 'Dựa trên nhật ký hôm nay, sức khỏe của bé có dấu hiệu bất thường không?', icon: 'pulse-outline', bg: colors.warningBg, color: '#B76700', requiresBabyContext: true },
  { label: 'Tăng trưởng', text: 'Quá trình tăng trưởng của bé hiện tại như thế nào?', icon: 'trending-up-outline', bg: colors.blueLight, color: colors.blue, requiresBabyContext: true },
  { label: 'Tổng quan', text: 'Dựa trên tất cả thông tin hiện tại của bé, tình hình sức khỏe của bé có gì cần lưu ý?', icon: 'shield-checkmark-outline', bg: colors.purpleLight, color: colors.purple, requiresBabyContext: true },
]
const FORCE_ROUTE_CONTEXT_MARKER = '__BEDIARY_ROUTE_SAMPLE_CONTEXT_REQUIRED__'

function historyPayload(messages) {
  return messages
    .filter((message) => ['user', 'assistant'].includes(message.role) && message.text)
    .slice(-10)
    .map((message) => ({ role: message.role, text: String(message.text).slice(0, 1500) }))
}

export default function AiScreen({ navigation }) {
  const compact = useCompactChat()
  const chatScrollRef = useRef(null)
  const insets = useSafeAreaInsets()
  const [question, setQuestion] = useState('')
  const [showSamples, setShowSamples] = useState(false)
  const [sampleContextRequired, setSampleContextRequired] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ba mẹ hỏi mình về lịch sinh hoạt, ăn ngủ, tăng trưởng, tiêm chủng hoặc cách theo dõi bé nhé.' },
  ])
  const [loading, setLoading] = useState(false)

  function scrollToBottom(animated = true) {
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd?.({ animated }))
  }

  async function send() {
    const text = question.trim()
    if (!text || loading) return
    const history = historyPayload(messages)
    const outboundContext = sampleContextRequired ? FORCE_ROUTE_CONTEXT_MARKER : undefined
    setQuestion('')
    setSampleContextRequired(false)
    setMessages((prev) => [...prev, { role: 'user', text }])
    scrollToBottom()
    try {
      setLoading(true)
      const response = await aiApi.chat({ question: text, context: outboundContext || undefined, history })
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: [response.data?.answer, response.data?.safetyNote].filter(Boolean).join('\n\n') || 'Mình chưa có câu trả lời phù hợp lúc này.',

      }])
      scrollToBottom()
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: error.response?.data?.message || 'AI chưa thể trả lời lúc này. Ba mẹ thử lại sau nhé.' }])
      scrollToBottom()
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: '#F4F9FC' }]}
    >
      {/* ── Static header (non-scrollable) ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {/* Back + title */}
        <View style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text2} />
          </Pressable>
          <Image source={require('../../assets/characters/mascot.png')} resizeMode="contain" accessible={false} style={{ width: 42, height: 42 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#15394D', fontSize: 21, fontWeight: '800' }}>Trợ lý AI</Text>
            {!compact && <Text style={{ color: '#55788C', fontSize: 12, marginTop: 4 }}>Cùng ba mẹ chăm bé mỗi ngày</Text>}
          </View>
        </View>

        {!compact && <>
        {/* Sample prompts (horizontal scroll) */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '900', marginBottom: 8 }}>Câu hỏi mẫu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SAMPLE_PROMPTS.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => { setQuestion(item.text); setSampleContextRequired(Boolean(item.requiresBabyContext)) }}
                accessibilityRole="button"
                accessibilityLabel={item.text}
                style={{ borderRadius: 16, backgroundColor: '#fff', padding: 12, minHeight: 44, borderWidth: 1, borderColor: '#D6E7F0', justifyContent: 'center' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name={item.icon} size={13} color={item.color} />
                  <Text style={{ color: item.color, fontSize: 11, fontWeight: '900' }}>{item.label}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        </>}
        {compact && <Pressable onPress={() => setShowSamples(true)} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
          <Text style={{ color: '#075985', fontWeight: '700' }}>Câu hỏi mẫu</Text>
        </Pressable>}
      </View>

      {/* ── Chat box: fixed height + internal ScrollView ── */}
      <View style={{
        flex: 1,
        minHeight: 0,
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
          onContentSizeChange={() => scrollToBottom(false)}
        >
          {messages.map((message, index) => (
            <AiBubble key={index} message={message} />
          ))}
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 }}>
              <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
              <Text style={{ color: colors.hint, fontSize: 12, fontWeight: '800' }}>AI đang trả lời...</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Disclaimer at bottom of chat box */}
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft, backgroundColor: '#F0F9FF' }}>
          <Text style={{ color: colors.primary, fontSize: 10, lineHeight: 15, fontWeight: '700' }}>
            ⚕️ Thông tin chỉ mang tính tham khảo, không thay thế bác sĩ nhi khoa.
          </Text>
        </View>
      </View>

      {/* ── Input bar (pinned to bottom) ── */}
      <View style={{
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 12),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 8,
      }}>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            value={question}
            onChangeText={(value) => { setQuestion(value); setSampleContextRequired(false) }}
            placeholder="Ba mẹ muốn hỏi gì?"
            accessibilityLabel="Câu hỏi cho trợ lý AI"
            placeholderTextColor="#6B8797"
            multiline
            style={[styles.input, { flex: 1, minHeight: 52, maxHeight: 120, paddingTop: 14, backgroundColor: '#F4F9FC', borderColor: '#D6E7F0', borderRadius: 18 }]}
          />
          <Pressable
            disabled={loading || !question.trim()}
            onPress={send}
            accessibilityRole="button"
            accessibilityLabel="Gửi câu hỏi"
            style={{
              width: 52,
              height: 52,
              borderRadius: 17,
              backgroundColor: loading || !question.trim() ? '#B8D9EB' : colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.primary,
              shadowOpacity: loading || !question.trim() ? 0 : 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }}
          >
            <Ionicons name={loading ? 'sync-outline' : 'send'} size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
      <FormSheet visible={showSamples} onClose={() => setShowSamples(false)}>
        <Text style={styles.sectionTitle}>Câu hỏi mẫu</Text>
        {SAMPLE_PROMPTS.map(item => <Pressable key={item.label} onPress={() => {
          setQuestion(item.text)
          setSampleContextRequired(Boolean(item.requiresBabyContext))
          setShowSamples(false)
        }} style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{item.text}</Text>
        </Pressable>)}
        <Pressable onPress={() => setShowSamples(false)} style={{ paddingVertical: 16 }}><Text style={{ color: colors.primaryDark }}>Đóng</Text></Pressable>
      </FormSheet>
    </KeyboardAvoidingView>
  )
}

function AiBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <View style={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '92%', gap: 5 }}>
      {!isUser ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
        <Image source={require('../../assets/characters/mascot.png')} resizeMode="contain" accessible={false} style={{ width: 28, height: 28 }} />
        <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: '700', flexShrink: 1 }}>Trợ lý AI</Text>
      </View> : null}
      <View style={{
        borderRadius: 18,
        padding: 12,
        backgroundColor: isUser ? colors.primaryLight : colors.surfaceSoft,
        borderWidth: 1,
        borderColor: isUser ? '#BAE6FD' : colors.borderSoft,
      }}>
        {isUser ? <Text style={{ color: colors.text2, fontSize: 13, lineHeight: 20 }}>{message.text}</Text> : <ChatMarkdown>{message.text}</ChatMarkdown>}
      </View>
    </View>
  )
}
