import test from 'node:test'
import assert from 'node:assert/strict'
import { measurement, measurementLabel, timePosition, labelLeft } from '../src/utils/growthPresentation.mjs'

test('missing or invalid measurements never appear as zero', () => {
  for (const value of [null, undefined, '', ' ', 'bad', NaN, Infinity, 0, -1]) {
    assert.equal(measurement(value), null)
    assert.equal(measurementLabel(value, 'kg'), 'Chưa có dữ liệu')
  }
  assert.equal(measurementLabel('8.25', 'kg'), '8.3 kg')
})

test('chart spacing follows elapsed time rather than record index', () => {
  const first = Date.parse('2026-09-01'), last = Date.parse('2026-09-11')
  assert.equal(timePosition(Date.parse('2026-09-02'), first, last, 30, 200), 50)
  assert.equal(timePosition(last, first, last, 30, 200), 230)
  assert.equal(timePosition(first, first, first, 30, 200), 130)
})

test('edge labels remain within chart for narrow and wide layouts', () => {
  for (const width of [180, 240, 320, 600]) {
    for (const x of [0, 30, width - 18, width]) {
      const left = labelLeft(x, 60, width)
      assert.ok(left >= 0)
      assert.ok(left + 60 <= width)
    }
  }
})
