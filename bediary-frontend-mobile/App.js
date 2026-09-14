import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { ActivityIndicator, AppState, DeviceEventEmitter, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import ErrorBoundary from './src/components/ErrorBoundary'
import AppAlertHost from './src/components/AppAlertHost'
import { AuthProvider, useAuth } from './src/utils/auth'
import { colors } from './src/theme/colors'
import { dashboardApi, healthApi, healthSubjectApi, vaccinationApi } from './src/api/api'
import { listenToReminderTaps, syncScheduledReminders } from './src/utils/deviceNotifications'
import { VACCINE_SCHEDULE } from './src/screens/VaccinationScreen'

const navigationRef = createNavigationContainerRef()

function AppShell() {
  const { booting, isSignedIn, user } = useAuth()

  useEffect(() => {
    if (booting || !isSignedIn || !user?.familyId) return
    let disposed = false
    let remove
    listenToReminderTaps(data => {
      if (!disposed && data.scope === `${user.userId}:${user.familyId}` && navigationRef.isReady()) {
        navigationRef.navigate('Tabs', { screen: data.type === 'VACCINATION' ? 'Vaccination' : 'Health' })
      }
    }).then(cleanup => { if (disposed) cleanup(); else remove = cleanup }).catch(error => console.warn('Reminder tap setup failed', error.message))
    return () => { disposed = true; remove?.() }
  }, [booting, isSignedIn, user?.userId, user?.familyId])

  useEffect(() => {
    if (booting) return
    let cancelled = false
    let running = false
    let requested = false

    async function syncDeviceNotifications() {
      if (running) { requested = true; return }
      running = true
      try {
        if (!isSignedIn || !user?.familyId) {
          await syncScheduledReminders(null, () => !cancelled)
          return
        }
        await syncScheduledReminders({ scope: `${user.userId}:${user.familyId}`, clearOtherScopes: true }, () => !cancelled)
        const [dashboardRes, vaccinationRes, babyHealth, subjects] = await Promise.all([
          dashboardApi.get(),
          vaccinationApi.list(),
          healthApi.list(),
          healthSubjectApi.list(),
        ])
        const asList = response => response.data?.content || response.data || []
        const relativeHealth = await Promise.all(asList(subjects).map(s => healthApi.list(undefined, s.id)))
        if (!cancelled) {
          const dashboard = dashboardRes.data
          await syncScheduledReminders({
            scope: `${user.userId}:${user.familyId}`,
            babyBirthday: dashboard?.babyBirthday || dashboard?.babyDob,
            savedRecords: asList(vaccinationRes),
            healthRecords: [...asList(babyHealth), ...relativeHealth.flatMap(asList)],
            schedule: VACCINE_SCHEDULE,
          }, () => !cancelled)
        }
      } catch (error) {
        console.warn('Reminder sync failed', error.message)
      } finally {
        running = false
        if (requested && !cancelled) { requested = false; syncDeviceNotifications() }
      }
    }

    syncDeviceNotifications()
    const foreground = AppState.addEventListener('change', state => {
      if (state === 'active') syncDeviceNotifications()
    })
    const changes = DeviceEventEmitter.addListener('bediary:reminders-changed', syncDeviceNotifications)
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') syncDeviceNotifications()
    }, 60000)
    return () => { cancelled = true; foreground.remove(); changes.remove(); clearInterval(interval) }
  }, [booting, isSignedIn, user?.userId, user?.familyId])

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }
  return <RootNavigator />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ErrorBoundary>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style="dark" backgroundColor={colors.bg} />
              <AppShell />
              <AppAlertHost />
            </NavigationContainer>
          </SafeAreaView>
        </ErrorBoundary>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
