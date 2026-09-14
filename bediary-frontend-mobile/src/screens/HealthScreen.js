import { useAuth } from "../utils/auth";
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import FormSheet from '../components/FormSheet';
import HealthDateField from '../components/HealthDateField';
import { AppAlert as Alert } from '../utils/appAlert';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import PrimaryButton from '../components/PrimaryButton';
import EmptyState from '../components/EmptyState';
import { healthApi, healthSubjectApi } from '../api/api';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';
import { formatDate, listFromResponse, todayIso, unwrap } from '../utils/format';
import { apiErrorMessage } from '../utils/apiError';
const TYPES = [{
  value: '',
  label: 'Tất cả',
  icon: 'heart-outline',
  color: colors.primary,
  bg: colors.primaryLight
}, {
  value: 'CHECKUP',
  label: 'Lần khám',
  icon: 'medical-outline',
  color: '#4A6CF7',
  bg: '#EEF3FF'
}, {
  value: 'CONDITION',
  label: 'Bệnh lý',
  icon: 'shield-outline',
  color: '#F97316',
  bg: '#FFF4E8'
}, {
  value: 'HEREDITARY',
  label: 'Di truyền',
  icon: 'git-network-outline',
  color: '#7C3AED',
  bg: '#F4EEFF'
}, {
  value: 'MEDICATION',
  label: 'Thuốc',
  icon: 'medkit-outline',
  color: '#16A34A',
  bg: '#EAF8EF'
}, {
  value: 'ALLERGY',
  label: 'Dị ứng',
  icon: 'warning-outline',
  color: '#DC2626',
  bg: '#FFF0F0'
}, {
  value: 'NOTE',
  label: 'Ghi chú',
  icon: 'document-text-outline',
  color: '#64748B',
  bg: '#F3F6F8'
}];
const EMPTY_FORM = {
  recordType: 'CHECKUP',
  title: '',
  eventDate: new Date().toISOString().slice(0, 10),
  nextFollowUpDate: '',
  facility: '',
  doctorName: '',
  diagnosis: '',
  medicationName: '',
  medicationDosage: '',
  medicationStatus: 'ACTIVE',
  hereditarySide: 'UNKNOWN',
  severity: 'LOW',
  notes: '',
  subjectId: null
};
function typeMeta(type) {
  return TYPES.find(item => item.value === type) || TYPES[0];
}
function compactPayload(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === '' ? null : value]));
}
function validOptionalDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function normalizeDraft(record = {}) {
  return {
    ...EMPTY_FORM,
    ...record,
    eventDate: record.eventDate || '',
    nextFollowUpDate: record.nextFollowUpDate || '',
    medicationStatus: record.medicationStatus || 'ACTIVE',
    hereditarySide: record.hereditarySide || 'UNKNOWN',
    severity: record.severity || 'LOW'
  };
}
function daysUntil(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - today) / 86400000);
}
function formatOcrText(text = '') {
  return String(text).replace(/\s+[-–—]\s+/g, '\n- ').replace(/\n{3,}/g, '\n\n').trim();
}
function fileFromAsset(asset) {
  const name = asset.fileName || `health-import-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType || (name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
  };
}
export default function HealthScreen({
  navigation
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  const [filter, setFilter] = useState('');
  const [records, setRecords] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subjectForm, setSubjectForm] = useState({
    relationship: '',
    displayName: ''
  });
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importWarnings, setImportWarnings] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedDrafts, setSelectedDrafts] = useState({});
  const [savingDrafts, setSavingDrafts] = useState(false);
  const importBusy = useRef(false);
  const saveBusy = useRef(false);
  const savedDraftIndexes = useRef(new Set());
  const recordVersion = useRef(0);
  const [loadError, setLoadError] = useState(null);
  const loadSubjects = useCallback(async () => {
    try {
      const response = await healthSubjectApi.list();
      setSubjects(listFromResponse(response));
    } catch {
      /* non-critical */
    }
  }, []);
  const loadRecords = useCallback(async () => {
    const request = ++recordVersion.current;
    setRefreshing(true);
    setLoadError(null);
    try {
      await Promise.allSettled([healthApi.list(filter || undefined, activeSubjectId || undefined).then(response => {
        if (request === recordVersion.current) setRecords(listFromResponse(response));
      }).catch(error => {
        if (request === recordVersion.current) setLoadError(apiErrorMessage(error));
      }), healthApi.upcoming(90).then(response => {
        if (request === recordVersion.current) setUpcoming(listFromResponse(response));
      })]);
    } finally {
      if (request === recordVersion.current) setRefreshing(false);
    }
  }, [activeSubjectId, filter]);
  useFocusEffect(useCallback(() => {
    setRecords([]);
    loadSubjects();
    loadRecords();
    return () => {
      recordVersion.current += 1;
    };
  }, [loadRecords, loadSubjects]));
  const activeSubject = subjects.find(subject => subject.id === activeSubjectId);
  const stats = useMemo(() => ({
    total: records.length,
    activeMeds: records.filter(record => record.recordType === 'MEDICATION' && record.medicationStatus === 'ACTIVE').length,
    allergies: records.filter(record => record.recordType === 'ALLERGY').length,
    conditions: records.filter(record => record.recordType === 'CONDITION').length
  }), [records]);
  const nextAppointment = upcoming.find(record => (record.subjectId || null) === activeSubjectId);
  const due = daysUntil(nextAppointment?.nextFollowUpDate);
  function openCreate(type = 'CHECKUP') {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      eventDate: todayIso(),
      recordType: type,
      subjectId: activeSubjectId
    });
    setModal(true);
  }
  function openEdit(record) {
    setEditingId(record.id);
    setForm(normalizeDraft(record));
    setModal(true);
  }
  async function save() {
    if (!validOptionalDate(form.eventDate) || !validOptionalDate(form.nextFollowUpDate)) {
      Alert.alert('Ngày chưa hợp lệ', 'Chọn lại ngày trên lịch hoặc để trống nếu chưa rõ.');
      return;
    }
    if (!form.title.trim()) {
      Alert.alert('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề hồ sơ.');
      return;
    }
    try {
      const payload = compactPayload({
        ...form,
        title: form.title.trim(),
        subjectId: activeSubjectId
      });
      if (editingId) await healthApi.update(editingId, payload);else await healthApi.create(payload);
      setModal(false);
      await loadRecords();
    } catch (error) {
      Alert.alert('Không thể lưu hồ sơ', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  function confirmDelete(record) {
    Alert.alert('Xóa hồ sơ?', `Xóa "${record.title}" khỏi sổ sức khỏe?`, [{
      text: 'Hủy',
      style: 'cancel'
    }, {
      text: 'Xóa',
      style: 'destructive',
      onPress: async () => {
        try {
          await healthApi.delete(record.id);
          await loadRecords();
        } catch (error) {
          Alert.alert('Không thể xóa', error.response?.data?.message || 'Thử lại sau nhé.');
        }
      }
    }]);
  }
  async function addSubject() {
    if (!subjectForm.relationship.trim()) {
      Alert.alert('Thiếu quan hệ', 'Nhập Ba, Mẹ hoặc tên quan hệ để tạo sổ.');
      return;
    }
    try {
      const response = await healthSubjectApi.create({
        relationship: subjectForm.relationship.trim(),
        displayName: subjectForm.displayName.trim() || null
      });
      const next = unwrap(response);
      setSubjectModal(false);
      setSubjectForm({
        relationship: '',
        displayName: ''
      });
      await loadSubjects();
      if (next?.id) setActiveSubjectId(next.id);
    } catch (error) {
      Alert.alert('Không thể tạo sổ', error.response?.data?.message || 'Thử lại sau nhé.');
    }
  }
  function deleteSubject(subject) {
    Alert.alert('Xóa sổ này?', `Xóa sổ của ${subject.displayName || subject.relationship}?`, [{
      text: 'Hủy',
      style: 'cancel'
    }, {
      text: 'Xóa',
      style: 'destructive',
      onPress: async () => {
        try {
          await healthSubjectApi.delete(subject.id);
          if (activeSubjectId === subject.id) setActiveSubjectId(null);
          await loadSubjects();
        } catch (error) {
          Alert.alert('Không thể xóa sổ', error.response?.data?.message || 'Thử lại sau nhé.');
        }
      }
    }]);
  }
  function openImport() {
    if (importBusy.current || saveBusy.current) return;
    savedDraftIndexes.current.clear();
    setImportText('');
    setImportWarnings([]);
    setDrafts([]);
    setSelectedDrafts({});
    setImportModal(true);
  }
  async function analyzeImage(source = 'library') {
    if (importBusy.current || saveBusy.current) return;
    importBusy.current = true;
    setImporting(true);
    try {
      const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(source === 'camera' ? 'Cần quyền camera' : 'Cần quyền ảnh', source === 'camera' ? 'Cho phép Bediary mở camera để chụp giấy khám/đơn thuốc.' : 'Cho phép Bediary chọn ảnh giấy khám để AI đọc nội dung.');
        return;
      }
      const options = {
        mediaTypes: ['images'],
        quality: 0.9
      };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.[0]) return;
      if (result.assets[0].fileSize > 10 * 1024 * 1024) {
        setImportWarnings(['Ảnh tối đa 10MB. Vui lòng chọn ảnh có dung lượng nhỏ hơn.']);
        return;
      }
      setImportWarnings([]);
      setDrafts([]);
      setImportText('');
      setSelectedDrafts({});
      savedDraftIndexes.current.clear();
      const response = await healthApi.analyzeImport(fileFromAsset(result.assets[0]));
      const data = unwrap(response);
      const nextDrafts = (data?.records || []).map(record => normalizeDraft({
        ...record,
        subjectId: activeSubjectId
      }));
      setDrafts(nextDrafts);
      setSelectedDrafts(Object.fromEntries(nextDrafts.map((_, index) => [index, true])));
      setImportText(formatOcrText(data?.extractedText || ''));
      setImportWarnings(data?.warnings || []);
    } catch (error) {
      setImportWarnings([error.response?.data?.message || 'Không thể đọc tài liệu. Hãy thử ảnh rõ hơn hoặc nhập tay.']);
    } finally {
      importBusy.current = false;
      setImporting(false);
    }
  }
  function chooseImportSource() {
    Alert.alert('Nhập hồ sơ từ ảnh', 'Bạn muốn lấy ảnh từ đâu?', [{
      text: 'Chụp ảnh',
      onPress: () => analyzeImage('camera')
    }, {
      text: 'Chọn từ thư viện',
      onPress: () => analyzeImage('library')
    }, {
      text: 'Hủy',
      style: 'cancel'
    }]);
  }
  async function saveDrafts() {
    if (saveBusy.current || importBusy.current) return;
    const selected = drafts.map((draft, index) => ({
      draft,
      index
    })).filter(({
      index
    }) => selectedDrafts[index] && !savedDraftIndexes.current.has(index));
    if (!selected.length) {
      setImportWarnings(['Vui lòng chọn ít nhất một hồ sơ để lưu.']);
      return;
    }
    if (selected.some(({
      draft
    }) => !draft.title?.trim())) {
      setImportWarnings(['Một hồ sơ đang thiếu tiêu đề. Vui lòng kiểm tra trước khi lưu.']);
      return;
    }
    if (selected.some(({
      draft
    }) => !validOptionalDate(draft.eventDate) || !validOptionalDate(draft.nextFollowUpDate))) {
      setImportWarnings(['Ngày chưa hợp lệ. Chọn lại trên lịch hoặc để trống nếu chưa rõ.']);
      return;
    }
    saveBusy.current = true;
    setSavingDrafts(true);
    try {
      for (const {
        draft,
        index
      } of selected) {
        await healthApi.create(compactPayload({
          ...draft,
          title: draft.title.trim()
        }));
        savedDraftIndexes.current.add(index);
        setSelectedDrafts(previous => ({
          ...previous,
          [index]: false
        }));
      }
      setImportModal(false);
      await loadRecords();
    } catch (error) {
      setImportWarnings([`Đã lưu ${savedDraftIndexes.current.size} mục. Các mục đã lưu sẽ không được gửi lại.`, error.response?.data?.message || error.message || 'Không thể lưu bản nháp đã chọn.']);
    } finally {
      saveBusy.current = false;
      setSavingDrafts(false);
    }
  }
  return <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRecords} tintColor={colors.primary} />}>
        <View style={{
        borderRadius: 32,
        padding: 22,
        backgroundColor: colors.primary,
        marginBottom: 14,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 28,
        shadowOffset: {
          width: 0,
          height: 14
        },
        elevation: 4
      }}>
          <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14
        }}>
            <View style={{
            flex: 1
          }}>
              <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              marginBottom: 8
            }}>
                <View style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                backgroundColor: 'rgba(255,255,255,.22)',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                  <Ionicons name="heart-outline" size={15} color="#fff" />
                </View>
                <Text style={{
                color: 'rgba(255,255,255,.9)',
                fontSize: 12,
                fontWeight: '900'
              }}>SỔ SỨC KHỎE GIA ĐÌNH</Text>
              </View>
              <Text style={{
              color: '#fff',
              fontSize: 27,
              fontWeight: '900',
              lineHeight: 31
            }}>{activeSubject ? `Sức khỏe của ${activeSubject.displayName || activeSubject.relationship}` : 'Sức khỏe của Bé'}</Text>
              <Text style={{
              marginTop: 8,
              color: 'rgba(255,255,255,.88)',
              fontSize: 13,
              lineHeight: 20
            }}>Lưu lịch khám, đơn thuốc, dị ứng và lời dặn của bác sĩ. AI hỗ trợ điền từ giấy khám.</Text>
            </View>
            {canWrite ? <Pressable onPress={() => openCreate('CHECKUP')} style={{
            width: 48,
            height: 48,
            borderRadius: 17,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,.5)',
            backgroundColor: 'rgba(255,255,255,.22)',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable> : null}
          </View>
        </View>

        <SubjectTabs subjects={subjects} activeSubjectId={activeSubjectId} onSelect={setActiveSubjectId} onAdd={() => setSubjectModal(true)} onDelete={deleteSubject} />

        <View style={{
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16
      }}>
          {canWrite ? <QuickAction title="Nhập từ ảnh" subtitle="AI bóc tách tự động" icon="scan-outline" tone="pink" onPress={openImport} /> : null}
          {canWrite ? <QuickAction title="Thêm thuốc" subtitle="Nhập tay khi cần" icon="medkit-outline" tone="green" onPress={() => openCreate('MEDICATION')} /> : null}
        </View>

        <Pressable onPress={() => navigation.navigate('DoctorShare')} style={{
        borderRadius: 24,
        padding: 16,
        backgroundColor: '#EEF3FF',
        borderWidth: 1.5,
        borderColor: '#DDE8FF',
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
      }}>
          <View style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: '#4A6CF7',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
            <Ionicons name="medical" size={22} color="#fff" />
          </View>
          <View style={{
          flex: 1,
          minWidth: 0
        }}>
            <Text style={{
            color: colors.text,
            fontSize: 15,
            fontWeight: '900'
          }}>Trao đổi với bác sĩ</Text>
            <Text style={{
            marginTop: 4,
            color: colors.text2,
            fontSize: 12,
            lineHeight: 17
          }}>Tổng hợp dữ liệu bé, thêm ghi chú và chia sẻ cho bác sĩ thật.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#4A6CF7" />
        </Pressable>

        <View style={{
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16
      }}>
          <StatCard label="Hồ sơ" value={stats.total} icon="pulse-outline" color={colors.primary} bg={colors.primaryLight} />
          <StatCard label="Đang dùng thuốc" value={stats.activeMeds} icon="medkit-outline" color="#16A34A" bg="#EAF8EF" />
          <StatCard label="Dị ứng" value={stats.allergies} icon="warning-outline" color="#DC2626" bg="#FFF0F0" />
          <StatCard label="Bệnh lý" value={stats.conditions} icon="shield-outline" color="#F97316" bg="#FFF4E8" />
        </View>

        {nextAppointment ? <AppointmentBanner record={nextAppointment} due={due} /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
        gap: 7,
        paddingBottom: 10,
        marginBottom: 4
      }}>
          {TYPES.map(type => {
          const active = filter === type.value;
          return <Pressable key={type.value || 'ALL'} onPress={() => setFilter(type.value)} style={{
            borderWidth: active ? 0 : 1.5,
            borderColor: '#F0E0E6',
            backgroundColor: active ? type.color : '#fff',
            borderRadius: 999,
            paddingHorizontal: 13,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}>
                <Ionicons name={type.icon} size={13} color={active ? '#fff' : colors.text2} />
                <Text style={{
              color: active ? '#fff' : colors.text2,
              fontSize: 12,
              fontWeight: '900'
            }}>{type.label}</Text>
              </Pressable>;
        })}
        </ScrollView>

        <View style={{
        gap: 12
      }}>
          {loadError ? <Text accessibilityRole="alert" style={{
          color: colors.danger,
          padding: 12
        }}>{loadError}</Text> : null}
          {records.length ? records.map(record => <RecordCard key={record.id} record={record} onEdit={openEdit} onDelete={confirmDelete} />) : !loadError && !refreshing ? <EmptyState icon="🩺" title="Chưa có hồ sơ sức khỏe" description="Thêm hồ sơ hoặc nhập từ ảnh giấy khám để Bediary lưu lại." /> : null}
        </View>
      </ScrollView>

      <RecordFormModal visible={modal} editingId={editingId} form={form} setForm={setForm} onClose={() => setModal(false)} onSave={save} />
      <SubjectModal visible={subjectModal} form={subjectForm} setForm={setSubjectForm} onClose={() => setSubjectModal(false)} onSave={addSubject} />
      <ImportModal visible={importModal} importing={importing} saving={savingDrafts} savedIndexes={savedDraftIndexes.current} importText={importText} warnings={importWarnings} drafts={drafts} selectedDrafts={selectedDrafts} onAnalyze={chooseImportSource} onClose={() => {
      if (!importBusy.current && !saveBusy.current) setImportModal(false);
    }} onSave={saveDrafts} onToggle={index => setSelectedDrafts(items => ({
      ...items,
      [index]: !items[index]
    }))} onChangeDraft={(index, patch) => setDrafts(items => items.map((item, i) => i === index ? {
      ...item,
      ...patch
    } : item))} />
    </View>;
}
function SubjectTabs({
  subjects,
  activeSubjectId,
  onSelect,
  onAdd,
  onDelete
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
    gap: 8,
    paddingBottom: 12
  }}>
      <Pressable onPress={() => onSelect(null)} style={[subjectTabStyle(!activeSubjectId), {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    }]}>
        <Ionicons name="happy-outline" size={15} color={!activeSubjectId ? '#fff' : colors.primary} />
        <Text style={subjectTabText(!activeSubjectId)}>Bé</Text>
      </Pressable>
      {subjects.map(subject => {
      const active = activeSubjectId === subject.id;
      return <View key={subject.id} style={[subjectTabStyle(active), {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
      }]}>
            <Pressable onPress={() => onSelect(subject.id)} style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6
        }}>
              <Ionicons name="person-outline" size={15} color={active ? '#fff' : colors.primary} />
              <Text style={subjectTabText(active)}>{subject.displayName || subject.relationship}</Text>
            </Pressable>
            {canWrite ? <Pressable onPress={() => onDelete(subject)} hitSlop={8}>
              <Ionicons name="close" size={14} color={active ? '#fff' : colors.hint} />
            </Pressable> : null}
          </View>;
    })}
      {canWrite ? <Pressable onPress={onAdd} style={{
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: '#FFD6E4',
      backgroundColor: '#fff',
      paddingHorizontal: 13,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    }}>
        <Ionicons name="add" size={15} color={colors.primary} />
        <Text style={{
        color: colors.primary,
        fontSize: 12,
        fontWeight: '900'
      }}>Thêm sổ</Text>
      </Pressable> : null}
    </ScrollView>;
}
function subjectTabStyle(active) {
  return {
    borderRadius: 999,
    borderWidth: active ? 0 : 1.5,
    borderColor: '#F0E0E6',
    backgroundColor: active ? colors.primary : '#fff',
    paddingHorizontal: 13,
    paddingVertical: 8
  };
}
function subjectTabText(active) {
  return {
    color: active ? '#fff' : colors.text2,
    fontSize: 12,
    fontWeight: '900'
  };
}
function QuickAction({
  title,
  subtitle,
  icon,
  tone,
  onPress
}) {
  const green = tone === 'green';
  return <Pressable onPress={onPress} style={{
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: green ? '#BBF7D0' : '#FFD6E4',
    backgroundColor: green ? '#F0FFF4' : colors.primaryPale,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  }}>
      <View style={{
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: green ? '#16A34A' : colors.primary,
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <View style={{
      flex: 1
    }}>
        <Text numberOfLines={2} style={{
        color: colors.text,
        fontSize: 13,
        fontWeight: '900',
        lineHeight: 17
      }}>{title}</Text>
        <Text numberOfLines={1} style={{
        marginTop: 2,
        color: colors.hint,
        fontSize: 11,
        fontWeight: '700'
      }}>{subtitle}</Text>
      </View>
    </Pressable>;
}
function StatCard({
  label,
  value,
  icon,
  color,
  bg
}) {
  return <View style={{
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F3E2E8',
    alignItems: 'center'
  }}>
      <View style={{
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: bg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6
    }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={{
      color: colors.text,
      fontSize: 20,
      fontWeight: '900'
    }}>{value}</Text>
      <Text numberOfLines={2} style={{
      color: colors.hint,
      fontSize: 10,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 12
    }}>{label}</Text>
    </View>;
}
function AppointmentBanner({
  record,
  due
}) {
  const overdue = due < 0;
  return <View style={{
    borderRadius: 22,
    padding: 16,
    backgroundColor: overdue ? '#FEF2F2' : '#EFF6FF',
    borderWidth: 1.5,
    borderColor: overdue ? '#FCA5A5' : '#BAE6FD',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  }}>
      <View style={{
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: overdue ? '#DC2626' : '#0EA5E9',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
        <Ionicons name="calendar-outline" size={20} color="#fff" />
      </View>
      <View style={{
      flex: 1,
      minWidth: 0
    }}>
        <Text style={{
        color: overdue ? '#DC2626' : '#0EA5E9',
        fontSize: 11,
        fontWeight: '900'
      }}>{overdue ? `QUÁ HẠN ${Math.abs(due)} NGÀY` : due === 0 ? 'HÔM NAY TÁI KHÁM' : `CÒN ${due} NGÀY`}</Text>
        <Text numberOfLines={1} style={{
        marginTop: 3,
        color: '#1E293B',
        fontSize: 14,
        fontWeight: '900'
      }}>{record.title}</Text>
        <Text style={{
        marginTop: 2,
        color: '#64748B',
        fontSize: 12
      }}>{formatDate(record.nextFollowUpDate)}{record.facility ? ` · ${record.facility}` : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
    </View>;
}
function RecordCard({
  record,
  onEdit,
  onDelete
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  const meta = typeMeta(record.recordType);
  return <View style={{
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1E3E9',
    shadowColor: '#231C22',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 2
  }}>
      <View style={{
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start'
    }}>
        <View style={{
        width: 48,
        height: 48,
        borderRadius: 17,
        backgroundColor: meta.color,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Ionicons name={meta.icon} size={23} color="#fff" />
        </View>
        <View style={{
        flex: 1,
        minWidth: 0
      }}>
          <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 5
        }}>
            <Text style={{
            borderRadius: 999,
            backgroundColor: meta.bg,
            color: meta.color,
            paddingHorizontal: 9,
            paddingVertical: 4,
            fontSize: 11,
            fontWeight: '900'
          }}>{meta.label}</Text>
            {record.severity === 'HIGH' ? <Text style={{
            color: '#DC2626',
            fontSize: 11,
            fontWeight: '900'
          }}>Cần chú ý</Text> : null}
          </View>
          <Text style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: '900',
          lineHeight: 21
        }}>{record.title}</Text>
          <Text style={{
          marginTop: 6,
          color: colors.hint,
          fontSize: 12,
          lineHeight: 18
        }}>
            {formatDate(record.eventDate)}{record.facility ? ` · ${record.facility}` : ''}{record.doctorName ? ` · BS. ${record.doctorName}` : ''}
          </Text>
        </View>
        <View style={{
        flexDirection: 'row',
        gap: 6
      }}>
          {canWrite ? <Pressable onPress={() => onEdit(record)} style={iconButtonStyle}>
            <Ionicons name="create-outline" size={16} color={colors.text2} />
          </Pressable> : null}
          {canWrite ? <Pressable onPress={() => onDelete(record)} style={iconButtonStyle}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </Pressable> : null}
        </View>
      </View>
      {record.diagnosis || record.notes ? <View style={{
      marginTop: 13,
      borderWidth: 1,
      borderColor: '#F3E0E8',
      backgroundColor: '#FFF9FB',
      borderRadius: 18,
      padding: 12
    }}>
          {record.diagnosis ? <Text style={{
        color: colors.text,
        fontSize: 13,
        lineHeight: 20
      }}><Text style={{
          fontWeight: '900'
        }}>Chẩn đoán: </Text>{formatOcrText(record.diagnosis)}</Text> : null}
          {record.notes ? <Text style={{
        marginTop: record.diagnosis ? 8 : 0,
        color: colors.text2,
        fontSize: 13,
        lineHeight: 20
      }}>{formatOcrText(record.notes)}</Text> : null}
        </View> : null}
      {record.medicationName ? <View style={{
      marginTop: 10,
      flexDirection: 'row',
      gap: 10,
      borderWidth: 1,
      borderColor: '#DCEFE4',
      backgroundColor: '#F3FBF6',
      borderRadius: 16,
      padding: 10
    }}>
          <Ionicons name="medkit-outline" size={18} color="#16A34A" />
          <View style={{
        flex: 1
      }}>
            <Text style={{
          color: '#14532D',
          fontSize: 13,
          fontWeight: '900'
        }}>{record.medicationName}</Text>
            {record.medicationDosage ? <Text style={{
          marginTop: 4,
          color: '#49785A',
          fontSize: 12,
          lineHeight: 17
        }}>{record.medicationDosage}</Text> : null}
          </View>
        </View> : null}
      {record.nextFollowUpDate ? <View style={{
      alignSelf: 'flex-start',
      marginTop: 10,
      borderRadius: 999,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 10,
      paddingVertical: 7,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6
    }}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={{
        color: colors.primary,
        fontSize: 12,
        fontWeight: '900'
      }}>Hẹn tiếp theo: {formatDate(record.nextFollowUpDate)}</Text>
        </View> : null}
    </View>;
}
const iconButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 13,
  borderWidth: 1,
  borderColor: '#F0E0E6',
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center'
};
function TypePicker({
  value,
  onChange
}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
    gap: 7,
    paddingVertical: 12
  }}>
      {TYPES.filter(item => item.value).map(type => {
      const active = value === type.value;
      return <Pressable key={type.value} onPress={() => onChange(type.value)} style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: active ? type.color : type.bg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
      }}>
            <Ionicons name={type.icon} size={13} color={active ? '#fff' : type.color} />
            <Text style={{
          color: active ? '#fff' : type.color,
          fontSize: 12,
          fontWeight: '900'
        }}>{type.label}</Text>
          </Pressable>;
    })}
    </ScrollView>;
}
function RecordFormModal({
  visible,
  editingId,
  form,
  setForm,
  onClose,
  onSave
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  const meta = typeMeta(form.recordType);
  return <FormSheet visible={canWrite && visible} onClose={onClose}>
          <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    }}>
            <View style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        backgroundColor: meta.color,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
              <Ionicons name={meta.icon} size={18} color="#fff" />
            </View>
            <View style={{
        flex: 1
      }}>
              <Text style={{
          color: colors.text,
          fontSize: 19,
          fontWeight: '900'
        }}>{editingId ? 'Cập nhật hồ sơ' : 'Thêm hồ sơ sức khỏe'}</Text>
              <Text style={{
          color: colors.hint,
          fontSize: 11,
          fontWeight: '700'
        }}>Điền thông tin bên dưới</Text>
            </View>
            <Pressable onPress={onClose} style={iconButtonStyle}><Ionicons name="close" size={18} color={colors.text2} /></Pressable>
          </View>
          <TypePicker value={form.recordType} onChange={recordType => setForm({
      ...form,
      recordType
    })} />
          <TextInput placeholderTextColor="#787078" placeholder="Tiêu đề *" value={form.title} onChangeText={title => setForm({
      ...form,
      title
    })} style={styles.input} />
          <HealthDateField label="Ngày ghi nhận hồ sơ" value={form.eventDate} onChange={eventDate => setForm(current => ({ ...current, eventDate }))} />
          <HealthDateField label="Lịch hẹn tiếp theo" value={form.nextFollowUpDate} onChange={nextFollowUpDate => setForm(current => ({ ...current, nextFollowUpDate }))} />
          <View style={{
      flexDirection: 'row',
      gap: 10,
      marginTop: 10
    }}>
            <TextInput placeholderTextColor="#787078" placeholder="Cơ sở y tế" value={form.facility} onChangeText={facility => setForm({
        ...form,
        facility
      })} style={[styles.input, {
        flex: 1
      }]} />
            <TextInput placeholderTextColor="#787078" placeholder="Bác sĩ" value={form.doctorName} onChangeText={doctorName => setForm({
        ...form,
        doctorName
      })} style={[styles.input, {
        flex: 1
      }]} />
          </View>
          <TextInput placeholderTextColor="#787078" placeholder="Chẩn đoán / tình trạng" value={form.diagnosis} onChangeText={diagnosis => setForm({
      ...form,
      diagnosis
    })} multiline style={[styles.input, {
      marginTop: 10,
      minHeight: 82,
      paddingTop: 14
    }]} />
          <View style={{
      flexDirection: 'row',
      gap: 10,
      marginTop: 10
    }}>
            <TextInput placeholderTextColor="#787078" placeholder="Tên thuốc" value={form.medicationName} onChangeText={medicationName => setForm({
        ...form,
        medicationName
      })} style={[styles.input, {
        flex: 1
      }]} />
            <TextInput placeholderTextColor="#787078" placeholder="Liều dùng" value={form.medicationDosage} onChangeText={medicationDosage => setForm({
        ...form,
        medicationDosage
      })} style={[styles.input, {
        flex: 1
      }]} />
          </View>
          <View style={{
      flexDirection: 'row',
      gap: 10,
      marginTop: 10
    }}>
            <SelectLike label="Mức độ" value={form.severity} options={[['LOW', 'Nhẹ'], ['MEDIUM', 'Trung bình'], ['HIGH', 'Cần chú ý']]} onChange={severity => setForm({
        ...form,
        severity
      })} />
            <SelectLike label="Thuốc" value={form.medicationStatus} options={[['ACTIVE', 'Đang dùng'], ['PAUSED', 'Tạm dừng'], ['COMPLETED', 'Đã xong']]} onChange={medicationStatus => setForm({
        ...form,
        medicationStatus
      })} />
          </View>
          <SelectLike label="Bệnh di truyền từ phía" value={form.hereditarySide} options={[['UNKNOWN', 'Chưa rõ'], ['MATERNAL', 'Bên mẹ'], ['PATERNAL', 'Bên ba'], ['BOTH', 'Cả hai bên']]} onChange={hereditarySide => setForm({
      ...form,
      hereditarySide
    })} full />
          <TextInput placeholderTextColor="#787078" placeholder="Ghi chú & lời dặn" value={form.notes} onChangeText={notes => setForm({
      ...form,
      notes
    })} multiline style={[styles.input, {
      marginTop: 10,
      minHeight: 82,
      paddingTop: 14
    }]} />
          <PrimaryButton onPress={onSave} style={{
      marginTop: 16
    }}>{editingId ? 'Cập nhật hồ sơ' : 'Lưu hồ sơ'}</PrimaryButton>
          <Text onPress={onClose} style={{
      textAlign: 'center',
      marginTop: 14,
      color: colors.hint,
      fontWeight: '800'
    }}>Hủy</Text>
    </FormSheet>;
}
function SelectLike({
  label,
  value,
  options,
  onChange,
  full
}) {
  return <View style={{
    flex: full ? 0 : 1,
    marginTop: full ? 10 : 0
  }}>
      <Text style={{
      color: colors.text2,
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 6
    }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{
      gap: 6
    }}>
        {options.map(([key, text]) => {
        const active = value === key;
        return <Pressable key={key} onPress={() => onChange(key)} style={{
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: active ? colors.primary : colors.primaryPale,
          borderWidth: 1,
          borderColor: active ? colors.primary : '#FFD6E4'
        }}>
              <Text style={{
            color: active ? '#fff' : colors.primary,
            fontSize: 11,
            fontWeight: '900'
          }}>{text}</Text>
            </Pressable>;
      })}
      </ScrollView>
    </View>;
}
function SubjectModal({
  visible,
  form,
  setForm,
  onClose,
  onSave
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  return <FormSheet visible={canWrite && visible} onClose={onClose}>
          <Text style={{
      color: colors.text,
      fontSize: 19,
      fontWeight: '900'
    }}>Thêm sổ sức khỏe</Text>
          <Text style={{
      marginTop: 4,
      color: colors.hint,
      fontSize: 12,
      lineHeight: 18
    }}>Dùng cho Ba, Mẹ hoặc người thân. Phần này tách riêng khỏi dữ liệu của bé.</Text>
          <TextInput placeholderTextColor="#787078" placeholder="Quan hệ: Ba, Mẹ..." value={form.relationship} onChangeText={relationship => setForm({
      ...form,
      relationship
    })} style={[styles.input, {
      marginTop: 14
    }]} />
          <TextInput placeholderTextColor="#787078" placeholder="Tên hiển thị, nếu có" value={form.displayName} onChangeText={displayName => setForm({
      ...form,
      displayName
    })} style={[styles.input, {
      marginTop: 10
    }]} />
          <PrimaryButton onPress={onSave} style={{
      marginTop: 14
    }}>Tạo sổ</PrimaryButton>
          <Text onPress={onClose} style={{
      textAlign: 'center',
      marginTop: 14,
      color: colors.hint,
      fontWeight: '800'
    }}>Hủy</Text>
    </FormSheet>;
}
function ImportModal({
  visible,
  importing,
  saving,
  savedIndexes,
  importText,
  warnings,
  drafts,
  selectedDrafts,
  onAnalyze,
  onClose,
  onSave,
  onToggle,
  onChangeDraft
}) {
  const canWrite = ["ADMIN", "PARENT", "CAREGIVER", "DOCTOR"].includes(useAuth().user?.role);
  const [showText, setShowText] = useState(false);
  const selectedCount = drafts.filter((_, index) => selectedDrafts[index] && !savedIndexes.has(index)).length;
  return <FormSheet visible={canWrite && visible} onClose={onClose} footer={drafts.length ? <>
      <Text style={{
      color: colors.text2,
      fontSize: 12,
      marginBottom: 10
    }}>Đã chọn {selectedCount}/{drafts.length - savedIndexes.size} mục chưa lưu · Kiểm tra kỹ trước khi thêm</Text>
      <PrimaryButton loading={saving} disabled={importing || selectedCount === 0} onPress={onSave}>Lưu {selectedCount} hồ sơ đã chọn</PrimaryButton>
    </> : null}>
          <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
    }}>
            <View style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
              <Ionicons name="scan-outline" size={18} color="#fff" />
            </View>
            <View style={{
        flex: 1
      }}>
              <Text style={{
          color: colors.text,
          fontSize: 19,
          fontWeight: '900'
        }}>{drafts.length ? 'Kiểm tra trước khi lưu' : 'Nhập hồ sơ từ ảnh'}</Text>
              <Text style={{
          color: colors.hint,
          fontSize: 11,
          fontWeight: '700'
        }}>AI đọc và điền nháp, kiểm tra kỹ trước khi lưu</Text>
            </View>
            <Pressable onPress={onClose} style={iconButtonStyle}><Ionicons name="close" size={18} color={colors.text2} /></Pressable>
          </View>
          <Pressable disabled={importing || saving} onPress={onAnalyze} style={{
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#FFB3CC',
      borderRadius: 18,
      backgroundColor: colors.primaryPale,
      padding: drafts.length ? 12 : 22,
      marginVertical: 16,
      alignItems: 'center',
      gap: 8
    }}>
            {!drafts.length && !importing ? <Image source={require('../../assets/characters/doctor-guide.png')} resizeMode="contain" accessible={false} style={{ width: 54, height: 130 }} /> : <Ionicons name={importing ? 'sync-outline' : 'camera-outline'} size={30} color={colors.primary} />}
            <Text style={{
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center'
      }}>{importing ? 'Đang đọc tài liệu...' : drafts.length ? 'Quét ảnh khác' : 'Chụp hoặc chọn ảnh giấy khám / đơn thuốc'}</Text>
            {!drafts.length ? <Text style={{
        color: colors.text2,
        fontSize: 12,
        textAlign: 'center'
      }}>Chụp rõ toàn bộ giấy, đủ sáng, không cắt mép.</Text> : null}
          </Pressable>
          {warnings.map((warning, index) => <Text key={index} style={{
      color: '#92400E',
      backgroundColor: '#FFFBEB',
      borderRadius: 14,
      padding: 10,
      fontSize: 12,
      lineHeight: 18
    }}>⚠ {warning}</Text>)}
          {importText ? <View style={{
      marginVertical: 14,
      borderRadius: 16,
      backgroundColor: '#F8FAFC',
      padding: 12
    }}>
            <Pressable accessibilityRole="button" accessibilityState={{
        expanded: showText
      }} onPress={() => setShowText(value => !value)} style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
      }}>
              <Ionicons name="document-text-outline" size={19} color={colors.text2} /><Text style={{
          flex: 1,
          color: colors.text,
          fontWeight: '700'
        }}>Văn bản AI đã đọc</Text><Ionicons name={showText ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text2} />
            </Pressable>
            {showText ? <Text selectable style={{
        color: colors.text2,
        fontSize: 13,
        lineHeight: 21
      }}>{importText}</Text> : null}
          </View> : null}
          {drafts.map((draft, index) => <DraftCard key={index} disabled={saving || savedIndexes.has(index)} saved={savedIndexes.has(index)} draft={draft} selected={Boolean(selectedDrafts[index])} onToggle={() => onToggle(index)} onChange={patch => onChangeDraft(index, patch)} />)}
    </FormSheet>;
}
function DraftCard({
  draft,
  selected,
  disabled,
  saved,
  onToggle,
  onChange
}) {
  const meta = typeMeta(draft.recordType);
  const [expanded, setExpanded] = useState(false);
  return <View style={{
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: selected && !saved ? meta.color : '#F1E3E9'
  }}>
      <View style={{
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center'
    }}>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Chọn ${draft.title || meta.label}`} accessibilityState={{
        checked: selected,
        disabled
      }} disabled={disabled} onPress={onToggle} style={{
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: selected ? meta.bg : '#fff',
        borderWidth: 1,
        borderColor: '#F0E0E6',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
          <Ionicons name="checkmark-circle-outline" size={17} color={selected ? meta.color : colors.hint} />
        </Pressable>
        <View style={{
        flex: 1
      }}><Text style={{
          color: meta.color,
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4
        }}>{meta.label}</Text><Text style={{
          color: colors.text,
          fontSize: 15,
          fontWeight: '700'
        }}>{draft.title || 'Chưa có tiêu đề'}</Text></View>
      </View>
      <Text style={{
      color: colors.text2,
      fontSize: 12,
      marginTop: 10
    }}>{draft.eventDate ? formatDate(draft.eventDate) : 'Chưa rõ ngày'}{draft.facility ? ` · ${draft.facility}` : ''}</Text>
      {draft.medicationName ? <Text style={{
      color: colors.text2,
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20
    }}>{draft.medicationName}{draft.medicationDosage ? ` · ${draft.medicationDosage}` : ' · Chưa rõ liều dùng'}</Text> : null}
      {saved ? <Text style={{
      marginTop: 8,
      color: colors.success
    }}>Đã lưu vào sổ sức khỏe</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{
      expanded
    }} onPress={() => setExpanded(value => !value)} style={{
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}><Text style={{
        color: colors.primaryDark,
        fontSize: 12,
        fontWeight: '700'
      }}>{expanded ? 'Thu gọn' : saved ? 'Xem nội dung đã lưu' : 'Xem và chỉnh sửa chi tiết'}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primaryDark} /></Pressable>
      {expanded ? <>
      <Text style={{
        color: colors.text2,
        fontSize: 12,
        marginBottom: 5
      }}>Tiêu đề hồ sơ *</Text>
      <TextInput placeholderTextColor="#787078" accessibilityLabel="Tiêu đề hồ sơ" editable={!disabled} value={draft.title || ''} onChangeText={title => onChange({
        title
      })} style={styles.input} />
      {!disabled ? <TypePicker value={draft.recordType} onChange={recordType => onChange({
        recordType
      })} /> : null}
      <HealthDateField label="Ngày ghi nhận hồ sơ" value={draft.eventDate} disabled={disabled} onChange={eventDate => onChange({ eventDate })} />
      <HealthDateField label="Lịch hẹn tiếp theo" value={draft.nextFollowUpDate} disabled={disabled} onChange={nextFollowUpDate => onChange({ nextFollowUpDate })} />
      {[['facility', 'Cơ sở y tế'], ['doctorName', 'Bác sĩ'], ['diagnosis', 'Chẩn đoán / tình trạng'], ['medicationName', 'Tên thuốc'], ['medicationDosage', 'Liều dùng / cách dùng'], ['notes', 'Ghi chú và lời dặn']].map(([key, label]) => <View key={key} style={{
        marginTop: 10
      }}>
        <Text style={{
          color: colors.text2,
          fontSize: 12,
          marginBottom: 5
        }}>{label}</Text>
        <TextInput placeholderTextColor="#787078" accessibilityLabel={label} editable={!disabled} value={draft[key] || ''} onChangeText={value => onChange({
          [key]: value
        })} multiline={['diagnosis', 'medicationDosage', 'notes'].includes(key)} style={[styles.input, ['diagnosis', 'medicationDosage', 'notes'].includes(key) && {
          minHeight: 84,
          textAlignVertical: 'top',
          paddingVertical: 12
        }]} />
      </View>)}
      {!disabled && draft.recordType === 'MEDICATION' ? <SelectLike full label="Trạng thái dùng thuốc" value={draft.medicationStatus} options={[['ACTIVE', 'Đang dùng'], ['PAUSED', 'Tạm dừng'], ['COMPLETED', 'Đã xong']]} onChange={medicationStatus => onChange({
        medicationStatus
      })} /> : null}
      </> : null}
    </View>;
}
