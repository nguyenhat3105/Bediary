import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReminderPlan, localDate } from '../src/utils/reminderPlan.mjs'

const base = { scope: 'user:baby', now: new Date(2026, 8, 8, 7), savedRecords: [
  { id: 'v1', vaccineName: 'Vaccine', scheduledDate: '2026-09-09', status: 'SCHEDULED' },
] }
test('two reminders at 08:00 local on previous day and appointment day', () => {
  const plan = buildReminderPlan(base)
  assert.equal(plan.length, 2)
  assert.deepEqual(plan.map(p => new Date(p.fireAt).getDate()), [8, 9])
  assert.ok(plan.every(p => new Date(p.fireAt).getHours() === 8))
})
test('completed, cancelled and postponed vaccines have no reminders', () => {
  for (const status of ['COMPLETED', 'CANCELLED', 'POSTPONED', 'SKIPPED']) {
    assert.equal(buildReminderPlan({ ...base, savedRecords: [{ ...base.savedRecords[0], status }] }).length, 0)
  }
})
test('saved dates override defaults; end-of-month birthdays clamp correctly', () => {
  const options = { scope: 'u:b', now: new Date(2026, 0, 1), babyBirthday: '2026-01-31', schedule: [{ key: 'a', months: 1, name: 'A' }] }
  assert.equal(new Date(buildReminderPlan(options)[1].fireAt).getDate(), 28)
  const plan = buildReminderPlan({ ...options, savedRecords: [{ id: 'a', scheduleKey: 'a', scheduledDate: '2026-03-04' }] })
  assert.equal(new Date(plan[1].fireAt).getMonth(), 2)
  assert.equal(new Date(plan[1].fireAt).getDate(), 4)
})
test('checkups and followups, including relatives, are included without duplicate dates', () => {
  const plan = buildReminderPlan({ ...base, savedRecords: [], healthRecords: [
    { id: 'h', recordType: 'CHECKUP', title: 'Khám', eventDate: '2026-09-09', nextFollowUpDate: '2026-09-09' },
    { id: 'r', title: 'Tái khám', subjectDisplayName: 'Mẹ', nextFollowUpDate: '2026-09-10' },
  ] })
  assert.equal(plan.length, 4)
  assert.ok(plan.some(p => p.body.includes('Mẹ')))
})
test('late same-day sync keeps stable identity/signature, never sends past dates', () => {
  const first = buildReminderPlan({ ...base, now: new Date(2026, 8, 9, 10) })
  const second = buildReminderPlan({ ...base, now: new Date(2026, 8, 9, 11) })
  assert.equal(first.length, 1)
  assert.equal(first[0].id, second[0].id)
  assert.equal(first[0].signature, second[0].signature)
  assert.equal(buildReminderPlan({ ...base, now: new Date(2026, 8, 10) }).length, 0)
  assert.equal(localDate('2026-02-30'), null)
})
test('edited dates and switched baby produce different notification identities', () => {
  assert.notEqual(buildReminderPlan(base)[0].id, buildReminderPlan({ ...base, scope: 'u:other' })[0].id)
  assert.notEqual(buildReminderPlan(base)[0].id, buildReminderPlan({ ...base, savedRecords: [{ ...base.savedRecords[0], scheduledDate: '2026-09-10' }] })[0].id)
})
