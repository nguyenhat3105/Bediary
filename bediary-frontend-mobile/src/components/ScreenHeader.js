import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

export default function ScreenHeader({ title, subtitle, rightIcon, onRightPress }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, lineHeight: 32 }}>{title}</Text>
          {subtitle ? <Text style={{ marginTop: 4, color: colors.text2, fontSize: 13, lineHeight: 19 }}>{subtitle}</Text> : null}
        </View>
        {rightIcon ? (
          <Pressable onPress={onRightPress} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name={rightIcon} size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
