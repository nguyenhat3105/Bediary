import BirthDatePicker from '../components/BirthDatePicker';
import { useAuth } from "../utils/auth";
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import FormSheet from '../components/FormSheet';
import { AppAlert as Alert } from '../utils/appAlert';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { dashboardApi, vaccinationApi } from '../api/api';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import { formatDate, listFromResponse } from '../utils/format';
export const VACCINE_SCHEDULE = [{
  key: 'hep-b-birth',
  name: 'Viêm gan B',
  doseNumber: 0,
  ageLabel: 'Sơ sinh',
  months: 0,
  category: 'REQUIRED',
  notes: 'Tiêm trong 24 giờ đầu sau sinh.'
}, {
  key: 'bcg-birth',
  name: 'BCG',
  doseNumber: 1,
  ageLabel: 'Sơ sinh',
  months: 0,
  category: 'REQUIRED',
  notes: 'Phòng bệnh lao.'
}, {
  key: 'rsv-birth',
  name: 'RSV Beyfortus',
  doseNumber: 1,
  ageLabel: '0-6 tháng',
  months: 0,
  category: 'OPTIONAL',
  notes: 'Kháng thể đơn dòng RSV, ưu tiên 6 tháng đầu đời.'
}, {
  key: 'dpt-hib-polio-hepb-1',
  name: '6 trong 1 / 5 trong 1',
  doseNumber: 1,
  ageLabel: '2 tháng',
  months: 2,
  category: 'REQUIRED',
  notes: 'Bạch hầu, ho gà, uốn ván, bại liệt, Hib, viêm gan B tùy loại.'
}, {
  key: 'rota-1',
  name: 'Rotavirus',
  doseNumber: 1,
  ageLabel: '2 tháng',
  months: 2,
  category: 'OPTIONAL',
  notes: 'Uống phòng tiêu chảy cấp do Rotavirus.'
}, {
  key: 'pneumo-1',
  name: 'Phế cầu',
  doseNumber: 1,
  ageLabel: '2 tháng',
  months: 2,
  category: 'OPTIONAL',
  notes: 'Phòng viêm phổi, viêm tai giữa, viêm màng não do phế cầu.'
}, {
  key: 'mening-acwy-1',
  name: 'Não mô cầu ACYW-135',
  doseNumber: 1,
  ageLabel: '2 tháng',
  months: 2,
  category: 'OPTIONAL',
  notes: 'Nimenrix/MenQuadfi theo tư vấn bác sĩ.'
}, {
  key: 'mening-b-1',
  name: 'Não mô cầu B',
  doseNumber: 1,
  ageLabel: '2 tháng',
  months: 2,
  category: 'OPTIONAL',
  notes: 'Bexsero mũi 1.'
}, {
  key: 'dpt-hib-polio-hepb-2',
  name: '6 trong 1 / 5 trong 1',
  doseNumber: 2,
  ageLabel: '3 tháng',
  months: 3,
  category: 'REQUIRED',
  notes: 'Mũi 2.'
}, {
  key: 'rota-2',
  name: 'Rotavirus',
  doseNumber: 2,
  ageLabel: '3 tháng',
  months: 3,
  category: 'OPTIONAL',
  notes: 'Liều 2.'
}, {
  key: 'pneumo-2',
  name: 'Phế cầu',
  doseNumber: 2,
  ageLabel: '3 tháng',
  months: 3,
  category: 'OPTIONAL',
  notes: 'Mũi 2.'
}, {
  key: 'dpt-hib-polio-hepb-3',
  name: '6 trong 1 / 5 trong 1',
  doseNumber: 3,
  ageLabel: '4 tháng',
  months: 4,
  category: 'REQUIRED',
  notes: 'Mũi 3.'
}, {
  key: 'rota-3',
  name: 'Rotavirus',
  doseNumber: 3,
  ageLabel: '4 tháng',
  months: 4,
  category: 'OPTIONAL',
  notes: 'Liều 3 nếu loại vắc xin cần 3 liều.'
}, {
  key: 'pneumo-3',
  name: 'Phế cầu',
  doseNumber: 3,
  ageLabel: '4 tháng',
  months: 4,
  category: 'OPTIONAL',
  notes: 'Mũi 3.'
}, {
  key: 'mening-b-2',
  name: 'Não mô cầu B',
  doseNumber: 2,
  ageLabel: '4 tháng',
  months: 4,
  category: 'OPTIONAL',
  notes: 'Bexsero mũi 2.'
}, {
  key: 'mening-acwy-2',
  name: 'Não mô cầu ACYW-135',
  doseNumber: 2,
  ageLabel: '4 tháng',
  months: 4,
  category: 'OPTIONAL',
  notes: 'Nimenrix/MenQuadfi mũi 2.'
}, {
  key: 'flu-1',
  name: 'Cúm mùa',
  doseNumber: 1,
  ageLabel: '6 tháng',
  months: 6,
  category: 'OPTIONAL',
  notes: 'Từ 6 tháng, nhắc hằng năm.'
}, {
  key: 'mening-bc-1',
  name: 'Não mô cầu B+C',
  doseNumber: 1,
  ageLabel: '6 tháng',
  months: 6,
  category: 'OPTIONAL',
  notes: 'VA-MENGOC-BC nếu chưa tiêm Bexsero.'
}, {
  key: 'measles-1',
  name: 'Sởi / MMR sớm',
  doseNumber: 1,
  ageLabel: '9 tháng',
  months: 9,
  category: 'REQUIRED',
  notes: 'Sởi đơn hoặc Priorix theo tư vấn.'
}, {
  key: 'varicella-1',
  name: 'Thủy đậu',
  doseNumber: 1,
  ageLabel: '9-12 tháng',
  months: 9,
  category: 'OPTIONAL',
  notes: 'Tùy loại vắc xin.'
}, {
  key: 'je-1',
  name: 'Viêm não Nhật Bản',
  doseNumber: 1,
  ageLabel: '9-12 tháng',
  months: 9,
  category: 'REQUIRED',
  notes: 'Imojev hoặc Jevax theo phác đồ.'
}, {
  key: 'mmr-1',
  name: 'MMR',
  doseNumber: 1,
  ageLabel: '12 tháng',
  months: 12,
  category: 'REQUIRED',
  notes: 'Sởi - Quai bị - Rubella.'
}, {
  key: 'proquad-1',
  name: 'MMR + Thủy đậu',
  doseNumber: 1,
  ageLabel: '12 tháng',
  months: 12,
  category: 'OPTIONAL',
  notes: 'ProQuad theo tư vấn bác sĩ.'
}, {
  key: 'hep-a-1',
  name: 'Viêm gan A',
  doseNumber: 1,
  ageLabel: '12 tháng',
  months: 12,
  category: 'OPTIONAL',
  notes: 'Mũi 1, nhắc sau 6-18 tháng.'
}, {
  key: 'pneumo-4',
  name: 'Phế cầu',
  doseNumber: 4,
  ageLabel: '12 tháng',
  months: 12,
  category: 'OPTIONAL',
  notes: 'Mũi nhắc.'
}, {
  key: 'mening-b-3',
  name: 'Não mô cầu B',
  doseNumber: 3,
  ageLabel: '12 tháng',
  months: 12,
  category: 'OPTIONAL',
  notes: 'Bexsero mũi 3.'
}, {
  key: 'dpt-hib-polio-hepb-4',
  name: '6 trong 1 / 5 trong 1',
  doseNumber: 4,
  ageLabel: '15-24 tháng',
  months: 18,
  category: 'REQUIRED',
  notes: 'Mũi nhắc.'
}, {
  key: 'mmr-2',
  name: 'MMR',
  doseNumber: 2,
  ageLabel: '15-24 tháng',
  months: 18,
  category: 'REQUIRED',
  notes: 'Mũi 2.'
}, {
  key: 'hep-a-2',
  name: 'Viêm gan A',
  doseNumber: 2,
  ageLabel: '18 tháng',
  months: 18,
  category: 'OPTIONAL',
  notes: 'Mũi 2.'
}, {
  key: 'flu-yearly',
  name: 'Cúm mùa',
  doseNumber: 2,
  ageLabel: 'Hằng năm',
  months: 18,
  category: 'OPTIONAL',
  notes: 'Tiêm nhắc 1 mũi mỗi năm.'
}, {
  key: 'je-3',
  name: 'Viêm não Nhật Bản',
  doseNumber: 3,
  ageLabel: '24 tháng',
  months: 24,
  category: 'REQUIRED',
  notes: 'Jevax mũi 3 hoặc Imojev mũi 2 tùy phác đồ.'
}, {
  key: 'typhoid-1',
  name: 'Thương hàn',
  doseNumber: 1,
  ageLabel: '24 tháng',
  months: 24,
  category: 'OPTIONAL',
  notes: 'Nhắc mỗi 3 năm.'
}, {
  key: 'cholera-1',
  name: 'Tả',
  doseNumber: 1,
  ageLabel: '24 tháng',
  months: 24,
  category: 'OPTIONAL',
  notes: 'Uống 2 liều cách nhau tối thiểu 2 tuần.'
}, {
  key: 'dengue-1',
  name: 'Sốt xuất huyết',
  doseNumber: 1,
  ageLabel: '4 tuổi',
  months: 48,
  category: 'OPTIONAL',
  notes: 'Qdenga mũi 1, mũi 2 sau 3 tháng.'
}, {
  key: 'mmr-3',
  name: 'MMR / Priorix',
  doseNumber: 3,
  ageLabel: '4 tuổi',
  months: 48,
  category: 'OPTIONAL',
  notes: 'Mũi khuyến cáo.'
}, {
  key: 'je-booster',
  name: 'Viêm não Nhật Bản',
  doseNumber: 4,
  ageLabel: '5 tuổi',
  months: 60,
  category: 'REQUIRED',
  notes: 'Mũi nhắc.'
}];
function statusLabel(status) {
  return {
    SCHEDULED: 'Đang hẹn',
    COMPLETED: 'Đã tiêm',
    POSTPONED: 'Đã hoãn',
    SKIPPED: 'Bỏ qua',
    CANCELLED: 'Đã hủy'
  }[status || 'SCHEDULED'] || 'Đang hẹn';
}
function categoryLabel(category) {
  return category === 'REQUIRED' ? 'Bắt buộc' : 'Không bắt buộc';
}
function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}
function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
function toDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}
export default function VaccinationScreen() {
  const toggling = useRef(false);
  const canWrite = ["ADMIN", "PARENT"].includes(useAuth().user?.role);
  const [records, setRecords] = useState([]);
  const [babyDob, setBabyDob] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('schedule');
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    vaccineName: '',
    doseNumber: '1',
    scheduledDate: '',
    ageLabel: '',
    category: 'OPTIONAL',
    status: 'SCHEDULED',
    notes: ''
  });
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [vaccinationRes, dashboardRes] = await Promise.allSettled([vaccinationApi.list(), dashboardApi.get()]);
      if (vaccinationRes.status === 'fulfilled') setRecords(listFromResponse(vaccinationRes.value));
      if (dashboardRes.status === 'fulfilled') setBabyDob(dashboardRes.value?.data?.babyDob || null);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    load();
  }, [load]));
  const recordByKey = useMemo(() => {
    const map = new Map();
    records.forEach(record => {
      if (record.scheduleKey) map.set(record.scheduleKey, record);
    });
    return map;
  }, [records]);
  const schedule = useMemo(() => {
    const dob = babyDob ? new Date(babyDob) : new Date();
    return VACCINE_SCHEDULE.map(item => {
      const record = recordByKey.get(item.key);
      const scheduledDate = record?.scheduledDate || toDateInput(addMonths(dob, item.months));
      return {
        ...item,
        record,
        vaccineName: record?.vaccineName || item.name,
        scheduledDate,
        originalScheduledDate: record?.originalScheduledDate || scheduledDate,
        completedAt: record?.completedAt,
        status: record?.completedAt ? 'COMPLETED' : record?.status || 'SCHEDULED',
        notes: record?.notes || item.notes,
        source: record?.source || 'SYSTEM',
        daysLeft: daysUntil(scheduledDate)
      };
    });
  }, [babyDob, recordByKey]);
  const scheduled = useMemo(() => schedule.filter(record => filter === 'ALL' || record.category === filter).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)), [schedule, filter]);
  const custom = useMemo(() => records.filter(record => record.source === 'CUSTOM' || !record.scheduleKey), [records]);
  const done = useMemo(() => [...schedule.filter(record => record.completedAt), ...custom.filter(record => record.completedAt)].sort((a, b) => new Date(b.completedAt || b.scheduledDate) - new Date(a.completedAt || a.scheduledDate)), [custom, schedule]);
  const upcoming = useMemo(() => [...schedule.filter(record => !record.completedAt && (record.status || 'SCHEDULED') === 'SCHEDULED'), ...custom.filter(record => !record.completedAt && (record.status || 'SCHEDULED') === 'SCHEDULED')].map(record => ({
    ...record,
    daysLeft: daysUntil(record.scheduledDate)
  })).filter(record => record.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0], [custom, schedule]);
  const upcomingDays = upcoming ? daysUntil(upcoming.scheduledDate) : null;
  function openCustom() {
    setEditing(null);
    setForm({
      vaccineName: '',
      doseNumber: '1',
      scheduledDate: '',
      ageLabel: '',
      category: 'OPTIONAL',
      status: 'SCHEDULED',
      notes: ''
    });
    setModal(true);
  }
  async function ensureRecord(item) {
    if (item.id) return item;
    if (item.record) return item.record;
    const response = await vaccinationApi.create({
      scheduleKey: item.key,
      vaccineName: item.name || item.vaccineName,
      doseNumber: item.doseNumber,
      scheduledDate: item.scheduledDate,
      originalScheduledDate: item.originalScheduledDate || item.scheduledDate,
      ageLabel: item.ageLabel,
      category: item.category,
      source: item.source || 'SYSTEM',
      status: item.status || 'SCHEDULED',
      notes: item.notes
    });
    return response.data;
  }
  async function openEdit(record) {
    try {
      const saved = await ensureRecord(record);
      setEditing(saved);
      setForm({
        vaccineName: saved.vaccineName || record.vaccineName || record.name || '',
        doseNumber: String(saved.doseNumber ?? record.doseNumber ?? 1),
        scheduledDate: saved.scheduledDate || record.scheduledDate || '',
        ageLabel: saved.ageLabel || record.ageLabel || '',
        category: saved.category || record.category || 'OPTIONAL',
        status: saved.status || (saved.completedAt ? 'COMPLETED' : 'SCHEDULED'),
        notes: saved.notes || record.notes || ''
      });
      setModal(true);
    } catch (error) {
      Alert.alert('Không thể mở chỉnh lịch', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  async function saveCustom() {
    if (!form.vaccineName || !form.scheduledDate) {
      Alert.alert('Thiếu thông tin', 'Nhập tên vaccine và ngày hẹn.');
      return;
    }
    const payload = {
      vaccineName: form.vaccineName.trim(),
      doseNumber: Number(form.doseNumber) || 1,
      scheduledDate: form.scheduledDate,
      originalScheduledDate: editing?.originalScheduledDate || editing?.scheduledDate || form.scheduledDate,
      ageLabel: form.ageLabel,
      category: form.category,
      scheduleKey: editing?.scheduleKey || '',
      source: editing?.source || 'CUSTOM',
      status: form.status,
      notes: form.notes
    };
    try {
      if (editing?.id) await vaccinationApi.update(editing.id, payload);else await vaccinationApi.create(payload);
      setModal(false);
      await load();
    } catch (error) {
      Alert.alert('Không thể lưu mũi tiêm', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  async function toggleComplete(record) {
    if (!canWrite || toggling.current) return;
    toggling.current = true;
    try {
      const saved = await ensureRecord(record);
      if (saved.completedAt || record.completedAt) await vaccinationApi.uncomplete(saved.id);else await vaccinationApi.complete(saved.id);
      await load();
    } catch (error) {
      Alert.alert('Không thể cập nhật', error.response?.data?.message || 'Thử lại sau nhé.');
    } finally {
      toggling.current = false;
    }
  }
  function confirmDelete() {
    if (!editing?.id) return;
    Alert.alert('Xóa mũi tiêm?', 'Lịch tiêm này sẽ bị xóa khỏi dữ liệu đã lưu. Với mũi chuẩn, lịch mặc định vẫn có thể hiện lại theo ngày sinh của bé.', [{
      text: 'Hủy',
      style: 'cancel'
    }, {
      text: 'Xóa',
      style: 'destructive',
      onPress: async () => {
        try {
          await vaccinationApi.delete(editing.id);
          setModal(false);
          await load();
        } catch (error) {
          Alert.alert('Không thể xóa', error.response?.data?.message || 'Thử lại sau nhé.');
        }
      }
    }]);
  }
  return <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}>
        <View style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        padding: 16,
        borderRadius: 22,
        backgroundColor: '#FFF3F6',
        marginBottom: 20
      }}>
          <View style={{ flex: 1 }}>
          <Text style={{
          color: colors.text,
          fontSize: 22,
          fontWeight: '900'
        }}>Tiêm chủng</Text>
          <Text style={{ marginTop: 8, color: colors.text2, fontSize: 13, lineHeight: 20 }}>Theo dõi lịch tiêm, cùng bé lớn lên khỏe mạnh.</Text>
          </View>
          <Image source={require('../../assets/characters/doctor-vaccination.png')} resizeMode="contain" accessible={false} style={{ width: 46, height: 120 }} />
        </View>

        <View style={{
        flexDirection: 'row',
        backgroundColor: '#FFF3F6',
        borderRadius: 22,
        gap: 4,
        padding: 4,
        marginBottom: 18
      }}>
          <TabButton label="Lịch tiêm" active={tab === 'schedule'} onPress={() => setTab('schedule')} />
          <TabButton label="Đã tiêm" active={tab === 'done'} onPress={() => setTab('done')} />
        </View>

        {tab === 'schedule' ? <>
            <View style={{
          borderRadius: 20,
          padding: 18,
          marginBottom: 20,
          backgroundColor: '#FFF0F4',
          borderWidth: 1,
          borderColor: '#FFE0E8',
          position: 'relative',
          overflow: 'hidden'
        }}>
              <View style={{
            maxWidth: '70%'
          }}>
                <Text style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '900'
            }}>Sắp tới</Text>
                {upcoming ? <>
                    <Text style={{
                marginTop: 14,
                color: colors.text,
                fontWeight: '900'
              }}>{upcoming.vaccineName} {upcoming.doseNumber ? `(Mũi ${upcoming.doseNumber})` : ''}</Text>
                    <Text style={{
                marginTop: 6,
                color: colors.text2,
                fontSize: 13
              }}>Ngày tiêm: <Text style={{
                  fontWeight: '900'
                }}>{formatDate(upcoming.scheduledDate)}</Text></Text>
                    <Text style={{
                marginTop: 8,
                color: upcomingDays <= 3 ? colors.primaryDark : colors.text2,
                fontSize: 13,
                fontWeight: '900'
              }}>
                      {upcomingDays === 0 ? 'Đến lịch hôm nay' : upcomingDays > 0 ? `Còn ${upcomingDays} ngày nữa` : 'Đã quá lịch'}
                    </Text>
                    {canWrite ? <Pressable onPress={() => openEdit(upcoming)} style={{
                alignSelf: 'flex-start',
                marginTop: 14,
                height: 36,
                borderRadius: 14,
                paddingHorizontal: 14,
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6
              }}>
                      <Ionicons name="pencil-outline" size={15} color="#fff" />
                      <Text style={{
                  color: '#fff',
                  fontWeight: '900'
                }}>Điều chỉnh</Text>
                    </Pressable> : null}
                  </> : <Text style={{
              marginTop: 12,
              color: colors.text2
            }}>Không còn mũi tiêm sắp tới.</Text>}
              </View>
              <View style={{
            position: 'absolute',
            right: 18,
            top: 34,
            width: 86,
            height: 86,
            borderRadius: 24,
            backgroundColor: '#FFDCE7',
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{
              rotate: '-8deg'
            }]
          }}>
                <MaterialCommunityIcons name="needle" size={42} color={colors.primary} />
              </View>
            </View>

            {canWrite ? <Pressable onPress={openCustom} style={{
          height: 44,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: '#FFADC1',
          borderRadius: 16,
          backgroundColor: '#FFF8FA',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16
        }}>
              <Ionicons name="add" size={17} color={colors.primaryDark} />
              <Text style={{
            color: colors.primaryDark,
            fontWeight: '900'
          }}>Thêm mũi tiêm riêng</Text>
            </Pressable> : null}

            <Text style={[styles.sectionTitle, {
          marginBottom: 12
        }]}>Lịch tiêm theo độ tuổi</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
          gap: 8,
          paddingBottom: 12
        }}>
              {[['ALL', 'Tất cả'], ['REQUIRED', 'Bắt buộc'], ['OPTIONAL', 'Không bắt buộc']].map(([value, label]) => <Pressable key={value} onPress={() => setFilter(value)} style={{
            borderWidth: 1,
            borderColor: '#FFE0E8',
            borderRadius: 999,
            backgroundColor: filter === value ? colors.primary : '#fff',
            paddingHorizontal: 12,
            paddingVertical: 8
          }}>
                  <Text style={{
              color: filter === value ? '#fff' : colors.text2,
              fontSize: 12,
              fontWeight: '900'
            }}>{label}</Text>
                </Pressable>)}
            </ScrollView>
            <View style={[styles.card, {
          padding: 0,
          overflow: 'hidden'
        }]}>
              {scheduled.length ? scheduled.map((record, index) => <VaccineRow key={record.id || record.key} record={record} isLast={index === scheduled.length - 1} onEdit={() => openEdit(record)} onToggle={() => toggleComplete(record)} />) : <EmptyState icon="💉" title="Chưa có lịch sắp tới" description="Thêm mũi riêng hoặc đồng bộ lịch chuẩn từ web." />}
            </View>

            <Text style={[styles.sectionTitle, {
          marginTop: 20,
          marginBottom: 12
        }]}>Mũi tiêm riêng ({custom.length})</Text>
            <View style={[styles.card, {
          padding: 0,
          overflow: 'hidden'
        }]}>
              {custom.length ? custom.map((record, index) => <VaccineRow key={record.id} record={record} isLast={index === custom.length - 1} onEdit={() => openEdit(record)} onToggle={() => toggleComplete(record)} />) : <Text style={{
            padding: 16,
            color: colors.hint
          }}>Chưa có mũi tiêm riêng do ba mẹ tự thêm.</Text>}
            </View>
          </> : <>
            <Text style={[styles.sectionTitle, {
          marginBottom: 12
        }]}>Đã tiêm ({done.length})</Text>
            <View style={[styles.card, {
          padding: 0,
          overflow: 'hidden'
        }]}>
              {done.length ? done.map((record, index) => <VaccineRow key={record.id || record.key} record={record} isLast={index === done.length - 1} onEdit={() => openEdit(record)} onToggle={() => toggleComplete(record)} />) : <EmptyState icon="✅" title="Chưa có mũi nào được đánh dấu đã tiêm" description="Quay lại tab Lịch tiêm để tích mũi đã hoàn thành." />}
            </View>
          </>}
      </ScrollView>

      <FormSheet visible={canWrite && modal} onClose={() => setModal(false)}>
            <Text style={{
        fontSize: 18,
        fontWeight: '900',
        color: colors.text
      }}>{editing ? 'Điều chỉnh lịch tiêm' : 'Thêm mũi tiêm riêng'}</Text>
            <TextInput placeholderTextColor="#787078" placeholder="Tên vaccine" value={form.vaccineName} onChangeText={vaccineName => setForm({
        ...form,
        vaccineName
      })} style={[styles.input, {
        marginTop: 14
      }]} />
            <View style={{
        flexDirection: 'row',
        gap: 10,
        marginTop: 10
      }}>
              <TextInput placeholderTextColor="#787078" placeholder="Mũi số" keyboardType="numeric" value={form.doseNumber} onChangeText={doseNumber => setForm({
          ...form,
          doseNumber
        })} style={[styles.input, {
          flex: 1
        }]} />
              <TextInput placeholderTextColor="#787078" placeholder="Mốc tuổi" value={form.ageLabel} onChangeText={ageLabel => setForm({
          ...form,
          ageLabel
        })} style={[styles.input, {
          flex: 1
        }]} />
            </View>
            <BirthDatePicker title="Ngày hẹn tiêm" allowFuture value={form.scheduledDate} onChange={scheduledDate => setForm({ ...form, scheduledDate })} />
            <View style={{
        flexDirection: 'row',
        gap: 8,
        marginTop: 10
      }}>
              {['OPTIONAL', 'REQUIRED'].map(category => <Text key={category} onPress={() => setForm({
          ...form,
          category
        })} style={[styles.chip, {
          flex: 1,
          textAlign: 'center',
          overflow: 'hidden',
          paddingVertical: 9,
          backgroundColor: form.category === category ? colors.primary : colors.primaryLight,
          color: form.category === category ? '#fff' : colors.primary
        }]}>
                  {categoryLabel(category)}
                </Text>)}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
        gap: 8,
        paddingTop: 10
      }}>
              {['SCHEDULED', 'POSTPONED', 'SKIPPED', 'CANCELLED'].map(status => <Pressable key={status} onPress={() => setForm({
          ...form,
          status
        })} style={{
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: form.status === status ? colors.primary : colors.primaryPale,
          borderWidth: 1,
          borderColor: form.status === status ? colors.primary : '#FFD6E4'
        }}>
                  <Text style={{
            color: form.status === status ? '#fff' : colors.primary,
            fontSize: 12,
            fontWeight: '900'
          }}>{statusLabel(status)}</Text>
                </Pressable>)}
            </ScrollView>
            <TextInput placeholderTextColor="#787078" placeholder="Ghi chú bác sĩ/lý do điều chỉnh" value={form.notes} onChangeText={notes => setForm({
        ...form,
        notes
      })} style={[styles.input, {
        marginTop: 10
      }]} />
            <PrimaryButton onPress={saveCustom} style={{
        marginTop: 16
      }}>Lưu lịch tiêm</PrimaryButton>
            {editing?.id ? <Pressable onPress={confirmDelete} style={{
        marginTop: 10,
        height: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#FCA5A5',
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
                <Text style={{
          color: '#DC2626',
          fontWeight: '900'
        }}>Xóa lịch đã lưu</Text>
              </Pressable> : null}
            <Text onPress={() => setModal(false)} style={{
        textAlign: 'center',
        marginTop: 14,
        color: colors.hint,
        fontWeight: '800'
      }}>Hủy</Text>
      </FormSheet>
    </View>;
}
function TabButton({
  label,
  active,
  onPress
}) {
  return <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{
    flex: 1,
    height: 44,
    borderRadius: 18,
    backgroundColor: active ? colors.primary : 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: active ? 0.14 : 0,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8
    },
    elevation: active ? 2 : 0
  }}>
      <Text style={{
      color: active ? '#fff' : colors.text2,
      fontWeight: '900'
    }}>{label}</Text>
    </Pressable>;
}
function VaccineRow({
  record,
  isLast,
  onEdit,
  onToggle
}) {
  const canWrite = ["ADMIN", "PARENT"].includes(useAuth().user?.role);
  const custom = record.source === 'CUSTOM' || !record.scheduleKey;
  const done = Boolean(record.completedAt);
  const adjusted = record.originalScheduledDate && record.originalScheduledDate !== record.scheduledDate;
  const due = record.daysLeft ?? daysUntil(record.scheduledDate);
  const overdue = !done && (record.status || 'SCHEDULED') === 'SCHEDULED' && due < 0;
  const [changing, setChanging] = useState(false);
  const pending = useRef(false);
  async function toggle() {
    if (!canWrite || pending.current) return;
    pending.current = true;
    setChanging(true);
    try { await onToggle(); } finally { pending.current = false; setChanging(false); }
  }
  return <Pressable onPress={toggle} disabled={!canWrite || changing} accessibilityRole="button" accessibilityLabel={`${record.vaccineName}, ${done ? 'đã tiêm' : 'chưa tiêm'}`} accessibilityHint="Chạm để đổi trạng thái tiêm" accessibilityState={{ disabled: !canWrite || changing, busy: changing }} style={{
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: colors.borderSoft
  }}>
      <View style={{
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: done ? colors.successBg : custom ? '#EEF2FF' : colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        {done ? <Ionicons name="checkmark" size={18} color={colors.success} /> : <MaterialCommunityIcons name="needle" size={18} color={custom ? '#4F46E5' : colors.primary} />}
      </View>
      <View style={{
      flex: 1,
      minWidth: 0
    }}>
        <Text style={{
        color: colors.text,
        fontWeight: '900'
      }}>{record.vaccineName} {record.doseNumber ? `(Mũi ${record.doseNumber})` : ''}</Text>
        <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 6
      }}>
          <Badge label={custom ? 'Mũi riêng' : categoryLabel(record.category)} color={custom ? '#4F46E5' : record.category === 'REQUIRED' ? colors.primary : '#6B7280'} bg={custom ? '#EEF2FF' : record.category === 'REQUIRED' ? colors.primaryLight : '#F3F4F6'} />
          {adjusted ? <Badge label="Đã điều chỉnh" color="#7C3AED" bg="#F3E8FF" /> : null}
          {overdue ? <Badge label={`Quá hạn ${Math.abs(due)} ngày`} color="#DC2626" bg="#FEF2F2" /> : null}
          <Badge label={statusLabel(record.status || (done ? 'COMPLETED' : 'SCHEDULED'))} color={done ? colors.success : '#92400E'} bg={done ? colors.successBg : '#FEF3C7'} />
        </View>
        <Text style={{
        marginTop: 6,
        color: colors.text2,
        fontSize: 12
      }}>{record.ageLabel || 'Theo lịch riêng'} · Ngày hẹn: {formatDate(record.scheduledDate)}</Text>
        {record.notes ? <Text numberOfLines={2} style={{
        marginTop: 4,
        color: colors.hint,
        fontSize: 11,
        lineHeight: 16
      }}>{record.notes}</Text> : null}
      </View>
      <View style={{
      gap: 8,
      alignItems: 'flex-end'
    }}>
        {canWrite ? <Pressable disabled={changing} onPress={event => { event.stopPropagation(); onEdit(); }} accessibilityRole="button" accessibilityLabel="Chỉnh sửa mũi tiêm" style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Ionicons name="pencil-outline" size={15} color={colors.text2} />
        </Pressable> : null}
        {canWrite ? <Text style={{
        color: done ? colors.success : colors.primary,
        fontWeight: '900',
        fontSize: 12
      }}>{changing ? 'Đang lưu…' : done ? 'Đã tiêm' : 'Chưa tiêm'}</Text> : null}
      </View>
    </Pressable>;
}
function Badge({
  label,
  color,
  bg
}) {
  return <Text style={{
    color,
    backgroundColor: bg,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '900'
  }}>{label}</Text>;
}
