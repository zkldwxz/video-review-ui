import type { ReviewEdits } from './types'

/** 两次编辑之间改了什么，用于撤销 / 重做提示。顺序即优先级，只报第一项。 */
export function describeChange(from: ReviewEdits, to: ReviewEdits): string {
  if (from.delogos !== to.delogos) {
    const diff = to.delogos.length - from.delogos.length
    if (diff > 0) return `新增 ${diff} 个 Delogo 区域`
    if (diff < 0) return `删除 ${-diff} 个 Delogo 区域`
    return 'Delogo 区域的修改'
  }
  if (from.crop !== to.crop) return !from.crop ? '添加裁剪框' : !to.crop ? '删除裁剪框' : '裁剪框的修改'
  if (from.segments !== to.segments) return '片段的修改'
  if (from.title !== to.title) return '标题的修改'
  if (from.tags !== to.tags) return '标签的修改'
  return '审核结论的修改'
}
