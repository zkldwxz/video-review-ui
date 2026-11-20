import { describe, expect, it } from 'vitest'
import { applyEdit } from './edits'
import { describeChange } from './describe'
import { emptyEdits, type DelogoRegion } from './types'

const region: DelogoRegion = { id: 'd', x: 0, y: 0, w: 0.1, h: 0.1, start: 0, end: 1, mode: 'delogo' }

describe('describeChange', () => {
  const base = emptyEdits('a')
  it('区分新增、删除、修改', () => {
    const added = applyEdit(base, { type: 'addDelogos', regions: [region, { ...region, id: 'e' }] })
    expect(describeChange(base, added)).toBe('新增 2 个 Delogo 区域')
    expect(describeChange(added, base)).toBe('删除 2 个 Delogo 区域')
    const moved = applyEdit(added, { type: 'updateDelogo', id: 'd', patch: { x: 0.5 } })
    expect(describeChange(added, moved)).toBe('Delogo 区域的修改')
  })

  it('裁剪框、标题、结论', () => {
    const cropped = applyEdit(base, { type: 'setCrop', crop: { x: 0, y: 0, w: 1, h: 1 } })
    expect(describeChange(base, cropped)).toBe('添加裁剪框')
    expect(describeChange(cropped, base)).toBe('删除裁剪框')
    expect(describeChange(base, applyEdit(base, { type: 'rename', title: 'b' }))).toBe('标题的修改')
    expect(describeChange(base, applyEdit(base, { type: 'setDecision', status: 'approved' }))).toBe('审核结论的修改')
  })
})
