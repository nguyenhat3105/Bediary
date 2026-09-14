import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function unwrap(response) {
  return response?.data ?? response
}

export function listFromResponse(response) {
  const data = unwrap(response)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.logs)) return data.logs
  if (Array.isArray(data?.activityLogs)) return data.activityLogs
  if (Array.isArray(data?.activities)) return data.activities
  return []
}

export function todayIso() {
  const today = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

export function formatDate(value) {
  if (!value) return '--'
  try {
    return format(new Date(value), 'dd/MM/yyyy', { locale: vi })
  } catch {
    return value
  }
}
