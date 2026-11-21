import type { Rect } from './types'

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function clampRect(r: Rect, minSize = 0.005): Rect {
  const w = clamp(r.w, minSize, 1)
  const h = clamp(r.h, minSize, 1)
  return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h }
}

export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

export function iou(a: Rect, b: Rect): number {
  const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (iw <= 0 || ih <= 0) return 0
  const inter = iw * ih
  return inter / (a.w * a.h + b.w * b.h - inter)
}

export function padRect(r: Rect, pad: number): Rect {
  const x = clamp(r.x - pad, 0, 1)
  const y = clamp(r.y - pad, 0, 1)
  return { x, y, w: clamp(r.x + r.w + pad, 0, 1) - x, h: clamp(r.y + r.h + pad, 0, 1) - y }
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/**
 * 拖控制点缩放。dx/dy 为归一化位移。
 * aspect 为归一化宽高比（w/h，已按视频像素比例换算），传了就锁定比例。
 */
export function resizeRect(start: Rect, handle: ResizeHandle, dx: number, dy: number, minSize: number, aspect?: number): Rect {
  let l = start.x
  let t = start.y
  let r = start.x + start.w
  let b = start.y + start.h
  if (handle.includes('w')) l = clamp(l + dx, 0, r - minSize)
  if (handle.includes('e')) r = clamp(r + dx, l + minSize, 1)
  if (handle.includes('n')) t = clamp(t + dy, 0, b - minSize)
  if (handle.includes('s')) b = clamp(b + dy, t + minSize, 1)
  if (aspect === undefined) return { x: l, y: t, w: r - l, h: b - t }

  const anchorRight = handle.includes('w')
  const anchorBottom = handle.includes('n')
  const fixedX = anchorRight ? r : l
  const fixedY = anchorBottom ? b : t
  const widthDriven = handle.includes('e') || handle.includes('w')
  let w = r - l
  let h = b - t
  if (widthDriven) h = w / aspect
  else w = h * aspect
  const scale = Math.min(1, (anchorRight ? fixedX : 1 - fixedX) / w, (anchorBottom ? fixedY : 1 - fixedY) / h)
  w *= scale
  h *= scale
  return { x: anchorRight ? fixedX - w : fixedX, y: anchorBottom ? fixedY - h : fixedY, w, h }
}

export function moveRect(start: Rect, dx: number, dy: number): Rect {
  return { ...start, x: clamp(start.x + dx, 0, 1 - start.w), y: clamp(start.y + dy, 0, 1 - start.h) }
}

/** 把矩形改成指定比例：以原中心为准，取不超出画面的最大尺寸，且不超过原面积所在的宽或高 */
export function fitAspect(r: Rect, aspect: number): Rect {
  let w = r.w
  let h = w / aspect
  if (h > r.h) {
    h = r.h
    w = h * aspect
  }
  const cx = r.x + r.w / 2
  const cy = r.y + r.h / 2
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - h / 2, 0, 1 - h), w, h }
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/**
 * 新建 Delogo 区域放在哪：台标和水印多在四角，依次试右上、左上、右下、左下，
 * 取第一个不和已有区域重叠的角；四角都占了再放到画面中间。
 * aspect 是画面像素宽高比。框按像素取 2.5:1 的横条、宽为长边的 14%，竖屏也不会变成方块。
 */
export function suggestRegion(existing: Rect[], aspect = 16 / 9, margin = 0.03): Rect {
  const w = 0.14 * Math.max(1, 1 / aspect)
  const h = (w * aspect) / 2.5
  const corners: Rect[] = [
    { x: 1 - margin - w, y: margin, w, h },
    { x: margin, y: margin, w, h },
    { x: 1 - margin - w, y: 1 - margin - h, w, h },
    { x: margin, y: 1 - margin - h, w, h },
  ]
  return corners.find((c) => !existing.some((r) => overlaps(c, r))) ?? { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
}
