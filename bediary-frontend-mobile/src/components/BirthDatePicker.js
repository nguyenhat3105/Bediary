import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme/colors'

const pad = value => String(value).padStart(2, '0')

export default function BirthDatePicker({ value, onChange, title = 'Ngày sinh của bé', allowFuture = false }) {
  const today = new Date()
  const [visible, setVisible] = useState(false)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [yearsOpen, setYearsOpen] = useState(false)
  const todayValue = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const button = { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const count = new Date(year, month + 1, 0).getDate()
  const canNext = allowFuture || year < today.getFullYear() || month < today.getMonth()
  function move(offset) {
    const date = new Date(year, month + offset, 1)
    setYear(date.getFullYear())
    setMonth(date.getMonth())
  }
  function open() {
    const parts = value?.split('-').map(Number)
    setYear(parts?.[0] || today.getFullYear())
    setMonth(parts?.[1] ? parts[1] - 1 : today.getMonth())
    setYearsOpen(false)
    setVisible(true)
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ngày sinh${value ? `, ${value.split('-').reverse().join('/')}` : ''}`} onPress={open} style={{ marginTop: 12, minHeight: 52, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name="calendar-outline" size={21} color={colors.primary} />
      <Text style={{ flex: 1, color: value ? colors.text : colors.hint }}>{value ? value.split('-').reverse().join('/') : title}</Text>
      <Ionicons name="chevron-down" size={18} color={colors.hint} />
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(25,20,30,0.4)' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 16, maxHeight: '85%' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{title}</Text>
          <Text style={{ color: colors.hint, marginTop: 6 }}>Chạm vào tháng, năm để chọn năm nhanh.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => move(-1)} style={button}><Ionicons name="chevron-back" size={22} color={colors.primary} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Chọn năm sinh" onPress={() => setYearsOpen(!yearsOpen)} style={[button, { flex: 1 }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>Tháng {month + 1} / {year} ▾</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" disabled={!canNext} onPress={() => move(1)} style={button}><Ionicons name="chevron-forward" size={22} color={canNext ? colors.primary : colors.border} /></Pressable>
          </View>
          {yearsOpen ? <ScrollView style={{ maxHeight: 300 }}>{Array.from({ length: allowFuture ? 141 : 121 }, (_, i) => today.getFullYear() + (allowFuture ? 20 : 0) - i).map(item => <Pressable key={item} accessibilityRole="button" onPress={() => { setYear(item); if (!allowFuture && item === today.getFullYear() && month > today.getMonth()) setMonth(today.getMonth()); setYearsOpen(false) }} style={button}><Text style={{ color: item === year ? colors.primary : colors.text, fontWeight: '700' }}>{item}</Text></Pressable>)}</ScrollView> : <ScrollView>
            <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <Text key={day} style={{ width: '14.2857%', textAlign: 'center', color: colors.hint, paddingVertical: 8 }}>{day}</Text>)}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: firstDay + count }, (_, i) => {
              const day = i - firstDay + 1
              if (day < 1) return <View key={i} style={{ width: '14.2857%' }} />
              const date = `${year}-${pad(month + 1)}-${pad(day)}`
              const disabled = !allowFuture && date > todayValue
              return <Pressable key={i} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${day}/${month + 1}/${year}`} accessibilityState={{ selected: value === date, disabled }} onPress={() => { onChange(date); setVisible(false) }} style={{ width: '14.2857%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: value === date ? colors.primary : 'transparent' }}><Text style={{ color: disabled ? colors.border : value === date ? '#fff' : colors.text }}>{day}</Text></Pressable>
            })}</View>
          </ScrollView>}
          <Pressable accessibilityRole="button" onPress={() => setVisible(false)} style={[button, { marginTop: 8 }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>Hủy</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>
}
