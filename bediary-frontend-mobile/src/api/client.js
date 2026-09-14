import axios from 'axios'
import { DeviceEventEmitter } from 'react-native'
import { clearSession, getToken, setStoredUser, setToken } from '../utils/storage'

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8080/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
})

let unauthorizedHandler = null
let isHandlingUnauthorized = false

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

async function handleUnauthorizedSession() {
  if (isHandlingUnauthorized) return
  isHandlingUnauthorized = true
  try {
    await clearSession()
    if (unauthorizedHandler) {
      unauthorizedHandler()
    }
  } finally {
    isHandlingUnauthorized = false
  }
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    const { method, url = '' } = response.config
    if (method !== 'get' && /^\/(vaccinations|health-records|health-subjects|profile)(\/|$)/.test(url)) {
      DeviceEventEmitter.emit('bediary:reminders-changed')
    }
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      await handleUnauthorizedSession()
    }
    return Promise.reject(error)
  }
)

export async function persistLogin(data) {
  if (!data?.token) return
  await setToken(data.token)
  await setStoredUser({
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
    familyId: data.familyId,
    role: data.role,
  })
}

export default apiClient
