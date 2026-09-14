import { Linking, ScrollView, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import { colors } from '../theme/colors'
import { AppAlert } from '../utils/appAlert'

const rules = {
  table: (node, children) => (
    <ScrollView key={node.key} horizontal showsHorizontalScrollIndicator>
      <View style={{ borderWidth: 1, borderColor: colors.border, marginVertical: 8 }}>{children}</View>
    </ScrollView>
  ),
  image: () => null,
}
const markdownStyles = {
  body: { color: colors.text2, fontSize: 14, lineHeight: 22 },
  heading1: { fontSize: 20, lineHeight: 28, fontWeight: '800', marginVertical: 8 },
  heading2: { fontSize: 18, lineHeight: 26, fontWeight: '800', marginVertical: 8 },
  heading3: { fontSize: 16, lineHeight: 24, fontWeight: '700', marginVertical: 6 },
  th: { width: 160, flex: 0, padding: 10, backgroundColor: colors.primaryPale },
  td: { width: 160, flex: 0, padding: 10 },
  link: { color: colors.primaryDark },
  code_inline: { backgroundColor: colors.surface2 },
}
export default function ChatMarkdown({ children }) {
  return <Markdown rules={rules} style={markdownStyles} onLinkPress={url => {
    if (/^https?:\/\//i.test(url)) Linking.openURL(url).catch(() => AppAlert.alert('Không mở được liên kết', 'Vui lòng thử lại sau.'))
    return false
  }}>{children || ''}</Markdown>
}
