import { useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { AppAlert as Alert } from '../utils/appAlert'
import { Ionicons } from '@expo/vector-icons'
import BediaryLogo from '../components/BediaryLogo'
import PrimaryButton from '../components/PrimaryButton'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import { useAuth } from '../utils/auth'

export default function LoginScreen({ navigation }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!form.email || !form.password) {
      Alert.alert('Thiếu thông tin', 'Nhập email và mật khẩu để đăng nhập.')
      return
    }
    try {
      setLoading(true)
      await login(form)
    } catch (error) {
      Alert.alert('Không thể đăng nhập', error.response?.data?.message || 'Email hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }}>
        <BediaryLogo mascot />
        <View style={[styles.heroCard, { padding: 24 }]}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text }}>Chào mừng trở lại</Text>
          <Text style={{ marginTop: 5, marginBottom: 22, color: colors.text2 }}>Đăng nhập để xem nhật ký của bé</Text>

          <Text style={{ marginBottom: 6, fontWeight: '800', color: colors.text2, fontSize: 13 }}>Email</Text>
          <TextInput placeholderTextColor="#787078"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="bo@bediary.app"
            style={styles.input}
          />

          <Text style={{ marginTop: 14, marginBottom: 6, fontWeight: '800', color: colors.text2, fontSize: 13 }}>Mật khẩu</Text>
          <View style={{ position: 'relative' }}>
            <TextInput placeholderTextColor="#787078"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              style={[styles.input, { paddingRight: 48 }]}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} style={{ position: 'absolute', right: 12, top: 12 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.hint} />
            </Pressable>
          </View>

          <PrimaryButton loading={loading} onPress={submit} style={{ marginTop: 22 }}>Đăng nhập</PrimaryButton>

          <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: 18 }}>
            <Text style={{ textAlign: 'center', color: colors.hint }}>
              Chưa có tài khoản? <Text style={{ color: colors.primary, fontWeight: '900' }}>Đăng ký ngay</Text>
            </Text>
          </Pressable>
        </View>
        <Text style={{ marginTop: 18, textAlign: 'center', color: colors.hint, fontSize: 12 }}>Bảo mật dữ liệu gia đình và khoảnh khắc của bé</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
