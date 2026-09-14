import { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { dashboardApi, notificationApi } from '../api/api'
import { formatDate, unwrap } from '../utils/format'
import { apiErrorMessage } from '../utils/apiError'

const p = { ink: '#302B32', muted: '#79717A', rose: '#B83F66', blush: '#FBE9EF', border: '#EEE8EB', paper: '#FCFAF9' }
const activityMeta = {
  FEED: ['Ăn / bú', 'restaurant-outline', '#B77735', '#FCF1E2'],
  SLEEP: ['Giấc ngủ', 'moon-outline', '#7967AC', '#F0ECF8'],
  BATH: ['Tắm', 'water-outline', '#52899C', '#EAF4F7'],
  MEDICINE: ['Uống thuốc', 'medical-outline', '#4D8A73', '#EAF4EF'],
  PEE: ['Đi tiểu', 'water-outline', '#52899C', '#EAF4F7'],
  POOP: ['Đi tiêu', 'leaf-outline', '#B77735', '#FCF1E2'],
  DIAPER: ['Thay tã', 'layers-outline', '#52899C', '#EAF4F7'],
  CUSTOM: ['Sinh hoạt', 'calendar-outline', p.rose, p.blush],
}

export default function HomeScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null)
  const [unread, setUnread] = useState(0)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState(null)
  const version = useRef(0)
  const { width, fontScale } = useWindowDimensions()
  const compact = width < 360 || fontScale > 1.2
  const load = useCallback(async () => {
    const request = ++version.current
    setRefreshing(true)
    setError(null)
    await Promise.allSettled([
      dashboardApi.get().then((response) => {
        if (request === version.current) setDashboard(unwrap(response))
      }).catch((failure) => {
        if (request === version.current) setError(apiErrorMessage(failure))
      }).finally(() => {
        if (request === version.current) setRefreshing(false)
      }),
      notificationApi.unreadCount().then((response) => {
        if (request === version.current) setUnread(response.data?.count ?? response.data?.unreadCount ?? 0)
      }),
    ])
  }, [])
  useFocusEffect(useCallback(() => {
    load()
    return () => { version.current += 1 }
  }, [load]))

  const babyName = dashboard?.babyNickname || dashboard?.babyName || 'Bé yêu'
  const routines = useMemo(() => [...(dashboard?.todayRoutines || [])].sort((a, b) =>
    (a.scheduledTime || '99').localeCompare(b.scheduledTime || '99')), [dashboard])
  const nextVaccination = useMemo(() => [...(dashboard?.upcomingVaccinations || [])].sort((a, b) =>
    (a.scheduledDate || '9999').localeCompare(b.scheduledDate || '9999'))[0], [dashboard])
  const posts = dashboard?.latestPosts || []
  const today = new Date()
  const weekday = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][today.getDay()]
  const open = (screen) => () => navigation.navigate(screen)

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.page} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={p.rose} colors={[p.rose]} />}>
      <View style={s.header}>
        <View style={s.brandRow}><View style={s.brandMark}><Image source={require('../../assets/characters/mascot.png')} resizeMode="contain" accessible={false} style={s.fill} /></View><Text style={s.brand}>bediary<Text style={{ color: p.rose }}>.</Text></Text></View>
        <View style={s.row}><IconButton icon="notifications-outline" label={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} onPress={open('Notifications')} badge={unread > 0} /><IconButton icon="person-outline" label="Thông tin cá nhân" onPress={open('Profile')} /></View>
      </View>
      <View style={[s.intro, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
        <View style={s.flex}><Text style={s.eyebrow}>{weekday} · {today.getDate()} tháng {today.getMonth() + 1}</Text><Text style={s.heading}>Mỗi ngày bên bé</Text><Text style={s.description}>Chăm chút hôm nay, lưu giữ yêu thương.</Text></View>
      </View>
      {error ? <View accessibilityRole="alert" style={s.errorCard}><Ionicons name="cloud-offline-outline" size={22} color={p.rose} /><View style={s.flex}><Text style={s.itemTitle}>Chưa tải được dữ liệu mới</Text><Text style={s.small}>{error}</Text></View><IconButton icon="refresh-outline" label="Thử tải lại" onPress={load} /></View> : null}

      <View style={s.hero}>
        <View pointerEvents="none" style={s.heroCircle} />
        <View style={[s.heroRow, compact && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <BabyAvatar uri={dashboard?.babyAvatarUrl} name={babyName} />
          <View style={compact ? { width: '100%' } : s.flex}><Text style={s.heroEyebrow}>THẾ GIỚI NHỎ CỦA BẠN</Text><Text style={s.babyName}>{babyName}</Text><Text style={s.age}>{dashboard?.babyAgeText || (refreshing ? 'Đang tải hồ sơ của bé…' : 'Cùng bé lớn lên mỗi ngày')}</Text></View>
        </View>
        {dashboard?.babyBirthday || dashboard?.babyDob ? <View style={s.birthday}><Ionicons name="gift-outline" size={14} color={p.rose} /><Text style={s.birthdayText}>Ngày sinh · {formatDate(dashboard.babyBirthday || dashboard.babyDob)}</Text></View> : null}
        <Pressable accessibilityRole="button" onPress={open('Tracking')} style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}><Ionicons name="add-circle-outline" size={21} color="#fff" /><Text style={s.primaryText}>Ghi nhật ký hôm nay</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></Pressable>
      </View>

      <View style={s.shortcuts}>
        <Shortcut icon="trending-up-outline" label="Tăng trưởng" detail="Từng bước lớn lên" color="#588373" bg="#EBF3EE" onPress={open('Growth')} compact={compact} />
        <Shortcut icon="needle" label="Tiêm chủng" detail="Theo dõi lịch tiêm" color="#947047" bg="#FAF0E3" onPress={open('Vaccination')} compact={compact} />
        <Shortcut icon="heart-outline" label="Sổ sức khỏe" detail="An tâm chăm bé" color="#8270AB" bg="#F0ECF7" onPress={open('Health')} compact={compact} />
      </View>
      {nextVaccination ? <Pressable accessibilityRole="button" onPress={open('Vaccination')} style={({ pressed }) => [s.vaccineCard, pressed && s.pressed]}>
        <View style={s.vaccineIcon}><Ionicons name="calendar-outline" size={24} color="#947047" /></View><View style={s.flex}><Text style={s.reminderLabel}>LỊCH TIÊM SẮP TỚI</Text><Text style={s.itemTitle}>{nextVaccination.vaccineName || nextVaccination.name}{nextVaccination.doseNumber ? ` · Mũi ${nextVaccination.doseNumber}` : ''}</Text><Text style={s.small}>{formatDate(nextVaccination.scheduledDate)}</Text></View><Ionicons name="chevron-forward" size={18} color="#947047" />
      </Pressable> : null}

      <SectionHeader title="Lịch hôm nay" subtitle={dashboard ? `${routines.length} hoạt động đã lên lịch` : 'Nhịp sinh hoạt của bé'} action="Nhật ký" onPress={open('Tracking')} />
      <View style={s.scheduleCard}>
        {!dashboard && refreshing ? <View style={s.empty}><ActivityIndicator color={p.rose} /><Text style={s.description}>Đang tải lịch chăm sóc…</Text></View>
          : !dashboard && error ? <View style={s.empty}><Ionicons name="calendar-outline" size={28} color={p.muted} /><Text style={s.description}>Lịch chăm sóc sẽ xuất hiện khi kết nối lại.</Text></View>
          : routines.length ? routines.slice(0, 5).map((routine, index) => <ActivityRow key={routine.id || index} routine={routine} last={index === Math.min(routines.length, 5) - 1} />)
          : <View style={s.empty}><View accessible={false} style={{ width: 96, height: 96, borderRadius: 35, borderWidth: 1, borderColor: '#EACBD5', backgroundColor: p.blush, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="heart" size={56} color={p.rose} /></View><Text style={s.emptyTitle}>Một ngày mới, nhiều yêu thương</Text><Text style={[s.description, { textAlign: 'center' }]}>Bé chưa có lịch hôm nay. Mở nhật ký để thêm lịch sinh hoạt cho bé nhé.</Text><Pressable accessibilityRole="button" onPress={open('Tracking')} style={({ pressed }) => [s.outlineButton, pressed && s.pressed]}><Ionicons name="add" size={18} color={p.rose} /><Text style={s.link}>Thêm lịch sinh hoạt</Text></Pressable></View>}
        {routines.length > 5 ? <Pressable accessibilityRole="button" onPress={open('Tracking')} style={s.more}><Text style={s.link}>Xem thêm {routines.length - 5} hoạt động</Text><Ionicons name="arrow-forward" size={16} color={p.rose} /></Pressable> : null}
      </View>
      {dashboard?.growthReminder ? <Pressable accessibilityRole="button" onPress={open('Growth')} style={({ pressed }) => [s.growthCard, pressed && s.pressed]}><View style={s.growthIcon}><Ionicons name="resize-outline" size={22} color="#588373" /></View><View style={s.flex}><Text style={s.itemTitle}>Bé đã lớn thêm bao nhiêu?</Text><Text style={s.small}>Cập nhật cân nặng, chiều cao để theo dõi hành trình lớn lên của bé.</Text></View><Ionicons name="chevron-forward" size={18} color="#588373" /></Pressable> : null}
      {posts.length ? <><SectionHeader title="Khoảnh khắc của bé" subtitle="Những điều nhỏ bé, thật đáng nhớ" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moments}>{posts.slice(0, 8).map((post) => <View key={post.id} style={s.moment}><MomentImage post={post} /><View style={s.momentCaption}><Text numberOfLines={2} style={s.itemTitle}>{post.caption || 'Một khoảnh khắc yêu thương'}</Text><Text style={s.small}>{formatDate(post.createdAt)}</Text></View></View>)}</ScrollView></> : null}
      <View style={s.footer}><Ionicons name="heart-outline" size={13} color={p.rose} /><Text style={s.footerText}>Cùng bạn nuôi lớn những ngày hạnh phúc</Text></View>
    </ScrollView>
  )
}

function BabyAvatar({ uri, name }) {
  const [failedUri, setFailedUri] = useState(null)
  return <View style={s.avatar}>{uri && uri !== failedUri ? <Image source={{ uri }} style={s.fill} onError={() => setFailedUri(uri)} /> : <Text style={s.initial}>{name.trim().charAt(0).toUpperCase() || 'B'}</Text>}</View>
}
function MomentImage({ post }) {
  const uri = post.mediaUrl || post.imageUrl
  const [failedUri, setFailedUri] = useState(null)
  return <View style={s.momentImage}>{uri && uri !== failedUri && post.mediaType !== 'VIDEO' ? <Image source={{ uri }} style={s.fill} resizeMode="cover" onError={() => setFailedUri(uri)} /> : <Ionicons name={post.mediaType === 'VIDEO' ? 'play-circle-outline' : 'image-outline'} size={34} color={p.rose} />}</View>
}
function IconButton({ icon, label, onPress, badge }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><Ionicons name={icon} size={21} color={p.ink} />{badge ? <View style={s.badge} /> : null}</Pressable>
}
function Shortcut({ icon, label, detail, color, bg, onPress, compact }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.shortcut, compact && { minWidth: '45%' }, pressed && s.pressed]}><View style={[s.shortcutIcon, { backgroundColor: bg }]}>{icon === 'needle' ? <MaterialCommunityIcons name="needle" size={23} color={color} /> : <Ionicons name={icon} size={23} color={color} />}</View><Text style={s.shortcutLabel}>{label}</Text>{!compact ? <Text style={s.shortcutDetail}>{detail}</Text> : null}</Pressable>
}
function SectionHeader({ title, subtitle, action, onPress }) {
  return <View style={s.sectionHeader}><View style={s.flex}><Text style={s.sectionTitle}>{title}</Text><Text style={s.small}>{subtitle}</Text></View>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={s.sectionAction}><Text style={s.link}>{action}</Text><Ionicons name="chevron-forward" size={14} color={p.rose} /></Pressable> : null}</View>
}
function ActivityRow({ routine, last }) {
  const [label, icon, color, bg] = activityMeta[routine.activityType || routine.type] || activityMeta.CUSTOM
  return <View style={s.activity}><View style={s.timeColumn}><Text style={s.time}>{routine.scheduledTime ? String(routine.scheduledTime).slice(0, 5) : 'Cả ngày'}</Text>{!last ? <View style={s.timeline} /> : null}</View><View style={[s.activityBody, !last && s.divider]}><View style={[s.activityIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={19} color={color} /></View><View style={s.flex}><Text style={s.itemTitle}>{routine.name || routine.label || label}</Text><Text style={s.small}>{label}</Text></View></View></View>
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: p.paper }, page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, width: '100%', maxWidth: 640, alignSelf: 'center' },
  flex: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: { width: 35, height: 35, borderRadius: 8, borderWidth: 1.5, borderColor: '#FF5C8A', overflow: 'hidden', backgroundColor: p.blush, alignItems: 'center', justifyContent: 'center' }, brand: { fontSize: 26, fontWeight: '800', letterSpacing: -1, color: p.ink },
  iconButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: p.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', right: 10, top: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: p.rose, borderWidth: 1, borderColor: '#fff' },
  intro: { marginBottom: 20 }, eyebrow: { fontSize: 12, fontWeight: '600', color: p.muted, marginBottom: 7 }, heading: { fontSize: 28, fontWeight: '800', color: p.ink, letterSpacing: -0.7 }, description: { fontSize: 13, lineHeight: 21, color: p.muted, marginTop: 5 },
  hero: { borderRadius: 26, backgroundColor: '#F8E8ED', padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1DCE4' }, heroCircle: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 28, borderColor: '#F4DDE6', right: -70, top: -85 }, heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroEyebrow: { fontSize: 9, letterSpacing: 1.2, fontWeight: '800', color: '#995E72', marginBottom: 6 }, avatar: { width: 76, height: 76, borderRadius: 28, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EBC8D5' }, fill: { width: '100%', height: '100%' }, initial: { fontSize: 32, fontWeight: '700', color: p.rose },
  babyName: { fontSize: 24, fontWeight: '800', color: p.ink, letterSpacing: -0.5 }, age: { fontSize: 13, lineHeight: 20, color: '#825C6A', marginTop: 4 }, birthday: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16 }, birthdayText: { color: '#825C6A', fontSize: 12, flexShrink: 1 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50, borderRadius: 15, backgroundColor: p.rose, marginTop: 18 }, primaryText: { fontSize: 14, fontWeight: '700', color: '#fff', flex: 1 },
  shortcuts: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14, marginBottom: 24 }, shortcut: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: p.border, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 5, alignItems: 'center' }, shortcutIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, shortcutLabel: { fontSize: 12, fontWeight: '700', color: p.ink, textAlign: 'center' }, shortcutDetail: { fontSize: 10, color: p.muted, marginTop: 5, textAlign: 'center' },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, backgroundColor: '#FCF4E9', borderWidth: 1, borderColor: '#EFE3D2', padding: 15, marginBottom: 25 }, vaccineIcon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 13 }, reminderLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '800', color: '#947047', marginBottom: 5 },
  itemTitle: { fontSize: 13, fontWeight: '700', lineHeight: 20, color: p.ink }, small: { fontSize: 11, lineHeight: 17, color: p.muted, marginTop: 3 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 }, sectionTitle: { fontSize: 19, fontWeight: '800', color: p.ink, letterSpacing: -0.4 }, sectionAction: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 3 }, link: { color: p.rose, fontSize: 12, fontWeight: '700' },
  scheduleCard: { borderWidth: 1, borderColor: p.border, backgroundColor: '#fff', borderRadius: 21, padding: 16, marginBottom: 20 }, activity: { flexDirection: 'row', gap: 12 }, timeColumn: { width: 51, alignItems: 'center', paddingTop: 16 }, time: { fontSize: 11, fontWeight: '700', color: p.muted }, timeline: { width: 1, flex: 1, minHeight: 22, backgroundColor: p.border, marginTop: 9 }, activityBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12 }, activityIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, divider: { borderBottomWidth: 1, borderBottomColor: '#F4EFF1' },
  empty: { alignItems: 'center', paddingHorizontal: 9, paddingVertical: 22, gap: 5 }, emptyIcon: { width: 57, height: 57, borderRadius: 22, backgroundColor: '#FCF0F4', alignItems: 'center', justifyContent: 'center', marginBottom: 7 }, emptyTitle: { color: p.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' }, outlineButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#EACBD5', borderRadius: 12, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, marginTop: 13 }, more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12, minHeight: 44 },
  growthCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EDF4EF', borderRadius: 18, padding: 16, marginBottom: 25 }, growthIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  moments: { gap: 12, paddingBottom: 6 }, moment: { width: 174, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: p.border, backgroundColor: '#fff' }, momentImage: { height: 150, backgroundColor: p.blush, alignItems: 'center', justifyContent: 'center' }, momentCaption: { padding: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 22 }, footerText: { color: p.muted, fontSize: 10, flexShrink: 1, textAlign: 'center' }, errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF1F0', padding: 12, borderRadius: 16, marginBottom: 16 }, pressed: { opacity: 0.72 },
})
