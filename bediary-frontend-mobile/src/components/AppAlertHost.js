import { useEffect, useSyncExternalStore } from 'react'
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { closeAlert, getCurrentAlert, subscribeAlerts } from '../utils/appAlert'

export default function AppAlertHost() {
  const alert = useSyncExternalStore(subscribeAlerts, getCurrentAlert, getCurrentAlert)
  useEffect(() => { if (alert) Keyboard.dismiss() }, [alert?.id])
  if (!alert) return null
  const destructive = alert.buttons.some(button => button.style === 'destructive')
  const cancelIndex = alert.buttons.findIndex(button => button.style === 'cancel')
  const dismiss = () => {
    if (cancelIndex >= 0) closeAlert(alert.id, cancelIndex)
    else if (alert.options.cancelable) closeAlert(alert.id)
  }
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <SafeAreaView style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessible={false} />
        <View style={s.dialog} accessibilityViewIsModal>
          <ScrollView bounces={false} contentContainerStyle={s.content}>
            <View style={[s.symbol, { backgroundColor: destructive ? colors.dangerBg : colors.primaryLight }]}>
              <Ionicons name={destructive ? 'trash-outline' : 'chatbubble-ellipses-outline'} size={26} color={destructive ? colors.danger : colors.primaryDark} />
            </View>
            <Text style={s.brand}>Bediary</Text>
            <Text accessibilityRole="header" style={s.title}>{alert.title}</Text>
            {Boolean(alert.message) && <Text style={s.message}>{alert.message}</Text>}
            <View style={s.actions}>
              {alert.buttons.map((button, index) => {
                const cancel = button.style === 'cancel'
                const danger = button.style === 'destructive'
                return (
                  <Pressable key={index} accessibilityRole="button" accessibilityLabel={button.text || 'Đã hiểu'}
                    onPress={() => closeAlert(alert.id, index)}
                    style={({ pressed }) => [s.button, {
                      backgroundColor: cancel ? colors.surface2 : danger ? '#C93648' : colors.primaryDark,
                      opacity: pressed ? 0.75 : 1,
                    }]}>
                    {danger && <Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
                    <Text style={[s.buttonText, { color: cancel ? colors.text2 : '#FFFFFF' }]}>{button.text || 'Đã hiểu'}</Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(25, 18, 22, 0.48)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 400, maxHeight: '90%', borderRadius: 8, backgroundColor: colors.surface, overflow: 'hidden', elevation: 12 },
  content: { padding: 24 },
  symbol: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 23, color: colors.text2, textAlign: 'center', marginTop: 12 },
  actions: { gap: 10, marginTop: 24 },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
})
