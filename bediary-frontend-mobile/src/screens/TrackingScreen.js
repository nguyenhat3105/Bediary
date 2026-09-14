import { useAuth } from "../utils/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeModules, PermissionsAndroid, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import FormSheet from '../components/FormSheet';
import { AppAlert as Alert } from '../utils/appAlert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Voice from '@react-native-voice/voice';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { trackingApi, dashboardApi } from '../api/api';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import { formatDate, listFromResponse, todayIso, unwrap } from '../utils/format';
const ACTIVITIES = [{
  key: 'FEED',
  label: 'Bú / Ăn',
  hint: '1 chạm lưu bữa ăn',
  icon: 'restaurant-outline',
  emoji: '🍼',
  bg: colors.primaryLight,
  color: colors.primary
}, {
  key: 'SLEEP',
  label: 'Ngủ',
  hint: '1 chạm lưu 15 phút ngủ',
  icon: 'moon-outline',
  emoji: '🌙',
  bg: colors.purpleLight,
  color: colors.purple
}, {
  key: 'PEE',
  label: 'Đi tiểu',
  hint: '1 chạm lưu tã ướt',
  icon: 'water-outline',
  emoji: '💧',
  bg: colors.blueLight,
  color: colors.blue
}, {
  key: 'POOP',
  label: 'Đi tiêu',
  hint: '1 chạm lưu đi tiêu',
  emoji: '💩',
  bg: colors.warningBg,
  color: colors.warning
}];

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function dateInput(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function activityOf(type) {
  if (type === 'DIAPER') return ACTIVITIES[2];
  return ACTIVITIES.find(item => item.key === type) || ACTIVITIES[0];
}
function normalizedActivityKey(log) {
  if (log?.activityType !== 'DIAPER') return log?.activityType;
  const diaperType = String(log.metadata?.diaper_type || log.metadata?.diaperType || '').toUpperCase();
  return diaperType.includes('POOP') || diaperType.includes('STOOL') ? 'POOP' : 'PEE';
}
function activityOfLog(log) {
  return activityOf(normalizedActivityKey(log));
}
function normalizeLog(log) {
  if (!log || typeof log !== 'object') return null;
  return {
    ...log,
    metadata: log.metadata && typeof log.metadata === 'object' ? log.metadata : {}
  };
}
function normalizeLogs(response) {
  return listFromResponse(response).map(normalizeLog).filter(Boolean).sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
}
function isLogOnDate(log, isoDate) {
  if (!log?.startTime) return false;
  const startedAt = new Date(log.startTime);
  return !Number.isNaN(startedAt.getTime()) && dateInput(startedAt) === isoDate;
}
function mergeSavedLog(logs, savedLog, selectedDateIso) {
  const normalized = normalizeLog(savedLog);
  if (!normalized || !isLogOnDate(normalized, selectedDateIso)) return logs;
  const withoutDuplicate = logs.filter(item => item.id !== normalized.id);
  return [normalized, ...withoutDuplicate].sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
}
function toBackendActivityType(activityType) {
  return activityType === 'PEE' || activityType === 'POOP' ? 'DIAPER' : activityType;
}
function toBackendTrackingPayload(payload) {
  return {
    ...payload,
    activityType: toBackendActivityType(payload.activityType),
    metadata: payload.metadata || {}
  };
}
function displayTime(value) {
  if (!value) return 'Cả ngày';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
function diaperLabel(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized.includes('POOP') || normalized.includes('STOOL')) return 'Tã bẩn';
  if (normalized.includes('WET') || normalized.includes('PEE')) return 'Tã ướt';
  return '';
}
function getAgeInMonths(dob) {
  if (!dob) return 3;
  const birth = new Date(dob);
  const today = new Date();
  if (Number.isNaN(birth.getTime()) || birth > today) return 3;
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}
function getDefaultMilkMl(ageMonths) {
  if (ageMonths <= 0) return 60;
  if (ageMonths <= 1) return 90;
  if (ageMonths <= 2) return 120;
  if (ageMonths <= 4) return 150;
  if (ageMonths <= 6) return 180;
  if (ageMonths <= 9) return 160;
  return 140;
}
function getDefaultSleepMinutes(ageMonths) {
  if (ageMonths <= 2) return 45;
  if (ageMonths <= 6) return 40;
  if (ageMonths <= 12) return 35;
  return 30;
}
function extractFirstNumber(text) {
  const match = String(text || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}
function cleanVoiceNote(text, words = []) {
  return String(text || '').toLowerCase().replace(/\d+(?:[\.,]\d+)?/g, '').replace(/\b(ml|mili|mililit|phút|phut|giờ|gio|tiếng|tieng|bé|be)\b/g, '').split(/\s+/).filter(word => word && !words.includes(word)).join(' ').trim();
}
function buildVoicePayload(activity, transcript) {
  const now = new Date();
  const text = String(transcript || '').trim();
  const lower = text.toLowerCase().replace(/,/g, '.');
  const metadata = {
    note: text
  };
  let startTime = now.toISOString();
  let endTime = null;
  if (activity.key === 'FEED') {
    const amount = lower.match(/(\d+(?:\.\d+)?)\s*(?:ml|mililit|mili)(?![a-z])/);
    if (amount && Number(amount[1]) > 0) {
      metadata.value = Number(amount[1]);
      metadata.unit = 'ml';
    }
  }
  if (activity.key === 'SLEEP') {
    const hours = lower.match(/(\d+(?:\.\d+)?)\s*(?:giờ|gio|tiếng|tieng)/);
    const minutes = lower.match(/(\d+(?:\.\d+)?)\s*(?:phút|phut)/);
    const duration = Math.round((Number(hours?.[1]) || 0) * 60 + (Number(minutes?.[1]) || 0));
    if (duration > 0) {
      metadata.durationMinutes = duration;
      startTime = new Date(now.getTime() - duration * 60000).toISOString();
      endTime = now.toISOString();
    }
  }
  if (activity.key === 'PEE') metadata.diaper_type = 'WET';
  if (activity.key === 'POOP') metadata.diaper_type = 'POOP';
  return toBackendTrackingPayload({
    activityType: activity.key,
    startTime,
    endTime,
    metadata
  });
}

/* ─── Screen ──────────────────────────────────────────────────────────────── */

export default function TrackingScreen() {
  const longPressTriggered = useRef(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logs, setLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState(null);
  const [savingType, setSavingType] = useState(null);
  const [form, setForm] = useState({
    activityType: 'FEED',
    value: '',
    durationMinutes: '',
    food: '',
    note: ''
  });
  const [babyDob, setBabyDob] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const selectedDateIso = dateInput(selectedDate);
  const isToday = selectedDateIso === todayIso();

  // Fetch babyDob once on mount (best-effort)
  useEffect(() => {
    dashboardApi.get().then(res => {
      const data = res?.data;
      setBabyDob(data?.babyDob || data?.babyBirthday || null);
    }).catch(() => {/* ignore – age-based defaults will use fallback 3 months */});
  }, []);
  const load = useCallback(async ({
    preserveCurrentWhenEmpty = false
  } = {}) => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const response = await trackingApi.daily(selectedDateIso);
      const nextLogs = normalizeLogs(response);
      setLogs(current => {
        if (preserveCurrentWhenEmpty && nextLogs.length === 0 && current.some(log => isLogOnDate(log, selectedDateIso))) {
          return current;
        }
        return nextLogs;
      });
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Không kết nối được server';
      setLoadError(msg);
    } finally {
      setRefreshing(false);
    }
  }, [selectedDateIso]);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const counts = useMemo(() => ACTIVITIES.map(type => ({
    ...type,
    count: logs.filter(log => normalizedActivityKey(log) === type.key).length
  })), [logs]);
  async function quickLog(activity) {
    if (savingType) return;
    setSavingType(activity.key);
    try {
      const now = new Date();
      const metadata = {};
      let endTime = null;
      if (activity.key === 'FEED') {
        metadata.value = getDefaultMilkMl(getAgeInMonths(babyDob)); // age-based, not hardcoded
        metadata.unit = 'ml';
      }
      if (activity.key === 'SLEEP') {
        metadata.durationMinutes = 15;
        endTime = new Date(now.getTime() + metadata.durationMinutes * 60 * 1000).toISOString();
      }
      if (activity.key === 'PEE') {
        metadata.diaper_type = 'WET';
        metadata.note = 'Bé đi tiểu bình thường';
      }
      if (activity.key === 'POOP') {
        metadata.diaper_type = 'POOP';
        metadata.note = 'Bé đi tiêu bình thường';
      }
      const saved = unwrap(await trackingApi.log(toBackendTrackingPayload({
        activityType: activity.key,
        startTime: now.toISOString(),
        endTime,
        metadata
      })));
      setLogs(current => mergeSavedLog(current, saved, selectedDateIso));
      await load({
        preserveCurrentWhenEmpty: true
      });
    } catch (error) {
      Alert.alert('Ghi thất bại', error.response?.data?.message || 'Thử lại sau nhé.');
    } finally {
      setSavingType(null);
    }
  }
  function openVoiceLog(activity) {
    longPressTriggered.current = true;
    setVoiceActivity(activity);
  }
  function handleQuickPress(activity) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    quickLog(activity);
  }
  async function save() {
    const metadata = {};
    if (form.activityType === 'FEED') {
      if (form.value) {
        metadata.value = Number(form.value);
        metadata.unit = 'ml';
      }
      if (form.food) metadata.food = form.food;
    }
    let endTime = null;
    if (form.activityType === 'SLEEP' && form.durationMinutes) {
      metadata.durationMinutes = Number(form.durationMinutes);
      endTime = new Date(Date.now() + metadata.durationMinutes * 60 * 1000).toISOString();
    }
    if (form.activityType === 'PEE') metadata.diaper_type = 'WET';
    if (form.activityType === 'POOP') metadata.diaper_type = 'POOP';
    if (form.note) metadata.note = form.note;
    try {
      const saved = unwrap(await trackingApi.log(toBackendTrackingPayload({
        activityType: form.activityType,
        startTime: new Date().toISOString(),
        endTime,
        metadata
      })));
      setModal(false);
      setForm({
        activityType: 'FEED',
        value: '',
        durationMinutes: '',
        food: '',
        note: ''
      });
      setLogs(current => mergeSavedLog(current, saved, selectedDateIso));
      await load({
        preserveCurrentWhenEmpty: true
      });
    } catch (error) {
      Alert.alert('Không thể lưu nhật ký', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  async function saveVoiceLog(payload) {
    try {
      const saved = unwrap(await trackingApi.log(toBackendTrackingPayload(payload)));
      setVoiceActivity(null);
      setLogs(current => mergeSavedLog(current, saved, selectedDateIso));
      await load({
        preserveCurrentWhenEmpty: true
      });
      Alert.alert('Đã lưu', 'Đã lưu nhật ký bằng giọng nói.');
    } catch (error) {
      Alert.alert('Không thể lưu nhật ký', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  async function updateLog(id, data) {
    try {
      const saved = unwrap(await trackingApi.update(id, toBackendTrackingPayload(data)));
      setEditLog(null);
      setLogs(current => mergeSavedLog(current.filter(item => item.id !== id), saved, selectedDateIso));
      await load({
        preserveCurrentWhenEmpty: true
      });
    } catch (error) {
      Alert.alert('Không thể cập nhật', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  function confirmDelete(log) {
    Alert.alert('Xoá hoạt động?', `Xoá "${activityOfLog(log).label}" lúc ${displayTime(log.startTime)}?`, [{
      text: 'Hủy',
      style: 'cancel'
    }, {
      text: 'Xoá',
      style: 'destructive',
      onPress: async () => {
        try {
          await trackingApi.delete(log.id);
          setEditLog(null);
          await load();
        } catch (error) {
          Alert.alert('Không thể xoá', error.response?.data?.message || 'Thử lại sau nhé.');
        }
      }
    }]);
  }
  return <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}>
        <View style={{
        marginBottom: 20
      }}>
          <Text style={styles.title}>Nhật ký</Text>
          <Text style={styles.subtitle}>Theo dõi bữa ăn, giấc ngủ và sinh hoạt của bé.</Text>
        </View>

        {/* Error banner — shown when load() fails */}
        {loadError ? <Pressable onPress={load} style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.dangerBg,
        borderWidth: 1,
        borderColor: '#FFD0D0',
        borderRadius: 16,
        padding: 13,
        marginBottom: 16
      }}>
            <Ionicons name="warning-outline" size={18} color={colors.danger} />
            <View style={{
          flex: 1
        }}>
              <Text style={{
            color: colors.danger,
            fontSize: 13,
            fontWeight: '900'
          }}>Không tải được nhật ký</Text>
              <Text style={{
            color: colors.danger,
            fontSize: 11,
            opacity: 0.8,
            marginTop: 2
          }}>{loadError} · Chạm để thử lại</Text>
            </View>
            <Ionicons name="refresh-outline" size={16} color={colors.danger} />
          </Pressable> : null}

        {/* Date selector */}
        <View style={[styles.card, {
        borderRadius: 20,
        paddingVertical: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }]}>
          <Pressable onPress={() => setSelectedDate(addDays(selectedDate, -1))} style={{
          width: 44,
          height: 44,
          borderRadius: 20,
          backgroundColor: colors.surfaceSoft,
          alignItems: 'center',
          justifyContent: 'center'
        }}>
            <Ionicons name="chevron-back" size={20} color={colors.text2} />
          </Pressable>
          <View style={{
          alignItems: 'center',
          flex: 1
        }}>
            <Text style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '800'
          }}>{formatDate(selectedDateIso)}</Text>
            {isToday ? <Text style={{
            marginTop: 4,
            color: colors.primary,
            backgroundColor: colors.primaryLight,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
            fontSize: 11,
            fontWeight: '800'
          }}>Hôm nay</Text> : null}
          </View>
          <Pressable disabled={isToday} onPress={() => setSelectedDate(addDays(selectedDate, 1))} style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surfaceSoft,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isToday ? 0.35 : 1
        }}>
            <Ionicons name="chevron-forward" size={20} color={colors.text2} />
          </Pressable>
        </View>

        {/* Daily metrics */}
        {!isToday ? <Pressable accessibilityRole="button" onPress={() => setSelectedDate(new Date())} style={{
        minHeight: 44,
        padding: 12,
        marginBottom: 16,
        borderRadius: 14,
        backgroundColor: colors.primaryLight,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      }}>
          <Ionicons name="today-outline" size={18} color={colors.primaryDark} /><Text style={{
          flex: 1,
          color: colors.primaryDark,
          fontSize: 12
        }}>Đang xem nhật ký cũ · Về hôm nay để ghi thêm</Text><Ionicons name="arrow-forward" size={17} color={colors.primaryDark} />
        </Pressable> : null}
        {logs.length > 0 ? <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
            {counts.map(item => <Metric key={item.key} item={item} />)}
          </View> : null}

        {/* Quick-log grid (today only) */}
        {isToday ? <View style={{
        marginBottom: 24
      }}>
            <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: 12
        }}>
              <Text style={[styles.sectionTitle, {
            fontSize: 16
          }]}>Ghi nhanh hôm nay</Text>
              <Pressable accessibilityRole="button" onPress={() => setVoiceActivity(ACTIVITIES[0])} style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}><Ionicons name="mic-outline" size={17} color={colors.primaryDark} /><Text style={{
              color: colors.primaryDark,
              fontSize: 12,
              fontWeight: '700'
            }}>Nhập giọng nói</Text></Pressable>
            </View>
            <Text style={{
          color: colors.text2,
          fontSize: 11,
          lineHeight: 18,
          marginBottom: 10
        }}>Chạm để lưu ngay; nhấn giữ để nhập giọng nói. Chọn “Thêm” nếu cần điền chi tiết.</Text>
            <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12
        }}>
              {ACTIVITIES.map(activity => <Pressable key={activity.key} onPress={() => handleQuickPress(activity)} onLongPress={() => openVoiceLog(activity)} delayLongPress={450} disabled={Boolean(savingType)} style={{
            width: '47%',
            backgroundColor: activity.bg,
            borderRadius: 20,
            padding: 14,
            alignItems: 'center'
          }}>
                  {savingType === activity.key ? <ActivityIndicator style={{
              height: 38
            }} color={activity.color} /> : <Text style={{
              fontSize: 30
            }}>{activity.emoji}</Text>}
                  <Text style={{
              marginTop: 4,
              color: activity.color,
              fontSize: 13,
              fontWeight: '900'
            }}>{activity.label}</Text>
                  <Text style={{
              marginTop: 3,
              color: activity.color,
              fontSize: 11,
              textAlign: 'center'
            }}>{activity.key === 'FEED' ? `Lưu nhanh ${getDefaultMilkMl(getAgeInMonths(babyDob))} ml` : activity.hint}</Text>
                </Pressable>)}
            </View>
          </View> : null}

        {/* History list */}
        <View>
          <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
            <Text style={[styles.sectionTitle, {
            fontSize: 16
          }]}>
              Lịch sử {logs.length > 0 ? <Text style={{
              color: colors.primary
            }}>({logs.length})</Text> : null}
            </Text>
            {isToday ? <View style={{
            flexDirection: 'row',
            gap: 8
          }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Nh?p nh?t k? b?ng gi?ng n?i" onPress={() => setVoiceActivity(ACTIVITIES[0])} style={{
              width: 44,
              height: 44,
              borderRadius: 18,
              backgroundColor: colors.primaryLight,
              borderWidth: 1,
              borderColor: '#FFD6E4',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                <Ionicons name="mic-outline" size={16} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => setModal(true)} style={{
              minHeight: 44,
              borderRadius: 999,
              paddingHorizontal: 14,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}>
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: '900'
              }}>Thêm</Text>
              </Pressable>
              <Pressable onPress={load} style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                <Ionicons name="refresh" size={16} color={colors.text2} />
              </Pressable>
            </View> : null}
          </View>

          <View style={[styles.card, {
          padding: 0,
          overflow: 'hidden'
        }]}>
            {refreshing && !logs.length ? <View style={{
            padding: 28,
            alignItems: 'center',
            gap: 10
          }}><ActivityIndicator color={colors.primary} /><Text style={{
              color: colors.text2
            }}>Đang tải nhật ký…</Text></View> : loadError && !logs.length ? null : logs.length ? logs.map((log, index) => <TimelineRow key={log.id || index} log={log} isLast={index === logs.length - 1} onEdit={() => setEditLog(log)} />) : <EmptyState imageSource={require('../../assets/characters/mascot.png')} title="Ghi lại khoảnh khắc đầu tiên của bé" description="Chưa có hoạt động trong ngày này. Ghi lại những lần ăn, ngủ và chăm sóc bé để cùng theo dõi mỗi ngày." />}
          </View>
        </View>
      </ScrollView>

      {/* Add activity modal */}
      <FormSheet visible={modal} onClose={() => setModal(false)}>
              <Text style={{
        fontSize: 18,
        fontWeight: '900',
        color: colors.text
      }}>Thêm hoạt động</Text>
              <Text style={{
        marginTop: 4,
        color: colors.hint,
        fontSize: 12
      }}>{activityOf(form.activityType).emoji} {activityOf(form.activityType).label}</Text>
              <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 14
      }}>
                {ACTIVITIES.map(item => <Text key={item.key} onPress={() => setForm({
          ...form,
          activityType: item.key
        })} style={[styles.chip, {
          overflow: 'hidden',
          paddingVertical: 8,
          backgroundColor: form.activityType === item.key ? colors.primary : item.bg,
          color: form.activityType === item.key ? '#fff' : item.color
        }]}>
                    {item.label}
                  </Text>)}
              </View>
              {form.activityType === 'FEED' ? <>
                  <TextInput placeholderTextColor="#787078" placeholder="Bú bao nhiêu ml?" value={form.value} onChangeText={value => setForm({
          ...form,
          value
        })} keyboardType="numeric" style={styles.input} />
                  <TextInput placeholderTextColor="#787078" placeholder="Bữa này đã ăn gì?" value={form.food} onChangeText={food => setForm({
          ...form,
          food
        })} style={[styles.input, {
          marginTop: 10
        }]} />
                </> : null}
              {form.activityType === 'SLEEP' ? <TextInput placeholderTextColor="#787078" placeholder="Ngủ khoảng bao nhiêu phút?" value={form.durationMinutes} onChangeText={durationMinutes => setForm({
        ...form,
        durationMinutes
      })} keyboardType="numeric" style={styles.input} /> : null}
              <TextInput placeholderTextColor="#787078" placeholder="Ghi chú thêm" value={form.note} onChangeText={note => setForm({
        ...form,
        note
      })} style={[styles.input, {
        marginTop: 10
      }]} />
              <PrimaryButton onPress={save} style={{
        marginTop: 16
      }}>Thêm vào lịch sử</PrimaryButton>
              <Text onPress={() => setModal(false)} style={{
        textAlign: 'center',
        marginTop: 14,
        color: colors.hint,
        fontWeight: '800'
      }}>Hủy</Text>
      </FormSheet>

      {voiceActivity ? <VoiceLogModal activity={voiceActivity} babyDob={babyDob} onChangeActivity={setVoiceActivity} onClose={() => setVoiceActivity(null)} onSave={saveVoiceLog} /> : null}

      {editLog ? <EditLogModal log={editLog} onClose={() => setEditLog(null)} onSave={updateLog} onDelete={confirmDelete} /> : null}
    </View>;
}

/* ─── Metric card ─────────────────────────────────────────────────────────── */

function Metric({
  item
}) {
  return <View style={{
    width: '47%',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: item.bg,
    alignItems: 'center'
  }}>
      <Text style={{
      fontSize: 26,
      fontWeight: '900',
      color: item.color
    }}>{item.count}</Text>
      <Text style={{
      color: item.color,
      fontSize: 12,
      marginTop: 2
    }}>{item.emoji} {item.label}</Text>
    </View>;
}
function TimelineRow({
  log,
  isLast,
  onEdit
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  const activity = activityOfLog(log);
  const metadata = log.metadata || {};
  const details = [metadata.value ? `${metadata.value} ${metadata.unit || 'ml'}` : '', metadata.food ? metadata.food : '', metadata.durationMinutes ? `${metadata.durationMinutes} phút` : '', metadata.diaper_type ? diaperLabel(metadata.diaper_type) : '', metadata.note ? metadata.note : ''].filter(Boolean).join(' · ');
  return <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: colors.borderSoft
  }}>
      <View style={[styles.iconTile, {
      backgroundColor: activity.bg
    }]}>
        {activity.key === 'POOP' ? <Text style={{
        fontSize: 20
      }}>{activity.emoji}</Text> : <Ionicons name={activity.icon} size={20} color={activity.color} />}
      </View>
      <Text style={{
      width: 50,
      color: colors.text2,
      fontSize: 13,
      fontWeight: '800'
    }}>{displayTime(log.startTime)}</Text>
      <View style={{
      flex: 1,
      minWidth: 0
    }}>
        <Text style={{
        color: colors.text,
        fontSize: 14,
        fontWeight: '900'
      }}>{activity.label}</Text>
        <Text numberOfLines={2} style={{
        marginTop: 3,
        color: colors.hint,
        fontSize: 11,
        lineHeight: 16
      }}>{details || 'Đã ghi vào nhật ký'}</Text>
      </View>
      {canWrite ? <Pressable onPress={onEdit} hitSlop={8} style={{
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <Ionicons name="pencil-outline" size={14} color={colors.text2} />
      </Pressable> : null}
    </View>;
}
function EditLogModal({
  log,
  onClose,
  onSave,
  onDelete
}) {
  const metadata = log.metadata || {};
  const [activityType, setActivityType] = useState(normalizedActivityKey(log) || 'FEED');
  const activity = activityOf(activityType);
  const [form, setForm] = useState({
    value: metadata.value ? String(metadata.value) : '',
    food: metadata.food ? metadata.food : '',
    durationMinutes: metadata.durationMinutes ? String(metadata.durationMinutes) : '',
    note: metadata.note ? metadata.note : ''
  });
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    try {
      const newMetadata = {};
      let endTime = log.endTime || null;
      if (activityType === 'FEED') {
        if (form.value) {
          newMetadata.value = Number(form.value);
          newMetadata.unit = 'ml';
        }
        if (form.food) newMetadata.food = form.food;
      }
      if (activityType === 'SLEEP') {
        if (form.durationMinutes) newMetadata.durationMinutes = Number(form.durationMinutes);
        if (newMetadata.durationMinutes && log.startTime) {
          endTime = new Date(new Date(log.startTime).getTime() + newMetadata.durationMinutes * 60 * 1000).toISOString();
        }
      }
      if (activityType === 'PEE') newMetadata.diaper_type = 'WET';
      if (activityType === 'POOP') newMetadata.diaper_type = 'POOP';
      if (form.note) newMetadata.note = form.note;
      await onSave(log.id, {
        activityType,
        startTime: log.startTime,
        endTime,
        metadata: newMetadata
      });
    } finally {
      setSaving(false);
    }
  }
  return <FormSheet visible onClose={onClose}>

            {/* Header + delete */}
            <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }}>
              <View style={{
        flex: 1,
        marginRight: 12
      }}>
                <Text style={{
          fontSize: 18,
          fontWeight: '900',
          color: colors.text
        }}>Chỉnh sửa hoạt động</Text>
                <Text style={{
          marginTop: 4,
          color: colors.hint,
          fontSize: 12
        }}>
                  {activity.emoji} {activity.label} · {displayTime(log.startTime)}
                </Text>
              </View>
              <Pressable onPress={() => onDelete(log)} style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        backgroundColor: colors.dangerBg,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                <Ionicons name="trash-outline" size={17} color={colors.danger} />
              </Pressable>
            </View>

            <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14
    }}>
              {ACTIVITIES.map(item => <Pressable key={item.key} onPress={() => setActivityType(item.key)} style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: activityType === item.key ? colors.primary : item.bg
      }}>
                  <Text style={{
          color: activityType === item.key ? '#fff' : item.color,
          fontSize: 12,
          fontWeight: '900'
        }}>{item.emoji} {item.label}</Text>
                </Pressable>)}
            </View>

            {/* Fields */}
            {activityType === 'FEED' ? <>
                <TextInput placeholderTextColor="#787078" placeholder="Bú bao nhiêu ml?" value={form.value} onChangeText={value => setForm({
        ...form,
        value
      })} keyboardType="numeric" style={styles.input} />
                <TextInput placeholderTextColor="#787078" placeholder="Bữa này đã ăn gì?" value={form.food} onChangeText={food => setForm({
        ...form,
        food
      })} style={[styles.input, {
        marginTop: 10
      }]} />
              </> : null}
            {activityType === 'SLEEP' ? <TextInput placeholderTextColor="#787078" placeholder="Ngủ khoảng bao nhiêu phút?" value={form.durationMinutes} onChangeText={durationMinutes => setForm({
      ...form,
      durationMinutes
    })} keyboardType="numeric" style={styles.input} /> : null}
            <TextInput placeholderTextColor="#787078" placeholder="Ghi chú thêm" value={form.note} onChangeText={note => setForm({
      ...form,
      note
    })} style={[styles.input, {
      marginTop: 10
    }]} />

            <PrimaryButton loading={saving} onPress={handleSave} style={{
      marginTop: 16
    }}>Lưu thay đổi</PrimaryButton>
            <Text onPress={onClose} style={{
      textAlign: 'center',
      marginTop: 14,
      color: colors.hint,
      fontWeight: '800'
    }}>Hủy</Text>
    </FormSheet>;
}

/* ─── VoiceLogModal ───────────────────────────────────────────────────────── */

function VoiceLogModal({
  activity,
  babyDob,
  onChangeActivity,
  onClose,
  onSave
}) {
  const [text, setText] = useState('');
  const textRef = useRef('');
  const [listening, setListening] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('Đang chuẩn bị micro...');
  const [speechServices, setSpeechServices] = useState([]);
  const voiceTransition = useRef(false);
  const [saving, setSaving] = useState(false);
  const ageMonths = getAgeInMonths(babyDob);
  const defaultMl = getDefaultMilkMl(ageMonths);
  const defaultSleep = getDefaultSleepMinutes(ageMonths);
  const example = activity.key === 'FEED' ? `Ví dụ: bé bú ${defaultMl} ml, hoặc ăn cháo gà...` : activity.key === 'SLEEP' ? `Ví dụ: bé ngủ ${defaultSleep} phút, hoặc ngủ 2 tiếng...` : `Ví dụ: bé vừa ${activity.label.toLowerCase()}...`;
  function updateTranscript(value) {
    textRef.current = value;
    setText(value);
  }
  const hasNativeVoiceModule = Boolean((NativeModules?.Voice || NativeModules?.RCTVoice) && Voice?.isAvailable && Voice?.start);
  useEffect(() => {
    let mounted = true;
    async function prepareVoice() {
      try {
        if (!hasNativeVoiceModule) {
          setReady(false);
          setMessage('Bản ứng dụng này chưa kết nối được bộ nhận dạng giọng nói. Vui lòng cập nhật Bediary lên bản mới nhất.');
          return;
        }
        if (Platform.OS === 'android') {
          const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
            title: 'Cho phép Bediary dùng micro',
            message: 'Bediary cần thu âm giọng nói để nhập nhanh nhật ký chăm sóc bé.',
            buttonPositive: 'Cho phép',
            buttonNegative: 'Từ chối'
          });
          if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            if (!mounted) return;
            setReady(false);
            setMessage('Bạn chưa cấp quyền micro. Hãy cấp quyền trong cài đặt thiết bị để nhập nhật ký bằng giọng nói.');
            return;
          }
        }
        const available = await Voice.isAvailable();
        let services = [];
        if (Platform.OS === 'android' && Voice.getSpeechRecognitionServices) {
          services = await Voice.getSpeechRecognitionServices();
          if (mounted) setSpeechServices(Array.isArray(services) ? services : []);
        }
        if (!mounted) return;
        if (!available) {
          setReady(false);
          setMessage('Thiết bị chưa có dịch vụ nhận dạng giọng nói. Hãy cài/cập nhật Google app hoặc thử trên thiết bị thật khác.');
          return;
        }
        setReady(true);
        setMessage('Sẵn sàng nghe. Bấm nút micro rồi nói nội dung nhật ký.');
      } catch (error) {
        console.warn('Voice prepare failed', error);
        if (!mounted) return;
        setReady(false);
        setMessage('Chưa thể khởi tạo nhận dạng giọng nói. Nếu đang dùng Expo Go, hãy chạy bằng development build.');
      }
    }
    if (hasNativeVoiceModule) {
      Voice.onSpeechStart = () => {
        setListening(true);
        setMessage('Đang nghe...');
      };
      Voice.onSpeechEnd = () => {
        setListening(false);
        setMessage(current => textRef.current.trim() ? current : 'Đã dừng nghe. Nếu chưa thấy nội dung, hãy thử nói lại gần micro hơn.');
      };
      Voice.onSpeechPartialResults = event => {
        const transcript = event.value?.[0] || '';
        if (transcript) updateTranscript(transcript);
      };
      Voice.onSpeechResults = event => {
        const transcript = event.value?.[0] || event.value?.join(' ') || '';
        if (transcript) {
          updateTranscript(transcript);
          setMessage('Đã nhận giọng nói. Kiểm tra nội dung rồi lưu nhật ký.');
        }
        setListening(false);
      };
      Voice.onSpeechError = event => {
        console.warn('Voice recognition error', event.error || event);
        setListening(false);
        const errorCode = String(event.error?.code);
        if (errorCode === '7' || errorCode === '11') {
          setMessage('Chưa nghe rõ nội dung. Hãy bấm micro và nói lại ngắn gọn hơn.');
        } else {
          setMessage(event.error?.message || 'Nhận dạng giọng nói bị lỗi. Hãy thử lại.');
        }
      };
    }
    prepareVoice();
    return () => {
      mounted = false;
      if (hasNativeVoiceModule) {
        Voice.destroy().catch(() => {}).finally(() => Voice.removeAllListeners());
      }
    };
  }, [hasNativeVoiceModule]);
  async function toggleListening() {
    if (saving || voiceTransition.current) return;
    if (!ready) {
      Alert.alert('Chưa thể bật micro', message || 'Đang kiểm tra dịch vụ nhận dạng giọng nói. Vui lòng thử lại.');
      return;
    }
    if (!hasNativeVoiceModule) {
      setMessage('App hiện tại chưa được build kèm module nhận giọng nói. Hãy chạy lại bằng `npx expo run:android`.');
      return;
    }
    voiceTransition.current = true;
    try {
      if (listening) {
        await Voice.stop();
        setListening(false);
      } else {
        setMessage('Đang nghe...');
        const hasGoogleRecognizer = speechServices.some(service => String(service).includes('googlequicksearchbox'));
        await Voice.start('vi-VN', {
          EXTRA_LANGUAGE: 'vi-VN',
          EXTRA_LANGUAGE_PREFERENCE: 'vi-VN',
          REQUEST_PERMISSIONS_AUTO: false,
          ...(hasGoogleRecognizer ? { RECOGNIZER_ENGINE: 'GOOGLE' } : {})
        });
      }
    } catch (error) {
      console.warn('Voice start/stop failed', error);
      setListening(false);
      setMessage('Không bật được nhận dạng giọng nói. Kiểm tra quyền micro, kết nối Internet và dịch vụ nhận dạng giọng nói trên điện thoại.');
    } finally {
      voiceTransition.current = false;
    }
  }
  async function submit() {
    if (saving || listening) return;
    if (!text.trim()) {
      Alert.alert('Chưa có nội dung', 'Hãy bấm micro và nói nội dung nhật ký trước khi lưu.');
      return;
    }
    try {
      setSaving(true);
      if (listening && hasNativeVoiceModule) await Voice.stop();
      await onSave(buildVoicePayload(activity, text, babyDob));
    } finally {
      setSaving(false);
    }
  }
  async function closeModal() {
    try {
      if (listening && hasNativeVoiceModule) await Voice.stop();
    } catch {}
    onClose();
  }
  return <FormSheet visible onClose={closeModal}>

            {/* Header */}
            <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }}>
              <View>
                <Text style={{
          fontSize: 18,
          fontWeight: '900',
          color: colors.text
        }}>Ghi bằng giọng nói</Text>
                <Text style={{
          marginTop: 4,
          color: colors.hint,
          fontSize: 12
        }}>{activity.emoji} {activity.label}</Text>
              </View>
              <Pressable onPress={closeModal} style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceSoft,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                <Ionicons name="close" size={18} color={colors.text2} />
              </Pressable>
            </View>

            {/* Activity selector */}
            <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14
    }}>
              {ACTIVITIES.map(item => <Pressable key={item.key} onPress={() => onChangeActivity(item)} style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: activity.key === item.key ? colors.primary : item.bg
      }}>
                  <Text style={{
          color: activity.key === item.key ? '#fff' : item.color,
          fontSize: 12,
          fontWeight: '900'
        }}>{item.emoji} {item.label}</Text>
                </Pressable>)}
            </View>

            <View style={{
      borderRadius: 22,
      backgroundColor: listening ? '#FFF0F6' : colors.primaryPale,
      borderWidth: 1,
      borderColor: listening ? colors.primary : '#FFD6E4',
      padding: 16,
      marginBottom: 12,
      alignItems: 'center'
    }}>
              <Pressable onPress={toggleListening} disabled={saving} style={{
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: listening ? colors.primary : ready ? colors.primary : '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: listening ? 0.28 : 0.12,
        shadowRadius: 16,
        elevation: listening ? 5 : 2,
        opacity: ready ? 1 : 0.75
      }}>
                <Ionicons name={listening ? 'stop' : 'mic'} size={30} color="#fff" />
              </Pressable>
              <Text style={{
        marginTop: 12,
        color: colors.text,
        fontSize: 14,
        fontWeight: '900'
      }}>
                {listening ? 'Đang nghe giọng nói' : ready ? 'Bấm để bắt đầu nói' : 'Micro chưa sẵn sàng'}
              </Text>
              <Text style={{
        marginTop: 5,
        color: colors.text2,
        fontSize: 11,
        lineHeight: 16,
        textAlign: 'center'
      }}>
                {message}
              </Text>
              {Platform.OS === 'android' ? <Text style={{
        marginTop: 6,
        color: colors.hint,
        fontSize: 10,
        lineHeight: 14,
        textAlign: 'center'
      }}>
                  Speech service: {speechServices.length ? speechServices.join(', ') : 'chưa phát hiện'}
                </Text> : null}
            </View>

            <View style={{
      borderRadius: 16,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      minHeight: 94,
      marginBottom: 12
    }}>
              <Text style={{
        color: colors.hint,
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 6
      }}>Nội dung nghe được</Text>
              <TextInput placeholderTextColor="#787078" accessibilityLabel="Nội dung nhật ký" value={text} onChangeText={updateTranscript} editable={!listening && !saving} multiline placeholder={example} style={{
        color: colors.text,
        fontSize: 14,
        lineHeight: 21,
        minHeight: 80,
        textAlignVertical: 'top'
      }} />
              <Text style={{
        color: colors.text2,
        fontSize: 11,
        lineHeight: 17,
        marginTop: 8
      }}>Có thể nhập hoặc sửa nội dung tại đây. Chọn đúng loại hoạt động phía trên; số lượng cần kèm đơn vị ml, phút hoặc tiếng. Nội dung gốc sẽ được giữ trong ghi chú.</Text>
            </View>

            <View style={{
      borderRadius: 14,
      backgroundColor: '#FFFDF7',
      borderWidth: 1,
      borderColor: '#FFE7B5',
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      gap: 10
    }}>
              <Ionicons name="bulb-outline" size={16} color={colors.warning} />
              <View style={{
        flex: 1
      }}>
                <Text style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: '900'
        }}>Mẹo nói nhanh</Text>
                <Text style={{
          marginTop: 3,
          color: colors.text2,
          fontSize: 11,
          lineHeight: 16
        }}>
                  Nói ngắn như “bé bú {defaultMl} ml”, “bé ngủ {defaultSleep} phút”, “bé đi tiểu” để app tự phân loại.
                </Text>
              </View>
            </View>

            <PrimaryButton disabled={!text.trim() || listening} loading={saving} onPress={submit} style={{
      marginTop: 14
    }}>Lưu nhật ký</PrimaryButton>
            <Text onPress={closeModal} style={{
      textAlign: 'center',
      marginTop: 14,
      color: colors.hint,
      fontWeight: '800'
    }}>Hủy</Text>
    </FormSheet>;
}
