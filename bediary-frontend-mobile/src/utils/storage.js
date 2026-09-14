import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'bediary_token'
const USER_KEY = 'bediary_user'

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token) {
  if (!token) return SecureStore.deleteItemAsync(TOKEN_KEY)
  return SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function setStoredUser(user) {
  if (!user) return AsyncStorage.removeItem(USER_KEY)
  return AsyncStorage.setItem(USER_KEY, JSON.stringify(user))
}

export async function clearSession() {
  await Promise.all([setToken(null), setStoredUser(null)])
}
