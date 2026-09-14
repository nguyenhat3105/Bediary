import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function HealthDateField({ label, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const parts = (value || '').split('-').map(Number);
  const parsed = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
  const selected = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return <View style={{ marginTop: 12 }}>
    <Text style={{ color: colors.text2, fontSize: 12, marginBottom: 6 }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface }}>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? parts.slice().reverse().join('/') : 'Chưa chọn'}`} onPress={() => setOpen(true)} style={{ flex: 1, minHeight: 52, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="calendar-outline" size={21} color={colors.primary} />
        <Text style={{ flex: 1, color: value ? colors.text : '#787078' }}>{value ? parts.slice().reverse().map(n => String(n).padStart(2, '0')).join('/') : 'Chọn ngày (không bắt buộc)'}</Text>
      </Pressable>
      {!!value && !disabled && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${label.toLowerCase()}`} onPress={() => { setOpen(false); onChange(''); }} style={{ padding: 12, minHeight: 44, minWidth: 44 }}><Ionicons name="close-circle-outline" size={21} color={colors.hint} /></Pressable>}
    </View>
    {open && !disabled && <>
      <DateTimePicker value={selected} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => {
        if (Platform.OS !== 'ios') setOpen(false);
        if (event.type === 'set' && date) {
          const pad = n => String(n).padStart(2, '0');
          onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
        }
      }} />
      {Platform.OS === 'ios' && <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ padding: 12 }}><Text style={{ color: colors.primary, textAlign: 'right' }}>Xong</Text></Pressable>}
    </>}
  </View>;
}
