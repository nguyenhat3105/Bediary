import { useEffect, useState } from 'react'
import { Keyboard, useWindowDimensions } from 'react-native'

export default function useCompactChat() {
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const { height, fontScale } = useWindowDimensions()
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  return keyboardVisible || height < 650 || fontScale > 1.3
}
