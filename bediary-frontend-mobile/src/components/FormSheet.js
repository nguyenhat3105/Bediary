import { useEffect, useRef } from 'react'
import { Animated, Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

export default function FormSheet({ visible = true, onClose, children, footer }) {
  const insets = useSafeAreaInsets()
  const offset = useRef(new Animated.Value(0)).current
  const scrollY = useRef(0)
  const startedAtTop = useRef(true)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const reset = () => Animated.spring(offset, {
    toValue: 0, useNativeDriver: true, speed: 24, bounciness: 0,
  }).start()
  const move = (_, gesture) => offset.setValue(Math.max(0, Math.min(gesture.dy, 220)))
  const release = (_, gesture) => {
    reset()
    if (gesture.dy > 90 || (gesture.dy > 25 && gesture.vy > 0.9)) {
      Keyboard.dismiss()
      closeRef.current?.()
    }
  }

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponderCapture: () => {
      startedAtTop.current = scrollY.current <= 1
      return false
    },
    onMoveShouldSetPanResponderCapture: (_, gesture) => startedAtTop.current
      && gesture.numberActiveTouches === 1
      && gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx) * 1.5,
    onPanResponderMove: move,
    onPanResponderRelease: release,
    onPanResponderTerminate: reset,
    onPanResponderTerminationRequest: () => false,
  })).current

  const handleResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && gesture.dy > Math.abs(gesture.dx),
    onPanResponderMove: move,
    onPanResponderRelease: release,
    onPanResponderTerminate: reset,
  })).current

  useEffect(() => {
    if (visible) {
      offset.setValue(0)
      scrollY.current = 0
    }
  }, [visible, offset])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: insets.top + 16, backgroundColor: 'rgba(17,24,39,.42)', justifyContent: 'flex-end' }}>
          <Animated.View {...responder.panHandlers} style={{ transform: [{ translateY: offset }], maxHeight: '100%', flexShrink: 1, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>
          <View {...handleResponder.panHandlers} accessibilityLabel="Kéo xuống để đóng" style={{ height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: '#DCCFD6' }} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
            onScroll={event => { scrollY.current = Math.max(0, event.nativeEvent.contentOffset.y) }}
            scrollEventThrottle={16} bounces={false}
            style={{ flexGrow: 0, flexShrink: 1, maxHeight: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
            contentContainerStyle={{ padding: 20, paddingBottom: footer ? 20 : Math.max(insets.bottom, 16) + 20 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
