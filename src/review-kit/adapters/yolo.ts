import type { Detection } from '../core/detections'

type ClassNames = string[] | Record<number, string>

const className = (names: ClassNames | undefined, cls: number) => (names ? (names as Record<number, string>)[cls] : undefined) ?? String(cls)

/**
 * YOLO 标签文本（Ultralytics save_txt 格式），一行一个框：
 *   class cx cy w h [conf] [track_id]   —— 坐标为 0–1 归一化的中心点和宽高
 * 只有 6 列时：带小数点按置信度处理，整数按 track_id 处理。
 */
export function parseYoloLabels(text: string, opts: { time?: number; classNames?: ClassNames } = {}): Detection[] {
  const time = opts.time ?? 0
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, n) => {
      const cols = line.split(/\s+/)
      if (cols.length < 5 || cols.length > 7 || cols.some((c) => Number.isNaN(Number(c)))) {
        throw new Error(`YOLO 标签第 ${n + 1} 行格式不对，应为 "class cx cy w h [conf] [track_id]"：${line}`)
      }
      const [cls, cx, cy, w, h] = cols.slice(0, 5).map(Number)
      let score: number | undefined
      let trackId: string | undefined
      if (cols.length === 7) {
        score = Number(cols[5])
        trackId = cols[6]
      } else if (cols.length === 6) {
        if (cols[5].includes('.')) score = Number(cols[5])
        else trackId = cols[5]
      }
      return { time, label: className(opts.classNames, cls), score, trackId, box: { x: cx - w / 2, y: cy - h / 2, w, h } }
    })
}

/** Ultralytics `result.summary()` / `result.to_json()` 的单个框 */
export type UltralyticsBox = {
  name?: string
  class?: number
  confidence?: number
  track_id?: number
  box: { x1: number; y1: number; x2: number; y2: number }
}

/** 逐帧结果：time（秒）和 frame（帧号）二选一 */
export type UltralyticsFrame = { time?: number; frame?: number; detections: UltralyticsBox[] }

/**
 * Ultralytics 检测 / 跟踪结果。坐标默认是像素，需要传视频宽高；
 * 如果导出时用了 normalize=True（所有坐标都 ≤ 1），会自动按归一化处理。
 * 传入单帧的框数组时，time 为 0。
 */
export function fromUltralytics(
  input: UltralyticsFrame[] | UltralyticsBox[],
  opts: { width: number; height: number; fps?: number },
): Detection[] {
  const frames: UltralyticsFrame[] = input.length > 0 && 'box' in input[0] ? [{ time: 0, detections: input as UltralyticsBox[] }] : (input as UltralyticsFrame[])
  const all = frames.flatMap((f) => f.detections.map((d) => d.box))
  const normalized = all.every((b) => b.x1 <= 1 && b.y1 <= 1 && b.x2 <= 1 && b.y2 <= 1)
  const sx = normalized ? 1 : 1 / opts.width
  const sy = normalized ? 1 : 1 / opts.height

  return frames.flatMap((f) => {
    const time = f.time ?? (f.frame !== undefined ? f.frame / (opts.fps ?? 25) : 0)
    return f.detections.map((d) => ({
      time,
      label: d.name ?? (d.class !== undefined ? String(d.class) : undefined),
      score: d.confidence,
      trackId: d.track_id !== undefined ? String(d.track_id) : undefined,
      box: { x: d.box.x1 * sx, y: d.box.y1 * sy, w: (d.box.x2 - d.box.x1) * sx, h: (d.box.y2 - d.box.y1) * sy },
    }))
  })
}
