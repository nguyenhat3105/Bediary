import { ActivityIndicator, Pressable, Text } from 'react-native'
import { styles } from '../theme/styles'
import { useRef, useState } from 'react'

export default function PrimaryButton({ children, loading, disabled, style, onPress }) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  async function press(event) {
    if (pending.current || loading || disabled) return
    pending.current = true
    setBusy(true)
    try { await onPress?.(event) }
    finally { pending.current = false; setBusy(false) }
  }
  return (
    <Pressable onPress={press} disabled={disabled || loading || busy} style={[styles.button, style, (disabled || loading || busy) && { opacity: 0.58 }]}>
      {loading || busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{children}</Text>}
    </Pressable>
  )
}
