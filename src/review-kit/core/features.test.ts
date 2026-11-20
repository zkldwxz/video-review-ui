import { describe, expect, it } from 'vitest'
import { applyFeatures, defaultFeatures, featurePresets, isActionEnabled, resolveFeatures } from './features'
import { emptyEdits, type ReviewEdits } from './types'

const edits: ReviewEdits = {
  ...emptyEdits('a'),
  crop: { x: 0, y: 0, w: 0.5, h: 0.5 },
  delogos: [{ id: 'd', x: 0, y: 0, w: 0.1, h: 0.1, start: 8, end: 20, mode: 'delogo' }],
  segments: [{ start: 1, end: 5 }],
}

describe('features', () => {
  it('只写要改的项，其余用默认值', () => {
    expect(resolveFeatures({ segments: false })).toEqual({ ...defaultFeatures, segments: false })
  })

  it('关掉 Delogo 时连带关掉时间段和模型导入', () => {
    const f = resolveFeatures({ delogo: false })
    expect(f.delogoTimeRange).toBe(false)
    expect(f.modelImport).toBe(false)
  })

  it('关掉的功能不进入保存的任务；Delogo 不分时间段时统一为整段', () => {
    const out = applyFeatures(edits, resolveFeatures(featurePresets.delogoStatic), 30)
    expect(out.crop).toBeNull()
    expect(out.segments).toEqual([])
    expect(out.delogos[0]).toMatchObject({ start: 0, end: 30 })
  })

  it('固定处理方式时所有区域都用它', () => {
    const out = applyFeatures(edits, defaultFeatures, 30, { delogoMode: 'blur' })
    expect(out.delogos.map((d) => d.mode)).toEqual(['blur'])
    expect(out.delogos[0]).toMatchObject({ start: 8, end: 20 })
  })

  it('只读时只剩播放和浏览类快捷键', () => {
    const ro = { aiTitle: true, readOnly: true }
    expect(isActionEnabled('save', defaultFeatures, ro)).toBe(false)
    expect(isActionEnabled('undo', defaultFeatures, ro)).toBe(false)
    expect(isActionEnabled('newDelogo', defaultFeatures, ro)).toBe(false)
    expect(isActionEnabled('playPause', defaultFeatures, ro)).toBe(true)
    expect(isActionEnabled('nextVideo', defaultFeatures, ro)).toBe(true)
  })

  it('全开时原样保留', () => {
    expect(applyFeatures(edits, defaultFeatures, 30)).toEqual(edits)
  })

  it('快捷键随开关启用', () => {
    const delogoOnly = resolveFeatures(featurePresets.delogoOnly)
    expect(isActionEnabled('split', delogoOnly, { aiTitle: false })).toBe(false)
    expect(isActionEnabled('newCrop', delogoOnly, { aiTitle: false })).toBe(false)
    // 片段关了，但 Delogo 还能设时间段，I / O 仍然有用
    expect(isActionEnabled('markIn', delogoOnly, { aiTitle: false })).toBe(true)
    expect(isActionEnabled('markIn', resolveFeatures(featurePresets.delogoStatic), { aiTitle: false })).toBe(false)
    expect(isActionEnabled('aiTitle', resolveFeatures({ rename: false }), { aiTitle: true })).toBe(false)
    expect(isActionEnabled('nextVideo', resolveFeatures({ queue: false }), { aiTitle: false })).toBe(false)
  })
})
