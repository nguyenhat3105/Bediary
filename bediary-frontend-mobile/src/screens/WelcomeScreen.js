import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const pink = '#F74587'

// Draw the decoration natively so it stays sharp at every screen size.
function Mascot({ width, bottomInset }) {
  const size = Math.min(width, 520)
  const diameter = size * 1.18
  return (
    <View pointerEvents="none" accessible={false} style={[styles.mascot, { width: diameter, height: diameter, borderRadius: diameter / 2, bottom: -size * 0.64 + bottomInset }]}>
      <View style={[StyleSheet.absoluteFill, styles.head, { borderRadius: diameter / 2 }]} />
      <View style={[styles.tuft, { left: '45%', transform: [{ rotate: '-30deg' }] }]} />
      <View style={[styles.tuft, { left: '50%', top: -24, height: 43, transform: [{ rotate: '25deg' }] }]} />
      <View style={styles.face}>
        {[0, 1].map(eye => (
          <View key={eye} style={styles.eyeColumn}>
            <View style={[styles.brow, { transform: [{ rotate: eye ? '8deg' : '-8deg' }] }]}>
              <View style={styles.browCurve} />
            </View>
            <View style={styles.eye}>
              <View style={styles.pupil}><View style={styles.glint} /></View>
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.nose, { top: size * 0.47 + 8 }]}><View style={styles.nostril} /><View style={styles.nostril} /></View>
    </View>
  )
}

export default function WelcomeScreen({ navigation }) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const contentHeight = Math.max(height - insets.top, 620)
  const mascotWidth = Math.min(width, 520)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
      <View style={[styles.canvas, { minHeight: contentHeight }]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.pinkCircle} />
          <View style={styles.smallCircle} />
          <View style={styles.purpleCircle} />
        </View>

        <View style={styles.brand} accessibilityRole="header" accessibilityLabel="Bediary">
          <View>
            {/* Preserve the original text metrics so replacing the artwork cannot shift the layout. */}
            <Text accessible={false} importantForAccessibility="no" adjustsFontSizeToFit numberOfLines={1} style={[styles.wordmark, { fontSize: Math.min(width * 0.205, 100), opacity: 0 }]}>Bediary</Text>
            <Image
              source={require('../../assets/branding/bediary-wordmark.png')}
              style={styles.wordmarkImage}
              resizeMode="contain"
              accessible={false}
              pointerEvents="none"
            />
          </View>
        </View>

        <View style={[styles.actions, { marginBottom: mascotWidth * 0.54 + Math.max(insets.bottom, 16) + 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Mở trang đăng ký tài khoản"
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [styles.button, styles.startButton, pressed && styles.pressed]}
          >
            <Text style={styles.startLabel}>Bắt đầu ngay</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Mở trang đăng nhập"
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.button, styles.loginButton, pressed && styles.pressed]}
          >
            <Text style={styles.loginLabel}>Đăng nhập</Text>
          </Pressable>
        </View>

        <Mascot width={width} bottomInset={insets.bottom} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF4EC' },
  canvas: { flex: 1, alignItems: 'center', overflow: 'hidden' },
  pinkCircle: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#FF83B1', top: -145, left: -140 },
  smallCircle: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFC0D8', top: 30, right: '11%' },
  purpleCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#BCA0F5', top: 40, right: -125 },
  brand: { flex: 1, width: '100%', minHeight: 235, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 36 },
  wordmark: { color: pink, fontWeight: '900', fontStyle: 'italic', letterSpacing: -5, paddingHorizontal: 8, paddingVertical: 12 },
  wordmarkImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: [{ translateX: -18 }] },
  actions: { width: '100%', maxWidth: 480, paddingHorizontal: 22, gap: 14, marginTop: 24, zIndex: 1 },
  button: { minHeight: 60, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  startButton: { backgroundColor: pink, shadowColor: pink, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  loginButton: { borderWidth: 2, borderColor: '#FFB7D0', backgroundColor: '#FFF9F5' },
  startLabel: { color: '#FFFFFF', fontSize: 21, fontWeight: '700', textAlign: 'center' },
  loginLabel: { color: pink, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  mascot: { position: 'absolute', alignItems: 'center' },
  head: { backgroundColor: '#FF80AE', transform: [{ scaleX: 1.12 }] },
  tuft: { position: 'absolute', top: -15, width: 28, height: 35, borderRadius: 20, backgroundColor: '#FF80AE' },
  face: { flexDirection: 'row', gap: '12%', width: '70%', marginTop: '10%' },
  eyeColumn: { flex: 1, alignItems: 'center' },
  brow: { width: '42%', height: 22, borderRadius: 11, overflow: 'hidden', marginBottom: 16 },
  browCurve: { position: 'absolute', left: '-50%', top: 0, width: '200%', aspectRatio: 1, borderWidth: 12, borderColor: '#07213C', borderRadius: 200 },
  eye: { width: '88%', aspectRatio: 0.94, borderRadius: 100, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '8%' },
  pupil: { width: '59%', aspectRatio: 1, borderRadius: 70, backgroundColor: '#07213C', alignItems: 'flex-start', padding: '12%' },
  glint: { width: '40%', aspectRatio: 1, borderRadius: 30, backgroundColor: '#FFFFFF' },
  nose: { position: 'absolute', flexDirection: 'row', gap: 9, zIndex: 1 },
  nostril: { width: 9, height: 11, borderRadius: 6, backgroundColor: '#07213C' },
})
