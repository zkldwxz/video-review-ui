import type { DelogoRegion, Rect, ReviewEdits, ReviewStatus, TimeRange } from './types'

export type EditAction =
  | { type: 'rename'; title: string }
  | { type: 'setTags'; tags: string[] }
  | { type: 'setCrop'; crop: Rect | null }
  | { type: 'addDelogo'; region: DelogoRegion }
  | { type: 'addDelogos'; regions: DelogoRegion[] }
  | { type: 'updateDelogo'; id: string; patch: Partial<Omit<DelogoRegion, 'id'>> }
  | { type: 'removeDelogo'; id: string }
  | { type: 'addSegment'; segment: TimeRange }
  | { type: 'updateSegment'; index: number; segment: TimeRange }
  | { type: 'removeSegment'; index: number }
  | { type: 'splitSegment'; time: number }
  | { type: 'setDecision'; status: ReviewStatus; note?: string }

const bySegmentStart = (a: TimeRange, b: TimeRange) => a.start - b.start

export function applyEdit(edits: ReviewEdits, action: EditAction): ReviewEdits {
  switch (action.type) {
    case 'rename':
      return { ...edits, title: action.title }
    case 'setTags':
      return { ...edits, tags: action.tags }
    case 'setCrop':
      return { ...edits, crop: action.crop }
    case 'addDelogo':
      return { ...edits, delogos: [...edits.delogos, action.region] }
    case 'addDelogos':
      return { ...edits, delogos: [...edits.delogos, ...action.regions] }
    case 'updateDelogo':
      return { ...edits, delogos: edits.delogos.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) }
    case 'removeDelogo':
      return { ...edits, delogos: edits.delogos.filter((d) => d.id !== action.id) }
    case 'addSegment':
      return { ...edits, segments: [...edits.segments, action.segment].sort(bySegmentStart) }
    case 'updateSegment':
      return { ...edits, segments: edits.segments.map((s, i) => (i === action.index ? action.segment : s)).sort(bySegmentStart) }
    case 'removeSegment':
      return { ...edits, segments: edits.segments.filter((_, i) => i !== action.index) }
    case 'splitSegment': {
      const i = edits.segments.findIndex((s) => action.time > s.start && action.time < s.end)
      if (i === -1) return edits
      const s = edits.segments[i]
      const parts = [
        { start: s.start, end: action.time },
        { start: action.time, end: s.end },
      ]
      return { ...edits, segments: [...edits.segments.slice(0, i), ...parts, ...edits.segments.slice(i + 1)] }
    }
    case 'setDecision':
      return { ...edits, status: action.status, note: action.note ?? edits.note }
  }
}

/**
 * 撤销栈。coalesceKey 相同的连续操作合并成一步（例如一次拖拽产生的几十次更新）。
 */
export type History<T> = { past: T[]; present: T; future: T[]; lastKey?: string }

const HISTORY_LIMIT = 200

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

export function pushHistory<T>(h: History<T>, next: T, coalesceKey?: string): History<T> {
  if (next === h.present) return h
  if (coalesceKey !== undefined && coalesceKey === h.lastKey) {
    return { ...h, present: next, future: [] }
  }
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], lastKey: coalesceKey }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}
