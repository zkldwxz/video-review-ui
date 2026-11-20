import { describe, expect, it } from 'vitest'
import { formatCount, formatShort, formatTimecode, parseTimecode } from './timecode'

describe('formatTimecode', () => {
  it('按帧率换算帧号', () => {
    expect(formatTimecode(0, 25)).toBe('00:00:00:00')
    expect(formatTimecode(83.48, 25)).toBe('00:01:23:12')
    expect(formatTimecode(3600 + 0.5, 30)).toBe('01:00:00:15')
  })

  it('浮点误差不会少算一帧', () => {
    expect(formatTimecode(0.12, 25)).toBe('00:00:00:03')
  })
})

describe('formatShort', () => {
  it('输出 M:SS', () => {
    expect(formatShort(102.9)).toBe('1:42')
    expect(formatShort(5)).toBe('0:05')
  })
})

describe('formatCount', () => {
  it('万、亿', () => {
    expect(formatCount(9999)).toBe('9999')
    expect(formatCount(12345)).toBe('1.2万')
    expect(formatCount(1_000_000)).toBe('100万')
    expect(formatCount(320_000_000)).toBe('3.2亿')
  })
})

describe('parseTimecode', () => {
  it('支持多种写法', () => {
    expect(parseTimecode('83.5', 25)).toBe(83.5)
    expect(parseTimecode('1:23', 25)).toBe(83)
    expect(parseTimecode('00:01:23', 25)).toBe(83)
    expect(parseTimecode('00:01:23:12', 25)).toBe(83.48)
  })

  it('格式不对返回 null', () => {
    expect(parseTimecode('abc', 25)).toBeNull()
    expect(parseTimecode('00:00:01:30', 25)).toBeNull()
    expect(parseTimecode('', 25)).toBeNull()
  })
})
