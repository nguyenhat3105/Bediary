import { Image, Text, View } from 'react-native'
import { colors } from '../theme/colors'

export default function BediaryLogo({ compact = false, mascot = false }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: compact ? 14 : 28 }}>
      <View style={{ width: compact ? 58 : 76, height: compact ? 58 : 76, borderRadius: mascot ? (compact ? 13 : 17) : (compact ? 22 : 28), overflow: mascot ? 'hidden' : 'visible', backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: mascot ? 2 : 1, borderColor: mascot ? colors.primary : '#FFD6E4', shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 3 }}>
        {mascot ? <Image source={require('../../assets/characters/mascot.png')} resizeMode="contain" accessible={false} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: compact ? 30 : 42, lineHeight: compact ? 36 : 48 }}>🍼</Text>}
      </View>
      <Text style={{ marginTop: 10, fontSize: compact ? 24 : 30, fontWeight: '800', color: colors.primary }}>Bediary</Text>
      {!compact && <Text style={{ marginTop: 4, color: colors.text2, fontSize: 14 }}>Nhật ký yêu thương của bé</Text>}
    </View>
  )
}
