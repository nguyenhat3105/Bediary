import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { AppAlert as Alert } from '../utils/appAlert'
import BediaryLogo from '../components/BediaryLogo'
import PrimaryButton from '../components/PrimaryButton'
import { authApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập đầy đủ họ tên, email và mật khẩu.')
      return
    }
    if (form.password.length < 6 || form.password.length > 100) {
      Alert.alert('Mật khẩu chưa hợp lệ', 'Mật khẩu cần từ 6 đến 100 ký tự.')
      return
    }
    try {
      setLoading(true)
      await authApi.register({ ...form, email: form.email.trim().toLowerCase(), fullName: form.fullName.trim() })
      Alert.alert('Đăng ký thành công', 'Bạn có thể đăng nhập vào Bediary ngay.')
      navigation.navigate('Login')
    } catch (error) {
      const data = error.response?.data
      const labels = { email: 'Email chưa hợp lệ.', password: 'Mật khẩu cần từ 6 đến 100 ký tự.', fullName: 'Họ tên không được trống và không quá 100 ký tự.' }
      const validation = Object.keys(data?.fieldErrors || {}).map(key => labels[key] || 'Thông tin nhập chưa hợp lệ.').join('\n')
      const message = validation || data?.message || (
        error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
          ? 'Máy chủ phản hồi quá lâu. Hãy thử đăng nhập trước khi đăng ký lại.'
          : !error.response ? 'Không kết nối được máy chủ. Kiểm tra Internet và thử lại.'
            : `Máy chủ trả lỗi HTTP ${error.response.status}. Vui lòng thử lại sau.`
      )
      Alert.alert('Không thể đăng ký', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }}>
        <BediaryLogo compact />
        <View style={[styles.heroCard, { padding: 24 }]}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Tạo tài khoản</Text>
          <Text style={{ marginTop: 5, marginBottom: 22, color: colors.text2 }}>Bắt đầu nhật ký yêu thương của bé</Text>

          <TextInput placeholderTextColor="#787078" placeholder="Họ tên" value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} style={styles.input} />
          <TextInput placeholderTextColor="#787078" placeholder="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} keyboardType="email-address" autoCapitalize="none" style={[styles.input, { marginTop: 12 }]} />
          <TextInput placeholderTextColor="#787078" placeholder="Mật khẩu" value={form.password} onChangeText={(password) => setForm({ ...form, password })} secureTextEntry style={[styles.input, { marginTop: 12 }]} />

          <PrimaryButton loading={loading} onPress={submit} style={{ marginTop: 22 }}>Đăng ký</PrimaryButton>

          <Pressable onPress={() => navigation.navigate('Login')} style={{ marginTop: 18 }}>
            <Text style={{ textAlign: 'center', color: colors.hint }}>
              Đã có tài khoản? <Text style={{ color: colors.primary, fontWeight: '900' }}>Đăng nhập</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
