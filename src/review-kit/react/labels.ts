import type { RegionOrigin, ReviewStatus } from '../core/types'

export const statusMeta: Record<ReviewStatus, { label: string; dot: string }> = {
  pending: { label: '待审', dot: 'bg-muted-foreground/60' },
  marked: { label: '已标记', dot: 'bg-primary' },
  approved: { label: '通过', dot: 'bg-success' },
  rejected: { label: '驳回', dot: 'bg-destructive' },
}

const MODEL_NAMES: Record<string, string> = { yolo: 'YOLO', sam: 'SAM', sam2: 'SAM 2' }

/** 例如 "YOLO 91%" */
export function modelLabel(origin: RegionOrigin): string {
  const name = MODEL_NAMES[origin.model] ?? origin.model
  return origin.score === undefined ? name : `${name} ${Math.round(origin.score * 100)}%`
}
