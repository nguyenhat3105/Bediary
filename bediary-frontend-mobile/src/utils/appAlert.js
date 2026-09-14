let queue = []
let sequence = 0
const listeners = new Set()
const emit = () => listeners.forEach(listener => listener())

export const subscribeAlerts = listener => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const getCurrentAlert = () => queue[0] || null

export const AppAlert = {
  alert(title, message = '', buttons, options = {}) {
    queue = [...queue, { id: ++sequence, title, message,
      buttons: buttons?.length ? buttons : [{ text: 'Đã hiểu' }], options }]
    emit()
  },
}

export function closeAlert(id, buttonIndex) {
  const current = queue[0]
  if (!current || current.id !== id) return
  const button = current.buttons[buttonIndex]
  queue = queue.slice(1)
  emit()
  // Release the native modal before callbacks open a camera or another dialog.
  setTimeout(async () => {
    try {
      if (button) await button.onPress?.()
      else current.options.onDismiss?.()
    } catch {
      AppAlert.alert('Chưa thực hiện được', 'Vui lòng thử lại sau ít phút.')
    }
  }, 200)
}
