export function measurement(value) {
  if (value == null || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

export function measurementLabel(value, unit) {
  const number = measurement(value)
  return number === null ? 'Chưa có dữ liệu' : `${number.toFixed(1)} ${unit}`
}

export function timePosition(value, first, last, left, width) {
  const span = last - first
  return span > 0 ? left + ((value - first) / span) * width : left + width / 2
}

export function labelLeft(x, labelWidth, chartWidth) {
  return Math.max(0, Math.min(x - labelWidth / 2, chartWidth - labelWidth))
}
