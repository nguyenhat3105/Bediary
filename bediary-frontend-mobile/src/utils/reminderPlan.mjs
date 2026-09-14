export function localDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d, 8)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function buildReminderPlan({ scope, babyBirthday, savedRecords = [], schedule = [], healthRecords = [], now = new Date() }) {
  const records = new Map(savedRecords.filter(r => r.scheduleKey).map(r => [r.scheduleKey, r]))
  const dob = localDate(babyBirthday)
  const vaccines = [...savedRecords.filter(r => !schedule.some(s => s.key === r.scheduleKey))]
  for (const item of schedule) {
    const saved = records.get(item.key)
    if (!saved && !dob) continue
    let date = null
    if (dob) {
      date = new Date(dob.getFullYear(), dob.getMonth() + item.months, 1, 8)
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
      date.setDate(Math.min(dob.getDate(), lastDay))
    }
    vaccines.push({ id: item.key, vaccineName: item.name, doseNumber: item.doseNumber,
      scheduledDate: date && dateKey(date), ...saved })
  }
  const events = vaccines.filter(r => !r.completedAt && (!r.status || r.status === 'SCHEDULED')).map(r => ({
    id: `vaccine:${r.id}`, type: 'VACCINATION', date: r.scheduledDate,
    label: `${r.vaccineName}${r.doseNumber ? ` mũi ${r.doseNumber}` : ''}`,
  }))
  for (const r of healthRecords) {
    const dates = new Set([r.recordType === 'CHECKUP' ? r.eventDate : null, r.nextFollowUpDate].filter(Boolean))
    for (const date of dates) events.push({ id: `health:${r.id}:${date}`, type: 'CHECKUP', date,
      label: `${r.subjectName || r.subjectDisplayName || 'Bé'}: ${r.title}${r.facility ? ` tại ${r.facility}` : ''}` })
  }
  const plan = []
  for (const event of events) {
    const date = localDate(event.date)
    if (!date) continue
    for (const daysBefore of [1, 0]) {
      const fire = new Date(date)
      fire.setDate(fire.getDate() - daysBefore)
      // Catch up once when a same-day schedule is first synchronized after 08:00.
      if (dateKey(fire) < dateKey(now)) continue
      const fireAt = fire.getTime() > now.getTime() ? fire.getTime() : now.getTime() + 5000
      const id = `bediary:reminder:${scope}:${event.id}:${event.date}:${daysBefore}`
      const title = `${daysBefore ? 'Ngày mai' : 'Hôm nay'} có ${event.type === 'VACCINATION' ? 'lịch tiêm' : 'lịch khám'}`
      plan.push({ id, fireAt, signature: JSON.stringify([title, event.label, fire.getTime()]),
        title, body: `${event.label}. Ngày hẹn: ${event.date}.`,
        data: { type: event.type, scope, reminderId: id, eventId: event.id } })
    }
  }
  return plan.sort((a, b) => a.fireAt - b.fireAt).slice(0, 60)
}
