import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { buildReminderPlan } from './reminderPlan.mjs'

const CHANNEL_ID = 'bediary-reminders'
const DAILY_VACCINE_KEY_PREFIX = 'bediary:last-device-vaccine-reminder'

let notificationsModule = null
let handlerConfigured = false
let permissionRequested = false

function isExpoGo() {
  return Constants.appOwnership === 'expo'
}

async function getNotifications() {
  if (isExpoGo()) return null
  if (!notificationsModule) {
    notificationsModule = await import('expo-notifications')
  }
  if (!handlerConfigured) {
    notificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
    handlerConfigured = true
  }
  return notificationsModule
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function toDateOnly(value) {
  if (!value) return null
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function daysUntil(value) {
  const date = toDateOnly(value)
  if (!date) return null
  const today = toDateOnly(new Date())
  return Math.round((date - today) / 86400000)
}

export async function configureDeviceNotifications() {
  const Notifications = await getNotifications()
  if (!Notifications) return false

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Bediary reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF5C8A',
      sound: 'default',
    })
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain || permissionRequested) return false

  permissionRequested = true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

export async function scheduleDeviceNotification({ title, body, data }) {
  const granted = await configureDeviceNotifications()
  if (!granted) return false
  const Notifications = await getNotifications()

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null,
  })
  return true
}

let reminderQueue = Promise.resolve()
export function syncScheduledReminders(options, isCurrent = () => true) {
  const run = async () => {
    const Notifications = await getNotifications()
    if (!Notifications || !isCurrent()) return false
    const prefix = 'bediary:reminder:'
    const pending = await Notifications.getAllScheduledNotificationsAsync()
    if (options?.clearOtherScopes) {
      for (const item of pending.filter(n => n.identifier.startsWith(prefix) && n.content.data?.scope !== options.scope)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier)
      }
      const ledger = JSON.parse(await AsyncStorage.getItem('bediary:reminder-ledger') || '{}')
      const retained = Object.fromEntries(Object.entries(ledger).filter(([id]) => id.startsWith(`${prefix}${options.scope}:`)))
      await AsyncStorage.setItem('bediary:reminder-ledger', JSON.stringify(retained))
      return true
    }
    if (!options?.scope) {
      for (const item of pending.filter(n => n.identifier.startsWith(prefix))) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier)
      }
      await AsyncStorage.removeItem('bediary:reminder-ledger')
      return true
    }
    if (!await configureDeviceNotifications() || !isCurrent()) return false
    const plan = buildReminderPlan(options)
    const wanted = new Map(plan.map(item => [item.id, item]))
    const ledger = JSON.parse(await AsyncStorage.getItem('bediary:reminder-ledger') || '{}')
    const nextLedger = {}
    for (const item of pending.filter(n => n.identifier.startsWith(prefix))) {
      if (!wanted.has(item.identifier) || ledger[item.identifier] !== wanted.get(item.identifier).signature) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier)
      }
    }
    for (const item of plan) {
      if (!isCurrent()) return false
      // Keep delivered reminders in the ledger to avoid repeating them on every refresh.
      if (ledger[item.id] !== item.signature) {
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: { title: item.title, body: item.body, data: item.data, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.fireAt), channelId: CHANNEL_ID },
        })
        ledger[item.id] = item.signature
        await AsyncStorage.setItem('bediary:reminder-ledger', JSON.stringify(ledger))
      }
      nextLedger[item.id] = item.signature
    }
    await AsyncStorage.setItem('bediary:reminder-ledger', JSON.stringify(nextLedger))
    return true
  }
  reminderQueue = reminderQueue.catch(() => {}).then(run)
  return reminderQueue
}

export async function listenToReminderTaps(onTap) {
  const Notifications = await getNotifications()
  if (!Notifications) return () => {}
  const handle = response => {
    const data = response?.notification?.request?.content?.data
    if (data?.reminderId) {
      onTap(data)
      Notifications.clearLastNotificationResponseAsync().catch(() => {})
    }
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(handle)
  handle(await Notifications.getLastNotificationResponseAsync())
  return () => subscription.remove()
}

export async function notifyVaccinationsDueOnDevice(upcomingVaccinations = [], { force = false } = {}) {
  const dueItems = upcomingVaccinations
    .map((item) => ({
      ...item,
      dueInDays: daysUntil(item.scheduledDate || item.date || item.dueDate),
    }))
    .filter((item) => item.dueInDays !== null && item.dueInDays <= 0)

  if (!dueItems.length) return false

  const key = `${DAILY_VACCINE_KEY_PREFIX}:${todayIso()}`
  const marker = dueItems.map((item) => item.id || item.scheduleKey || item.vaccineName || item.name).join('|')
  const previous = await AsyncStorage.getItem(key)
  if (!force && previous === marker) return false

  const overdueCount = dueItems.filter((item) => item.dueInDays < 0).length
  const first = dueItems[0]
  const vaccineName = first.vaccineName || first.name || 'mũi tiêm'
  const title = overdueCount > 0 ? 'Có mũi tiêm quá hạn' : 'Hôm nay có mũi tiêm'
  const body = dueItems.length === 1
    ? `${vaccineName}${first.doseNumber ? ` mũi ${first.doseNumber}` : ''}. Mở Bediary để xem chi tiết.`
    : `Có ${dueItems.length} mũi tiêm cần kiểm tra hôm nay. Mở Bediary để xem chi tiết.`

  const sent = await scheduleDeviceNotification({
    title,
    body,
    data: { type: 'VACCINATION_DUE', count: dueItems.length },
  })

  if (sent && !force) await AsyncStorage.setItem(key, marker)
  return sent
}

export async function notifyVaccinationScheduleDueOnDevice({ babyBirthday, savedRecords = [], schedule = [], force = false }) {
  if (!babyBirthday || !schedule.length) return false

  const recordByKey = new Map()
  savedRecords.forEach((record) => {
    if (record.scheduleKey) recordByKey.set(record.scheduleKey, record)
  })

  const dob = new Date(babyBirthday)
  const dueItems = schedule
    .map((item) => {
      const saved = recordByKey.get(item.key)
      const scheduledDate = saved?.scheduledDate || addMonthsIso(dob, item.months)
      return {
        id: saved?.id || item.key,
        scheduleKey: item.key,
        vaccineName: saved?.vaccineName || item.name,
        doseNumber: saved?.doseNumber ?? item.doseNumber,
        scheduledDate,
        completedAt: saved?.completedAt,
        status: saved?.completedAt ? 'COMPLETED' : (saved?.status || 'SCHEDULED'),
        dueInDays: daysUntil(scheduledDate),
      }
    })
    .filter((item) => !item.completedAt && item.status === 'SCHEDULED' && item.dueInDays !== null && item.dueInDays <= 0)

  return notifyVaccinationsDueOnDevice(dueItems, { force })
}

function addMonthsIso(date, months) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}
