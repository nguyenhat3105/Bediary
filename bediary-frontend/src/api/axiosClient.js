import axios from 'axios'

const axiosClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request interceptor — attach JWT token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bediary_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401/403
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || ''

    if (status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      localStorage.removeItem('bediary_token')
      localStorage.removeItem('bediary_user')
      window.location.href = '/login'
    }
    if (status === 409 && message.includes('has not joined any family')) {
      window.location.href = '/family-setup'
    }
    if (status === 403) {
      console.warn('[Bediary] 403 Forbidden — insufficient permissions (VIEWER role attempted write)')
    }
    return Promise.reject(error)
  }
)

export default axiosClient
