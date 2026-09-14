import React from 'react'
import { ScrollView, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ error, info })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 22, flexGrow: 1, justifyContent: 'center' }}>
        <View style={styles.card}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.danger }}>Bediary mobile bị lỗi</Text>
          <Text style={{ marginTop: 8, color: colors.text2, lineHeight: 20 }}>
            App đã bắt được lỗi runtime. Gửi phần nội dung bên dưới để mình sửa đúng file.
          </Text>
          <Text selectable style={{ marginTop: 16, color: colors.danger, fontWeight: '800', lineHeight: 20 }}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
          {this.state.info?.componentStack ? (
            <Text selectable style={{ marginTop: 12, color: colors.hint, fontSize: 11, lineHeight: 16 }}>
              {this.state.info.componentStack}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    )
  }
}
