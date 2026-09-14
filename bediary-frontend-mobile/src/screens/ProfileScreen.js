import { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Image, Linking, Modal, Pressable, RefreshControl, ScrollView, Share, Text, TextInput, View } from 'react-native'
import { AppAlert as Alert } from '../utils/appAlert'
import { apiErrorMessage } from '../utils/apiError'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import ScreenHeader from '../components/ScreenHeader'
import PrimaryButton from '../components/PrimaryButton'
import HelpSheet from '../components/HelpSheet'
import { familyApi, profileApi } from '../api/api'
import { colors } from '../theme/colors'
import { styles } from '../theme/styles'
import { useAuth } from '../utils/auth'
import { formatDate, listFromResponse, unwrap } from '../utils/format'

function roleLabel(role) {
  if (role === 'ADMIN') return 'Quản trị hệ thống'
  if (role === 'PARENT') return 'Ba mẹ'
  if (role === 'CAREGIVER') return 'Người chăm sóc'
  if (role === 'DOCTOR') return 'Bác sĩ'
  return 'Người thân'
}

function roleMeta(role) {
  if (role === 'ADMIN') return { icon: 'shield-checkmark-outline', color: '#E65100', bg: '#FFF3E8' }
  if (role === 'PARENT') return { icon: 'ribbon-outline', color: colors.primary, bg: colors.primaryLight }
  if (role === 'CAREGIVER') return { icon: 'hand-left-outline', color: '#7C3AED', bg: '#F0EBFF' }
  if (role === 'DOCTOR') return { icon: 'medical-outline', color: '#2563EB', bg: '#EAF1FF' }
  return { icon: 'eye-outline', color: colors.blue, bg: colors.blueLight }
}

function nextManagedRole(role) {
  if (role === 'CAREGIVER') return 'DOCTOR'
  if (role === 'DOCTOR') return 'VIEWER'
  return 'CAREGIVER'
}

function fileFromAsset(asset) {
  if (!asset?.uri) return null
  const name = asset.fileName || asset.uri.split('/').pop() || `upload-${Date.now()}.jpg`
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType || 'image/jpeg',
  }
}

export default function ProfileScreen({ navigation }) {
  const [showHelp, setShowHelp] = useState(false)
  const { user, logout, updateSession } = useAuth()
  const sessionRef = useRef({ user, updateSession })
  sessionRef.current = { user, updateSession }
  const [profile, setProfile] = useState(null)
  const [journals, setJournals] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBabyAvatar, setUploadingBabyAvatar] = useState(false)
  const [switchingId, setSwitchingId] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  const load = useCallback(async () => {
    // Profile synchronization changes the auth object, but must not trigger another fetch.
    const { user, updateSession } = sessionRef.current
    setRefreshing(true)
    try {
      await Promise.allSettled([
        profileApi.get().then(async (response) => {
          const nextProfile = unwrap(response)
          setProfile(nextProfile)
          await updateSession({
            user: {
              ...user,
              userId: nextProfile.userId || user?.userId,
              email: nextProfile.email || user?.email,
              fullName: nextProfile.fullName || user?.fullName,
              avatarUrl: nextProfile.avatarUrl || user?.avatarUrl,
              familyId: nextProfile.familyId || user?.familyId,
              role: nextProfile.currentUserRole || user?.role,
            },
          })
        }).catch((error) => {
          Alert.alert('Không thể tải hồ sơ', apiErrorMessage(error))
        }).finally(() => setRefreshing(false)),
        familyApi.myJournals().then((response) => {
          setJournals(listFromResponse(response))
        }).catch((error) => {
          Alert.alert('Không thể tải danh sách bé', apiErrorMessage(error))
        }),
      ])
    } catch (error) {
      Alert.alert('Không thể tải hồ sơ', error.response?.data?.message || 'Thử lại sau nhé.')
    } finally {
      setRefreshing(false)
    }
  }, [user?.userId, user?.familyId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const role = profile?.currentUserRole || user?.role
  const canManage = role === 'ADMIN' || role === 'PARENT'
  const meta = roleMeta(role)

  async function saveName() {
    const fullName = nameInput.trim()
    if (!fullName) return
    try {
      setSavingName(true)
      const response = await profileApi.update({ fullName })
      const nextProfile = unwrap(response)
      setProfile(nextProfile)
      await updateSession({ user: { ...user, fullName: nextProfile.fullName || fullName, avatarUrl: nextProfile.avatarUrl || user?.avatarUrl } })
      setEditName(false)
    } catch (error) {
      Alert.alert('Không thể cập nhật tên', error.response?.data?.message || 'Thử lại sau nhé.')
    } finally {
      setSavingName(false)
    }
  }

  async function pickAndUpload(kind, source = 'library') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(source === 'camera' ? 'Cần quyền camera' : 'Cần quyền truy cập ảnh', source === 'camera' ? 'Cho phép Bediary mở camera để chụp ảnh đại diện nhé.' : 'Cho phép Bediary chọn ảnh từ thư viện nhé.')
      return
    }
    const options = {
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
    if (result.canceled) return
    const file = fileFromAsset(result.assets?.[0])
    if (!file) return

    try {
      if (kind === 'baby') {
        setUploadingBabyAvatar(true)
        await familyApi.uploadBabyAvatar(file)
      } else {
        setUploadingAvatar(true)
        const response = await profileApi.uploadAvatar(file)
        const nextProfile = unwrap(response)
        setProfile(nextProfile)
        await updateSession({ user: { ...user, fullName: nextProfile.fullName || user?.fullName, avatarUrl: nextProfile.avatarUrl } })
      }
      await load()
    } catch (error) {
      Alert.alert('Upload thất bại', error.response?.data?.message || 'Kiểm tra lại ảnh và thử lại.')
    } finally {
      setUploadingAvatar(false)
      setUploadingBabyAvatar(false)
    }
  }

  function chooseAvatarSource(kind) {
    Alert.alert('Cập nhật ảnh', 'Bạn muốn lấy ảnh từ đâu?', [
      { text: 'Chụp ảnh', onPress: () => pickAndUpload(kind, 'camera') },
      { text: 'Chọn từ thư viện', onPress: () => pickAndUpload(kind, 'library') },
      { text: 'Hủy', style: 'cancel' },
    ])
  }

  async function switchJournal(familyId) {
    try {
      setSwitchingId(familyId)
      const response = await familyApi.switchJournal(familyId)
      const data = unwrap(response)
      await updateSession({
        token: data.newToken,
        user: { ...user, familyId: data.familyId || familyId, role: data.role || user?.role },
      })
      await load()
    } catch (error) {
      Alert.alert('Không thể chuyển hồ sơ bé', error.response?.data?.message || 'Thử lại sau nhé.')
    } finally {
      setSwitchingId(null)
    }
  }

  function linkBabyToFamily() {
    const candidates = journals.filter(journal => !journal.active && ['PARENT', 'ADMIN'].includes(journal.role))
    if (!candidates.length) {
      Alert.alert('Chưa có hồ sơ để gộp', 'Bạn cần có quyền ba mẹ ở hồ sơ bé khác để gộp vào gia đình này.')
      return
    }
    Alert.alert('Chọn hồ sơ bé để gộp', 'Thành viên của hai nhóm sẽ được xem tất cả hồ sơ bé trong nhóm sau khi gộp.', [
      ...candidates.map(journal => ({ text: journal.babyName, onPress: () => {
        Alert.alert('Dùng chung thành viên?', `Gộp hồ sơ ${journal.babyName} vào gia đình đang chọn?`, [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Gộp hồ sơ', onPress: async () => {
            try { await familyApi.linkBaby(journal.familyId); await load() }
            catch (error) { Alert.alert('Không thể gộp', error.response?.data?.message || 'Vui lòng thử lại.') }
          } },
        ])
      } })),
      { text: 'Hủy', style: 'cancel' },
    ])
  }

  async function shareInviteCode() {
    if (!profile?.inviteCode) return
    await Share.share({ message: `Mã mời gia đình Bediary: ${profile.inviteCode}` })
  }

  async function removeMember() {
    if (!removeTarget) return
    try {
      await familyApi.removeMember(removeTarget.userId || removeTarget.id)
      setRemoveTarget(null)
      await load()
    } catch (error) {
      Alert.alert('Không thể xóa thành viên', error.response?.data?.message || 'Thử lại sau nhé.')
    }
  }

  async function changeRole(member, nextRole) {
    try {
      await familyApi.changeMemberRole(member.userId || member.id, nextRole)
      await load()
    } catch (error) {
      Alert.alert('Không thể đổi vai trò', error.response?.data?.message || 'Thử lại sau nhé.')
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Hồ sơ" subtitle="Thông tin tài khoản và gia đình" />

        <View style={{ alignItems: 'center', paddingTop: 8, marginBottom: 28 }}>
          <Pressable onPress={() => chooseAvatarSource('user')} style={{ position: 'relative', marginBottom: 16 }}>
            <Avatar size={120} uri={profile?.avatarUrl || user?.avatarUrl} name={profile?.fullName || user?.fullName} />
            <View style={{ position: 'absolute', right: 4, bottom: 4, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              {uploadingAvatar ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera-outline" size={18} color="#fff" />}
            </View>
          </Pressable>

          {editName ? (
            <View style={{ width: '100%', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput placeholderTextColor="#787078" value={nameInput} onChangeText={setNameInput} autoFocus placeholder="Tên của bạn" style={[styles.input, { flex: 1, textAlign: 'center' }]} />
              <Pressable onPress={saveName} disabled={savingName} style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                {savingName ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={22} color="#fff" />}
              </Pressable>
              <Pressable onPress={() => setEditName(false)} style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={20} color={colors.text2} />
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{profile?.fullName || user?.fullName || 'Người dùng'}</Text>
              <Pressable onPress={() => { setNameInput(profile?.fullName || user?.fullName || ''); setEditName(true) }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="pencil-outline" size={14} color={colors.text2} />
              </Pressable>
            </View>
          )}

          <Text style={{ marginTop: 4, color: colors.hint, fontSize: 13 }}>{profile?.email || user?.email}</Text>
          <View style={{ marginTop: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: meta.bg, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={{ color: meta.color, fontSize: 12, fontWeight: '800' }}>{roleLabel(role)}</Text>
          </View>
        </View>

        <BabyJournalSwitcher
          journals={journals}
          canManage={canManage}
          switchingId={switchingId}
          uploadingBabyAvatar={uploadingBabyAvatar}
          onSwitch={switchJournal}
          onUploadBabyAvatar={() => chooseAvatarSource('baby')}
          onAdd={() => navigation.navigate('FamilySetup')}
        />

        {canManage ? <Pressable accessibilityRole="button" onPress={linkBabyToFamily} style={[styles.card, { marginBottom: 16 }]}><Text style={{ color: colors.primaryDark, fontWeight: '700' }}>Gộp hồ sơ bé vào gia đình</Text><Text style={{ marginTop: 4, color: colors.text2, fontSize: 12 }}>Dùng chung thành viên cho các bé đã tạo trước đây.</Text></Pressable> : null}
        {canManage && profile?.inviteCode ? <InviteCard code={profile.inviteCode} onShare={shareInviteCode} /> : null}

        {profile?.babyName ? (
          <View style={[styles.card, { marginBottom: 16 }]}>
            <CardTitle icon="happy-outline" title="Thông tin bé" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
              <InfoTile label="Tên bé" value={`${profile.babyGender === 'FEMALE' ? 'Bé gái' : 'Bé trai'} ${profile.babyName}`} />
              <InfoTile label="Tuổi" value={profile.babyAgeText || '--'} />
              <InfoTile label="Ngày sinh" value={formatDate(profile.babyDob)} />
              <InfoTile label="Giới tính" value={profile.babyGender === 'FEMALE' ? 'Bé gái' : 'Bé trai'} />
            </View>
          </View>
        ) : null}

        <View style={[styles.card, { marginBottom: 16 }]}>
          <CardTitle icon="people-outline" title="Thành viên" subtitle={`${profile?.members?.length || 0} người`} />
          <View style={{ marginTop: 8 }}>
            {(profile?.members || []).map((member, index) => (
              <MemberRow
                key={member.userId || index}
                member={member}
                isMe={(member.userId || member.id) === profile?.userId}
                canManage={canManage}
                isLast={index === (profile?.members || []).length - 1}
                onRemove={() => setRemoveTarget(member)}
                onChangeRole={changeRole}
              />
            ))}
            {(!profile?.members || profile.members.length === 0) ? (
              <Text style={{ color: colors.hint, textAlign: 'center', paddingVertical: 16 }}>Chưa có thành viên nào.</Text>
            ) : null}
          </View>
          <View style={{ backgroundColor: colors.primaryPale, borderRadius: 12, padding: 12, marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontSize: 12, lineHeight: 19 }}>
              Chia sẻ mã mời để ông bà, người thân cùng xem nhật ký của bé. Người mới tham gia mặc định là Người thân.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { padding: 0, overflow: 'hidden', marginBottom: 16 }]}>
          <SettingRow icon="notifications-outline" title="Thông báo" onPress={() => navigation.navigate('Notifications')} />
          <SettingRow icon="lock-closed-outline" title="Quyền truy cập thiết bị" onPress={() => Linking.openSettings().catch(() => Alert.alert('Không mở được cài đặt', 'Mở Cài đặt trên điện thoại, chọn Bediary để quản lý quyền truy cập.'))} />
          <SettingRow icon="help-circle-outline" title="Trợ giúp" onPress={() => setShowHelp(true)} isLast />
        </View>

        <Pressable onPress={logout} style={{ height: 52, borderRadius: 16, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <Ionicons name="log-out-outline" size={18} color="#C9335C" />
          <Text style={{ color: '#C9335C', fontSize: 15, fontWeight: '800' }}>Đăng xuất</Text>
        </Pressable>

        <Text style={{ marginTop: 16, textAlign: 'center', color: colors.hint, fontSize: 11 }}>Bediary v1.0 · Bảo vệ dữ liệu gia đình bạn</Text>
      </ScrollView>

      {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}
      <Modal visible={Boolean(removeTarget)} transparent animationType="fade" onRequestClose={() => setRemoveTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(17,24,39,.46)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 42, textAlign: 'center' }}>!</Text>
            <Text style={{ marginTop: 8, color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Xóa thành viên?</Text>
            <Text style={{ marginTop: 8, color: colors.text2, fontSize: 14, lineHeight: 21, textAlign: 'center' }}>
              {removeTarget?.fullName || 'Thành viên'} sẽ không còn xem được nhật ký của bé.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <Pressable onPress={() => setRemoveTarget(null)} style={{ flex: 1, height: 48, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.text2, fontWeight: '800' }}>Hủy</Text>
              </Pressable>
              <Pressable onPress={removeMember} style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: '#C9335C', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Avatar({ uri, name, size }) {
  const initials = (name || '?').split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, borderWidth: 3, borderColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: '#fff', fontSize: size * 0.35, fontWeight: '800' }}>{initials}</Text>}
    </View>
  )
}

function CardTitle({ icon, title, subtitle }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[styles.iconTile, { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{title}</Text>
        {subtitle ? <Text style={{ marginTop: 2, color: colors.hint, fontSize: 12 }}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

function BabyJournalSwitcher({ journals, canManage, switchingId, uploadingBabyAvatar, onSwitch, onUploadBabyAvatar, onAdd }) {
  return (
    <View style={[styles.card, { marginBottom: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <CardTitle icon="happy-outline" title="Hồ sơ bé" subtitle="Chọn bé đang theo dõi" />
      </View>

      {(journals || []).map((journal) => {
        const active = Boolean(journal.active)
        return (
          <Pressable
            key={journal.familyId}
            disabled={switchingId === journal.familyId || active}
            onPress={() => onSwitch(journal.familyId)}
            style={{ borderRadius: 16, borderWidth: active ? 1.5 : 1, borderColor: active ? '#FF8FAB' : colors.border, backgroundColor: active ? colors.primaryPale : colors.surface, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Pressable disabled={!active || !canManage || uploadingBabyAvatar} onPress={onUploadBabyAvatar}>
              <Avatar size={46} uri={journal.babyAvatarUrl} name={journal.babyName} />
              {active && canManage ? (
                <View style={{ position: 'absolute', right: -1, bottom: -1, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  {uploadingBabyAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera-outline" size={11} color="#fff" />}
                </View>
              ) : null}
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{journal.babyName || 'Bé yêu'}</Text>
              <Text style={{ marginTop: 3, color: colors.hint, fontSize: 12, fontWeight: '600' }}>{roleLabel(journal.role)}{journal.babyDob ? ` · ${formatDate(journal.babyDob)}` : ''}</Text>
            </View>
            {active ? <Text style={{ color: colors.primary, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' }}>Đang chọn</Text> : <Ionicons name="chevron-forward" size={17} color={colors.hint} />}
          </Pressable>
        )
      })}

      {canManage ? <Pressable onPress={onAdd} style={{ height: 44, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FFB3CE', backgroundColor: colors.primaryPale, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '800' }}>Thêm hồ sơ bé mới</Text>
      </Pressable> : null}
    </View>
  )
}

function InviteCard({ code, onShare }) {
  return (
    <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 20, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,.86)', fontSize: 13 }}>Mã mời gia đình</Text>
          <Text style={{ marginTop: 4, color: 'rgba(255,255,255,.72)', fontSize: 11 }}>Chia sẻ để người thân cùng xem nhật ký</Text>
        </View>
        <Ionicons name="share-social-outline" size={20} color="rgba(255,255,255,.86)" />
      </View>
      <View style={{ backgroundColor: 'rgba(255,255,255,.2)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 4 }}>{code || '------'}</Text>
        <Pressable onPress={onShare} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="share-outline" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}

function InfoTile({ label, value }) {
  return (
    <View style={{ width: '47%', backgroundColor: colors.primaryPale, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: colors.hint, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{label}</Text>
      <Text numberOfLines={2} style={{ marginTop: 5, color: colors.text, fontSize: 13, fontWeight: '800', lineHeight: 18 }}>{value}</Text>
    </View>
  )
}

function MemberRow({ member, isMe, canManage, isLast, onRemove, onChangeRole }) {
  const meta = roleMeta(member.role)
  const protectedRole = member.role === 'ADMIN' || member.role === 'PARENT'
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.borderSoft }}>
      <Avatar size={46} uri={member.avatarUrl} name={member.fullName} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{member.fullName || 'Người dùng'}</Text>
          {isMe ? <Text style={{ color: colors.primary, backgroundColor: colors.primaryLight, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, fontSize: 10, fontWeight: '800' }}>Bạn</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={{ color: meta.color, fontSize: 12, fontWeight: '700' }}>{member.roleLabel || roleLabel(member.role)}</Text>
        </View>
      </View>
      {canManage && !isMe && !protectedRole ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => onChangeRole(member, nextManagedRole(member.role))} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryPale, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
          </Pressable>
          <Pressable onPress={onRemove} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={16} color="#C9335C" />
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function SettingRow({ icon, title, subtitle, right, isLast, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: colors.borderSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
          {subtitle ? <Text style={{ marginTop: 2, color: colors.hint, fontSize: 11, lineHeight: 15 }}>{subtitle}</Text> : null}
        </View>
      </View>
      {right || <Ionicons name="chevron-forward" size={16} color={colors.hint} />}
    </Pressable>
  )
}
