import axios from 'axios'

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL
  if (configured) return configured

  const { protocol, hostname } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (!isLocalhost) {
    return `${protocol}//${hostname}:8080/api/v1`
  }
  return '/api/v1'
}

function showForbiddenToast(message) {
  const existing = document.getElementById('bediary-403-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'bediary-403-toast'
  toast.textContent = message
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#fff',
    border: '1.5px solid #FFD6E4',
    color: '#C9335C',
    padding: '10px 20px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    boxShadow: '0 4px 20px rgba(255,92,138,0.2)',
    zIndex: '9999',
    whiteSpace: 'nowrap',
    opacity: '1',
    transition: 'opacity 0.4s ease',
  })
  document.body.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 400)
  }, 2800)
}

function persistAuthSession(data) {
  if (!data?.token) return
  localStorage.setItem('bediary_token', data.token)

  let previous = {}
  try {
    previous = JSON.parse(localStorage.getItem('bediary_user') || '{}')
  } catch {
    previous = {}
  }
  localStorage.setItem('bediary_user', JSON.stringify({
    ...previous,
    userId: data.userId,
    email: data.email,
    fullName: data.fullName,
    familyId: data.familyId,
    role: data.role,
  }))
}

function clearAuthSession(message) {
  localStorage.removeItem('bediary_token')
  localStorage.removeItem('bediary_user')
  localStorage.setItem(
    'bediary_auth_message',
    message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  )
}

const baseURL = resolveApiBaseUrl()
const BACKGROUND_AUTH_URLS = ['/notifications/unread-count']

const refreshClient = axios.create({
  baseURL,
  timeout: 10000,
  // Browser sends HttpOnly refresh cookie only when credentials are enabled.
  withCredentials: true,
})

const axiosClient = axios.create({
  baseURL,
  timeout: 10000,
  // Required for login/refresh so Set-Cookie and Cookie work across localhost/LAN ports.
  withCredentials: true,
})

let refreshPromise = null

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh-token')
      .then((response) => {
        persistAuthSession(response.data)
        return response.data.token
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  // Single-flight guard: concurrent 401 requests wait for the same refresh call.
  return refreshPromise
}

function shouldAttemptRefresh(error) {
  const status = error.response?.status
  const config = error.config || {}
  const url = config.url || ''

  return status === 401
    && !config._retry
    && !url.includes('/auth/login')
    && !url.includes('/auth/register')
    && !url.includes('/auth/refresh-token')
    && !url.includes('/auth/logout')
}

function isBackgroundAuthRequest(config = {}) {
  const url = config.url || ''
  return Boolean(config.skipAuthRedirect)
    || BACKGROUND_AUTH_URLS.some((path) => url.includes(path))
}

function rememberAuthError(error, phase) {
  const config = error.config || {}
  const payload = {
    phase,
    url: config.url || '',
    status: error.response?.status || null,
    message: error.response?.data?.message || error.message || '',
    at: new Date().toISOString(),
  }
  localStorage.setItem('bediary_last_auth_error', JSON.stringify(payload))
}

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bediary_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || ''
    const originalRequest = error.config || {}

    if (shouldAttemptRefresh(error)) {
      originalRequest._retry = true
      try {
        const newAccessToken = await refreshAccessToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return axiosClient(originalRequest)
      } catch (refreshError) {
        rememberAuthError(refreshError, 'refresh-failed')
        if (!isBackgroundAuthRequest(originalRequest)) {
          clearAuthSession(refreshError.response?.data?.message || message)
        }
        if (!isBackgroundAuthRequest(originalRequest) && window.location.pathname !== '/login') {
          window.location.replace('/login')
        }
        return Promise.reject(refreshError)
      }
    }

    if (status === 401) {
      rememberAuthError(error, 'unauthorized')
      if (!isBackgroundAuthRequest(originalRequest)) {
        clearAuthSession(message)
      }
      if (!isBackgroundAuthRequest(originalRequest) && window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    if (status === 409 && message.includes('has not joined any family')) {
      window.location.href = '/family-setup'
    }
    if (status === 403) {
      const msg = message || 'Chỉ ba/mẹ mới có thể thực hiện hành động này'
      showForbiddenToast(msg)
    }
    return Promise.reject(error)
  }
)

export default axiosClient
