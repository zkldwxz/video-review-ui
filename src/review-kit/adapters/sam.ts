import type { Detection } from '../core/detections'
import { maskBBox, rleBBox, type CocoRle } from './rle'

/**
 * SAM 自动掩码生成器（SamAutomaticMaskGenerator）的一条输出。
 * bbox 为像素 XYWH；segmentation 可以是 COCO RLE（压缩或未压缩）或二维二值数组。
 */
export type SamMask = {
  bbox?: [number, number, number, number]
  segmentation?: CocoRle | ArrayLike<ArrayLike<number | boolean>>
  predicted_iou?: number
  stability_score?: number
}

/**
 * 视频场景（SAM 2 video predictor 逐帧传播的结果，或自己包一层的单帧结果）。
 * 时间用 time（秒）、frame 或 frame_idx（帧号）给出，都没有时为 0。
 */
export type SamItem = SamMask & {
  time?: number
  frame?: number
  frame_idx?: number
  obj_id?: number | string
  label?: string
  mask?: SamMask
}

const isRle = (s: SamMask['segmentation']): s is CocoRle => !!s && typeof s === 'object' && 'counts' in s && 'size' in s

/**
 * SAM / SAM 2 结果 → Detection。
 * 归一化时优先用 RLE 自带的 size（掩码分辨率）；没有 RLE 时用传入的 width/height（掩码或 bbox 的像素空间）。
 */
export function fromSam(items: SamItem[], opts: { width: number; height: number; fps?: number }): Detection[] {
  return items.flatMap((item) => {
    const m: SamMask = item.mask ?? item
    const seg = m.segmentation
    const [mh, mw] = isRle(seg) ? seg.size : [opts.height, opts.width]
    const px = m.bbox ? { x: m.bbox[0], y: m.bbox[1], w: m.bbox[2], h: m.bbox[3] } : isRle(seg) ? rleBBox(seg) : seg ? maskBBox(seg) : null
    if (!px || px.w <= 0 || px.h <= 0) return []
    const frame = item.frame ?? item.frame_idx
    return [
      {
        time: item.time ?? (frame !== undefined ? frame / (opts.fps ?? 25) : 0),
        label: item.label,
        score: m.predicted_iou,
        trackId: item.obj_id !== undefined ? String(item.obj_id) : undefined,
        box: { x: px.x / mw, y: px.y / mh, w: px.w / mw, h: px.h / mh },
      },
    ]
  })
}
