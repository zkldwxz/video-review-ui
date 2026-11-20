import { describe, expect, it } from 'vitest'
import { parseDetections } from './parse'
import { decodeCocoCounts, maskBBox, rleBBox } from './rle'
import { fromSam } from './sam'
import { fromUltralytics, parseYoloLabels } from './yolo'

const r3 = (b: { x: number; y: number; w: number; h: number }) => ({ x: +b.x.toFixed(3), y: +b.y.toFixed(3), w: +b.w.toFixed(3), h: +b.h.toFixed(3) })

describe('YOLO', () => {
  it('标签文本：中心点转左上角', () => {
    const [d] = parseYoloLabels('0 0.5 0.5 0.2 0.1 0.87', { time: 2, classNames: ['logo'] })
    expect(r3(d.box)).toEqual({ x: 0.4, y: 0.45, w: 0.2, h: 0.1 })
    expect(d).toMatchObject({ time: 2, label: 'logo', score: 0.87 })
  })

  it('6 列整数按 track_id，7 列为置信度 + track_id', () => {
    expect(parseYoloLabels('1 0.5 0.5 0.2 0.1 12')[0]).toMatchObject({ trackId: '12', score: undefined, label: '1' })
    expect(parseYoloLabels('1 0.5 0.5 0.2 0.1 0.5 3')[0]).toMatchObject({ trackId: '3', score: 0.5 })
  })

  it('格式不对时报出行号', () => {
    expect(() => parseYoloLabels('0 0.5 0.5\n')).toThrow('第 1 行')
  })

  it('Ultralytics 像素坐标按视频宽高归一化，帧号换算成秒', () => {
    const [d] = fromUltralytics(
      [{ frame: 50, detections: [{ name: 'logo', confidence: 0.9, track_id: 4, box: { x1: 1068, y1: 43, x2: 1204, y2: 96 } }] }],
      { width: 1280, height: 720, fps: 25 },
    )
    expect(d.time).toBe(2)
    expect(r3(d.box)).toEqual({ x: 0.834, y: 0.06, w: 0.106, h: 0.074 })
    expect(d.trackId).toBe('4')
  })
})

describe('COCO RLE', () => {
  it('解码压缩字符串', () => {
    // 手算：3、2、5 都小于 16，各编码成一个字符；第 4 个起存的是与前前项的差
    expect(decodeCocoCounts('325')).toEqual([3, 2, 5])
    expect(decodeCocoCounts('1238')).toEqual([1, 2, 3, 10])
    // 40 = 0b01000 + 1<<5 → 'X'（8|0x20 + 48），'1'
    expect(decodeCocoCounts('X1')).toEqual([40])
  })

  it('外接框：列优先展开', () => {
    // 4×4 掩码，前景在第 1–2 列的第 1–2 行：0 游程 5，1 游程 2，0 游程 2，1 游程 2，剩余 5
    expect(rleBBox({ size: [4, 4], counts: [5, 2, 2, 2, 5] })).toEqual({ x: 1, y: 1, w: 2, h: 2 })
    // 跨列的游程覆盖整列高度
    expect(rleBBox({ size: [4, 4], counts: [6, 4, 6] })).toEqual({ x: 1, y: 0, w: 2, h: 4 })
    expect(rleBBox({ size: [4, 4], counts: [16] })).toBeNull()
  })

  it('二值数组外接框', () => {
    expect(maskBBox([[0, 0, 0], [0, 1, 1], [0, 0, 0]])).toEqual({ x: 1, y: 1, w: 2, h: 1 })
  })
})

describe('SAM', () => {
  it('优先用 bbox（像素 XYWH）', () => {
    const [d] = fromSam([{ bbox: [128, 72, 256, 144], predicted_iou: 0.95 }], { width: 1280, height: 720 })
    expect(r3(d.box)).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 })
    expect(d.score).toBe(0.95)
  })

  it('SAM 2 逐帧结果：用 RLE 自带的尺寸归一化', () => {
    const [d] = fromSam([{ frame_idx: 25, obj_id: 1, mask: { segmentation: { size: [4, 4], counts: [5, 2, 2, 2, 5] } } }], {
      width: 1280,
      height: 720,
      fps: 25,
    })
    expect(d).toMatchObject({ time: 1, trackId: '1' })
    expect(d.box).toEqual({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 })
  })
})

describe('parseDetections', () => {
  const ctx = { width: 1280, height: 720, fps: 25 }
  it('自动识别格式', () => {
    expect(parseDetections('0 0.5 0.5 0.1 0.1', ctx).format).toBe('yolo-txt')
    expect(parseDetections('[{"box":{"x1":0,"y1":0,"x2":10,"y2":10}}]', ctx).format).toBe('ultralytics-json')
    expect(parseDetections('{"bbox":[0,0,10,10]}', ctx).format).toBe('sam-json')
  })

  it('认不出的 JSON 给出说明', () => {
    expect(() => parseDetections('[{"foo":1}]', ctx)).toThrow('认不出')
  })
})
