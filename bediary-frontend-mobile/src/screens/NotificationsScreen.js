import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { notificationApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import { listFromResponse } from '../utils/format'
import { apiErrorMessage } from '../utils/apiError'

const TYPE_CONFIG = {
  VACCINATION: ['medical-outline', colors.primaryLight, colors.primaryDark],
  GROWTH_REMINDER: ['resize-outline', colors.successBg, '#438465'],
  NEW_POST: ['image-outline', colors.blueLight, '#397F9E'],
  ROUTINE: ['time-outline', colors.warningBg, '#9B7138'],
  STREAK: ['flame-outline', colors.primaryLight, colors.primaryDark],
  MILESTONE: ['sparkles-outline', colors.purpleLight, colors.purple],
}

function isRead(item) {
  return item.isRead ?? item.read ?? false
}

function timeAgo(value) {
  const timestamp = new Date(value).getTime()
  if (!value || !Number.isFinite(timestamp)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
  return `${Math.floor(minutes / 1440)} ngày trước`
}

export default function NotificationsScreen({ navigation }) {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [refreshing, setRefreshing] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(null)
  const [marking, setMarking] = useState(false)
  const version = useRef(0)
  const mutation = useRef(false)
  const paging = useRef(false)

  const load = useCallback(async () => {
    const request = ++version.current
    setRefreshing(true)
    setError(null)
    try {
      const response = await notificationApi.list(0)
      if (request !== version.current) return
      setItems(listFromResponse(response))
      setUnreadCount(response.data?.unreadCount ?? 0)
      setPage(0)
      setHasMore((response.data?.totalPages ?? 1) > 1)
    } catch (failure) {
      if (request === version.current) setError(apiErrorMessage(failure))
    } finally {
      if (request === version.current) setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    load()
    return () => { version.current += 1 }
  }, [load]))

  async function loadMore() {
    if (paging.current || refreshing || mutation.current || !hasMore) return
    paging.current = true
    const request = version.current
    setLoadingMore(true)
    setError(null)
    try {
      const response = await notificationApi.list(page + 1)
      if (request !== version.current) return
      const next = listFromResponse(response)
      setItems(previous => [...previous, ...next.filter(item => !previous.some(existing => existing.id === item.id))])
      setPage(page + 1)
      setHasMore(page + 2 < (response.data?.totalPages ?? 1))
      setUnreadCount(response.data?.unreadCount ?? 0)
    } catch (failure) {
      if (request === version.current) setError(apiErrorMessage(failure))
    } finally {
      paging.current = false
      setLoadingMore(false)
    }
  }

  async function markRead(item) {
    if (mutation.current || refreshing || paging.current || (item && isRead(item))) return
    mutation.current = true
    const request = version.current
    setMarking(true)
    setError(null)
    try {
      if (item) await notificationApi.markRead(item.id)
      else await notificationApi.markAllRead()
      if (request !== version.current) return
      setItems(previous => previous.map(entry => !item || entry.id === item.id ? { ...entry, isRead: true, read: true } : entry))
      setUnreadCount(count => item ? Math.max(0, count - 1) : 0)
    } catch (failure) {
      if (request === version.current) setError(apiErrorMessage(failure))
    } finally {
      mutation.current = false
      setMarking(false)
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} enabled={!marking} />}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => navigation.goBack()} style={s.back}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable>
        <View style={s.flex}><Text style={s.title}>Thông báo</Text><Text style={s.subtitle}>Cập nhật từ Bediary và gia đình</Text></View>
      </View>

      <View style={s.summary}>
        <Text style={s.summaryText}>{unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Hộp thông báo của bạn'}</Text>
        {unreadCount > 0 ? <Pressable accessibilityRole="button" disabled={marking || refreshing || loadingMore} onPress={() => markRead()} style={s.readAll}>
          {marking ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <Ionicons name="checkmark-done-outline" size={17} color={colors.primaryDark} />}
          <Text style={s.link}>Đọc tất cả</Text>
        </Pressable> : null}
      </View>

      {error ? <View accessibilityRole="alert" style={s.error}><Ionicons name="cloud-offline-outline" size={22} color={colors.primaryDark} /><Text style={[s.subtitle, s.flex]}>{error}</Text></View> : null}

      <View style={s.list}>
        {items.length ? items.map((item, index) => <NotificationRow key={item.id || index} item={item} last={index === items.length - 1} disabled={marking || refreshing || loadingMore} onPress={() => markRead(item)} />)
          : <View style={s.empty}>
            {refreshing ? <ActivityIndicator color={colors.primary} /> : <View style={s.emptyIcon}><Ionicons name={error ? 'cloud-offline-outline' : 'notifications-outline'} size={30} color={colors.primaryDark} /></View>}
            <Text style={s.emptyTitle}>{refreshing ? 'Đang tải thông báo…' : error ? 'Chưa tải được thông báo' : 'Chưa có thông báo nào'}</Text>
            <Text style={s.emptyText}>{error ? 'Kéo xuống để thử lại.' : 'Các cập nhật mới về bé và gia đình sẽ xuất hiện tại đây.'}</Text>
          </View>}
      </View>
      {hasMore ? <Pressable accessibilityRole="button" disabled={loadingMore || refreshing || marking} onPress={loadMore} style={s.more}>{loadingMore ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={s.link}>Xem thông báo trước đó</Text>}</Pressable> : null}
    </ScrollView>
  )
}

function NotificationRow({ item, last, onPress, disabled }) {
  const [icon, bg, color] = TYPE_CONFIG[item.type] || ['notifications-outline', colors.primaryLight, colors.primaryDark]
  const unread = !isRead(item)
  return <Pressable accessibilityRole="button" accessibilityLabel={`${unread ? 'Chưa đọc. ' : ''}${item.title || 'Thông báo'}. ${item.body || item.message || ''}`} disabled={disabled || !unread} onPress={onPress}
    style={({ pressed }) => [s.notification, !last && s.divider, unread && s.unread, pressed && { opacity: 0.7 }]}>
    <View style={[s.icon, { backgroundColor: bg }]}><Ionicons name={icon} size={21} color={color} /></View>
    <View style={s.flex}>
      <Text style={[s.itemTitle, unread && { fontWeight: '800' }]}>{item.title || 'Thông báo mới'}</Text>
      {item.body || item.message ? <Text style={s.body}>{item.body || item.message}</Text> : null}
      <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
    </View>
    {unread ? <View style={s.dot} /> : null}
  </Pressable>
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  back: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: colors.text2, fontSize: 12, lineHeight: 19, marginTop: 3 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  summaryText: { color: colors.text2, fontSize: 12, fontWeight: '600' },
  readAll: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 10 },
  link: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  list: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  notification: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  unread: { backgroundColor: '#FFF4F7' },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  body: { color: colors.text2, fontSize: 13, lineHeight: 20, marginTop: 4 },
  time: { marginTop: 8, color: colors.text2, fontSize: 10 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 8 },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 44, gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: colors.text2, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.dangerBg, marginBottom: 14 },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
})
