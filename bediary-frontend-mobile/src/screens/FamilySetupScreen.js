import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { AppAlert as Alert } from '../utils/appAlert'
import PrimaryButton from '../components/PrimaryButton'
import BirthDatePicker from '../components/BirthDatePicker'
import { familyApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import { useAuth } from '../utils/auth'
import { normalizeBirthDate } from '../utils/birthDate'
import { todayIso } from '../utils/format'

export default function FamilySetupScreen({ navigation }) {
  const { user, updateSession, logout } = useAuth()
  const [mode, setMode] = useState('create')
  const [form, setForm] = useState({ babyName: '', babyDob: '', babyGender: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  async function submit() {
    if (submitting.current) return
    const babyDob = normalizeBirthDate(form.babyDob)
    if (mode === 'create' && !form.babyName.trim()) {
      Alert.alert('Nhập tên bé', 'Vui lòng nhập tên bé trước khi tạo hồ sơ.')
      return
    }
    if (mode === 'create' && (!babyDob || babyDob > todayIso())) {
      Alert.alert('Ngày sinh chưa hợp lệ', 'Nhập ngày sinh theo DD/MM/YYYY hoặc YYYY-MM-DD, không sau ngày hôm nay. Ví dụ: 31/05/2025.')
      return
    }
    if (mode === 'create' && !form.babyGender) {
      Alert.alert('Chọn giới tính của bé', 'Thông tin này dùng để theo dõi tăng trưởng của bé.')
      return
    }
    submitting.current = true
    try {
      setLoading(true)
      const response = mode === 'create'
        ? await familyApi.create({
          babyName: form.babyName.trim(),
          babyDob,
          babyGender: form.babyGender,
          existingFamilyId: user?.familyId || null,
        })
        : await familyApi.join({ inviteCode: form.inviteCode.trim() })
      const familyId = response.data?.familyId || response.data?.id
      await updateSession({
        token: response.data?.newToken,
        user: { ...user, familyId, role: response.data?.role || (mode === 'create' ? 'PARENT' : 'VIEWER') },
      })
      // Initial setup is handled by RootNavigator when the session gains a family.
      // A setup screen opened from Profile may still be on the active stack.
      if (user?.familyId && navigation.isFocused()) {
        if (navigation.canGoBack()) navigation.goBack()
        else navigation.replace('Tabs')
      }
    } catch (error) {
      Alert.alert('Không thể thiết lập gia đình', error.response?.data?.message || 'Kiểm tra lại thông tin nhé.')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 22, flexGrow: 1, justifyContent: 'center' }}>
      <View style={styles.heroCard}>
        <Text style={styles.title}>Thiết lập nhật ký bé</Text>
        <Text style={styles.subtitle}>Tạo hồ sơ bé mới hoặc tham gia bằng mã mời của gia đình.</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginVertical: 18 }}>
          {['create', 'join'].map((item) => (
            <Text key={item} onPress={() => setMode(item)} style={[styles.chip, { flex: 1, textAlign: 'center', overflow: 'hidden', paddingVertical: 10, backgroundColor: mode === item ? colors.primary : colors.primaryLight, color: mode === item ? '#fff' : colors.primary }]}>
              {item === 'create' ? 'Tạo mới' : 'Tham gia'}
            </Text>
          ))}
        </View>
        {mode === 'create' ? (
          <>
            <TextInput placeholderTextColor="#787078" placeholder="Tên bé" value={form.babyName} onChangeText={(babyName) => setForm({ ...form, babyName })} style={styles.input} />
            <BirthDatePicker value={form.babyDob} onChange={(babyDob) => setForm({ ...form, babyDob })} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              {[['MALE', 'Bé trai'], ['FEMALE', 'Bé gái']].map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: form.babyGender === value }} onPress={() => setForm({ ...form, babyGender: value })} style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: form.babyGender === value ? colors.primaryLight : colors.surfaceSoft }}><Text style={{ textAlign: 'center', color: colors.text }}>{label}</Text></Pressable>)}
            </View>
          </>
        ) : (
          <TextInput placeholderTextColor="#787078" placeholder="Mã mời gia đình" value={form.inviteCode} onChangeText={(inviteCode) => setForm({ ...form, inviteCode })} autoCapitalize="characters" style={styles.input} />
        )}
        <PrimaryButton loading={loading} onPress={submit} style={{ marginTop: 18 }}>{mode === 'create' ? 'Tạo nhật ký' : 'Tham gia'}</PrimaryButton>
        <Text onPress={logout} style={{ marginTop: 16, textAlign: 'center', color: colors.hint, fontWeight: '800' }}>Đăng xuất</Text>
      </View>
    </ScrollView>
  )
}
