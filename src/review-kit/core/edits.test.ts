import { describe, expect, it } from 'vitest'
import { applyEdit, createHistory, pushHistory, redo, undo } from './edits'
import { emptyEdits } from './types'

describe('applyEdit', () => {
  it('在播放头处把片段切成两段', () => {
    const e = { ...emptyEdits('a'), segments: [{ start: 0, end: 10 }, { start: 20, end: 30 }] }
    expect(applyEdit(e, { type: 'splitSegment', time: 4 }).segments).toEqual([
      { start: 0, end: 4 },
      { start: 4, end: 10 },
      { start: 20, end: 30 },
    ])
  })

  it('播放头不在任何片段里时不切', () => {
    const e = { ...emptyEdits('a'), segments: [{ start: 0, end: 10 }] }
    expect(applyEdit(e, { type: 'splitSegment', time: 15 })).toBe(e)
  })

  it('修改片段后按开始时间重新排序', () => {
    const e = { ...emptyEdits('a'), segments: [{ start: 0, end: 5 }, { start: 10, end: 15 }] }
    expect(applyEdit(e, { type: 'updateSegment', index: 0, segment: { start: 20, end: 25 } }).segments.map((s) => s.start)).toEqual([10, 20])
  })
})

describe('history', () => {
  it('撤销、重做', () => {
    let h = createHistory(1)
    h = pushHistory(h, 2)
    h = pushHistory(h, 3)
    h = undo(h)
    expect(h.present).toBe(2)
    h = redo(h)
    expect(h.present).toBe(3)
  })

  it('同一次拖拽的连续更新合并成一步', () => {
    let h = createHistory(0)
    h = pushHistory(h, 1, 'drag-1')
    h = pushHistory(h, 2, 'drag-1')
    h = pushHistory(h, 3, 'drag-1')
    expect(undo(h).present).toBe(0)
  })

  it('新操作会清空重做栈', () => {
    let h = pushHistory(createHistory(0), 1)
    h = undo(h)
    h = pushHistory(h, 5)
    expect(h.future).toEqual([])
    expect(redo(h).present).toBe(5)
  })
})
