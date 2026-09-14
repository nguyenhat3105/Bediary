import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'
import { useAuth } from '../utils/auth'
import AiScreen from '../screens/AiScreen'
import DoctorShareScreen from '../screens/DoctorShareScreen'
import FamilySetupScreen from '../screens/FamilySetupScreen'
import GrowthScreen from '../screens/GrowthScreen'
import HealthScreen from '../screens/HealthScreen'
import HomeScreen from '../screens/HomeScreen'
import LoginScreen from '../screens/LoginScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import RegisterScreen from '../screens/RegisterScreen'
import TrackingScreen from '../screens/TrackingScreen'
import VaccinationScreen from '../screens/VaccinationScreen'
import WelcomeScreen from '../screens/WelcomeScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function Tabs({ navigation }) {
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 10)
  const tabBarHeight = 64 + bottomInset
  const tabs = [
    { name: 'Home', component: HomeScreen, label: 'Trang chủ', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Tracking', component: TrackingScreen, label: 'Nhật ký', icon: 'calendar-outline', activeIcon: 'calendar' },
    { name: 'Growth', component: GrowthScreen, label: 'Tăng trưởng', icon: 'trending-up-outline', activeIcon: 'trending-up' },
    { name: 'Vaccination', component: VaccinationScreen, label: 'Tiêm chủng', icon: 'needle', activeIcon: 'needle' },
    { name: 'Health', component: HealthScreen, label: 'Sổ sức khỏe', icon: 'heart-outline', activeIcon: 'heart' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tab.Navigator
        screenOptions={({ route }) => {
          const item = tabs.find((tab) => tab.name === route.name)
          return {
            headerShown: false,
            tabBarLabel: item?.label,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.hint,
            tabBarStyle: {
              height: 64,
              marginHorizontal: 12,
              marginBottom: bottomInset,
              borderRadius: 32,
              paddingTop: 8,
              paddingBottom: 8,
              paddingHorizontal: 6,
              borderWidth: 1,
              borderColor: '#EFCAD7',
              borderTopWidth: 1,
              borderTopColor: '#EFCAD7',
              backgroundColor: 'rgba(255,255,255,0.98)',
              shadowColor: '#231C22',
              shadowOpacity: 0.08,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: -4 },
              elevation: 8,
            },
            tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700', marginTop: 2 },
            tabBarIcon: ({ color, focused }) => route.name === 'Vaccination'
              ? <MaterialCommunityIcons name="needle" size={23} color={color} />
              : <Ionicons name={focused ? item?.activeIcon : item?.icon} size={21} color={color} />,
          }
        }}
      >
        {tabs.map((tab) => <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />)}
      </Tab.Navigator>

      <Pressable
        onPress={() => navigation.navigate('Ai')}
        accessibilityRole="button"
        accessibilityLabel="Mở trợ lý AI"
        accessibilityHint="Hỏi đáp về chăm sóc bé"
        style={({ pressed }) => ({
          position: 'absolute',
          right: 18,
          bottom: tabBarHeight + 14,
          height: 58,
          width: 58,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: '#BAE6FD',
          backgroundColor: pressed ? '#075985' : '#0284C7',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          shadowColor: '#0284C7',
          shadowOpacity: 0.34,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        })}
      >
        <MaterialCommunityIcons name="robot-happy-outline" size={29} color="#fff" />
      </Pressable>
    </View>
  )
}

export default function RootNavigator() {
  const { isSignedIn, user } = useAuth()
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!isSignedIn ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : !user?.familyId ? (
        <Stack.Screen navigationKey="initial-family-setup" name="FamilySetup" component={FamilySetupScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Ai" component={AiScreen} />
          <Stack.Screen name="DoctorShare" component={DoctorShareScreen} />
          <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}
