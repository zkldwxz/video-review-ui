import { describe, expect, it } from 'vitest'
import { buildTask } from './task'
import { emptyEdits, type ReviewVideo } from './types'

const video: ReviewVideo = { id: 'v', src: '/a.mp4', fileName: 'a.mp4', edits: emptyEdits('a') }
const media = { width: 1280, height: 720, duration: 30, fps: 25 }

describe('buildTask', () => {
  it('裁剪换算成偶数像素', () => {
    const t = buildTask(video, { ...video.edits, crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } }, media)
    // 128, 72, 640, 360；0.333 → 426.24 → 426
    expect(t.crop).toEqual({ x: 128, y: 72, w: 640, h: 360 })
    const t2 = buildTask(video, { ...video.edits, crop: { x: 0.0023, y: 0, w: 0.333, h: 1 } }, media)
    expect(t2.crop).toEqual({ x: 2, y: 0, w: 426, h: 720 })
  })

  it('Delogo 四周至少留 1px', () => {
    const t = buildTask(
      video,
      { ...video.edits, delogos: [{ id: 'd', x: 0, y: 0.9, w: 0.2, h: 0.1, start: 1.23456, end: 5, mode: 'delogo' }] },
      media,
    )
    // x 0 → 1；y 648，h 72 → 最多 720-1-648 = 71
    expect(t.delogos[0]).toMatchObject({ x: 1, y: 648, w: 256, h: 71, start: 1.235, end: 5 })
  })
})
