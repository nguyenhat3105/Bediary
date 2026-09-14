// Accept display dates and API dates without timezone conversion or date rollover.
export function normalizeBirthDate(value) {
  const text = String(value || '').trim()
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const display = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!iso && !display) return null
  const [year, month, day] = iso
    ? iso.slice(1).map(Number)
    : [Number(display[3]), Number(display[2]), Number(display[1])]
  if (year < 1 || month < 1 || month > 12 || day < 1) return null
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (day > days[month - 1]) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
