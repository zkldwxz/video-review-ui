import { describe, expect, it } from 'vitest'
import { detectionsToRegions, type Detection } from './detections'

const box = { x: 0.8, y: 0.05, w: 0.1, h: 0.08 }
const pick = (r: { x: number; y: number; w: number; h: number; start: number; end: number }) => ({
  x: +r.x.toFixed(3),
  y: +r.y.toFixed(3),
  w: +r.w.toFixed(3),
  h: +r.h.toFixed(3),
  start: r.start,
  end: r.end,
})

describe('detectionsToRegions', () => {
  it('只有一帧的结果覆盖整个视频', () => {
    const [r] = detectionsToRegions([{ time: 3, box, label: 'logo', score: 0.9 }], { model: 'yolo', duration: 30, padding: 0 })
    expect(pick(r)).toEqual({ ...box, start: 0, end: 30 })
    expect(r.origin).toEqual({ model: 'yolo', label: 'logo', score: 0.9, trackId: undefined })
  })

  it('逐帧结果合并成时间段，中断超过 maxGap 就拆开', () => {
    const times = [0, 1, 2, 3, 10, 11]
    const dets: Detection[] = times.map((time) => ({ time, box, label: 'logo' }))
    const regions = detectionsToRegions(dets, { model: 'yolo', duration: 30, padding: 0, maxGap: 2 })
    // 采样间隔取中位数 1 秒
    expect(regions.map((r) => [r.start, r.end])).toEqual([
      [0, 4],
      [10, 12],
    ])
  })

  it('maxGap 为 Infinity 时同一目标不拆段（Delogo 不分时间段时用）', () => {
    const dets: Detection[] = [0, 1, 2, 3, 10, 11].map((time) => ({ time, box, label: 'logo' }))
    expect(detectionsToRegions(dets, { model: 'yolo', duration: 30, padding: 0, maxGap: Infinity })).toHaveLength(1)
  })

  it('稀疏采样（每 4 秒一帧）不会被当成中断', () => {
    const dets: Detection[] = [0, 4, 8, 12].map((time) => ({ time, box, label: 'logo' }))
    const regions = detectionsToRegions(dets, { model: 'yolo', duration: 30, maxGap: 1 })
    expect(regions.map((r) => [r.start, r.end])).toEqual([[0, 16]])
  })

  it('框有抖动时取并集，并向外扩边', () => {
    const dets: Detection[] = [
      { time: 0, box: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 } },
      { time: 1, box: { x: 0.52, y: 0.49, w: 0.1, h: 0.1 } },
    ]
    const [r] = detectionsToRegions(dets, { model: 'm', duration: 10, padding: 0.01 })
    expect(pick(r)).toEqual({ x: 0.49, y: 0.48, w: 0.14, h: 0.13, start: 0, end: 2 })
  })

  it('没有 trackId 时，同一帧里两个分开的同类框是两个目标', () => {
    const other = { x: 0.05, y: 0.85, w: 0.12, h: 0.06 }
    const dets: Detection[] = [0, 1, 2].flatMap((time) => [
      { time, box, label: 'logo' },
      { time, box: other, label: 'logo' },
    ])
    expect(detectionsToRegions(dets, { model: 'yolo', duration: 30 })).toHaveLength(2)
  })

  it('有 trackId 时按 id 分组，过滤低置信度', () => {
    const dets: Detection[] = [
      { time: 0, box, trackId: '7', score: 0.8 },
      { time: 1, box: { ...box, x: 0.1 }, trackId: '7', score: 0.8 },
      { time: 0, box, trackId: '8', score: 0.1 },
    ]
    const regions = detectionsToRegions(dets, { model: 'yolo', duration: 30 })
    expect(regions).toHaveLength(1)
    expect(regions[0].origin?.trackId).toBe('7')
  })
})
