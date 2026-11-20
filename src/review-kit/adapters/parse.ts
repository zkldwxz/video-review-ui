import type { Detection } from '../core/detections'
import { fromSam, type SamItem } from './sam'
import { fromUltralytics, parseYoloLabels, type UltralyticsBox, type UltralyticsFrame } from './yolo'

export type DetectionFormat = 'yolo-txt' | 'ultralytics-json' | 'sam-json'

export const formatLabels: Record<DetectionFormat, string> = {
  'yolo-txt': 'YOLO 标签文本',
  'ultralytics-json': 'Ultralytics JSON',
  'sam-json': 'SAM / SAM 2 JSON',
}

type Ctx = { width: number; height: number; fps: number; time?: number }

const asArray = (data: unknown): unknown[] => (Array.isArray(data) ? data : [data])

function detectJsonFormat(data: unknown): DetectionFormat {
  const first = asArray(data)[0]
  if (first && typeof first === 'object') {
    if ('box' in first || 'detections' in first) return 'ultralytics-json'
    if ('bbox' in first || 'segmentation' in first || 'mask' in first) return 'sam-json'
  }
  throw new Error('认不出这段 JSON 的格式：需要 Ultralytics 的框数组 / 逐帧结果，或 SAM 的掩码数组。')
}

/** 粘贴的文本 → Detection。format 不传时自动识别。 */
export function parseDetections(text: string, ctx: Ctx, format?: DetectionFormat): { format: DetectionFormat; detections: Detection[] } {
  const trimmed = text.trim()
  if (!trimmed) return { format: format ?? 'yolo-txt', detections: [] }
  const looksJson = trimmed.startsWith('[') || trimmed.startsWith('{')
  const fmt = format ?? (looksJson ? detectJsonFormat(JSON.parse(trimmed)) : 'yolo-txt')

  switch (fmt) {
    case 'yolo-txt':
      return { format: fmt, detections: parseYoloLabels(trimmed, { time: ctx.time }) }
    case 'ultralytics-json':
      return { format: fmt, detections: fromUltralytics(asArray(JSON.parse(trimmed)) as UltralyticsFrame[] | UltralyticsBox[], ctx) }
    case 'sam-json':
      return { format: fmt, detections: fromSam(asArray(JSON.parse(trimmed)) as SamItem[], ctx) }
  }
}
