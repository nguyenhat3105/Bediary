import { Image, Text, View } from 'react-native'
import { colors } from '../theme/colors'

export default function EmptyState({ icon = '📭', imageSource, title, description }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 34, paddingHorizontal: 18 }}>
      {imageSource ? <Image source={imageSource} resizeMode="contain" accessible={false} style={{ width: 96, height: 96 }} /> : <Text style={{ fontSize: 40 }}>{icon}</Text>}
      <Text style={{ marginTop: 10, fontSize: 15, fontWeight: '900', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {description ? <Text style={{ marginTop: 5, fontSize: 12, color: colors.hint, textAlign: 'center', lineHeight: 18 }}>{description}</Text> : null}
    </View>
  )
}
