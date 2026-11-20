import type { ReviewEdits, ReviewStatus, ReviewVideo } from './types'

export type QueueFilter = 'all' | 'pending' | 'marked' | 'done'

const matchFilter = (status: ReviewStatus, f: QueueFilter) => f === 'all' || (f === 'done' ? status === 'approved' || status === 'rejected' : status === f)

/** 按状态和搜索词筛选。搜索范围：标题、文件名、视频 ID、作者、标签。 */
export function filterQueue(videos: ReviewVideo[], editsOf: (id: string) => ReviewEdits | undefined, query: string, filter: QueueFilter): ReviewVideo[] {
  const q = query.trim().toLowerCase()
  return videos.filter((v) => {
    const e = editsOf(v.id) ?? v.edits
    if (!matchFilter(e.status, filter)) return false
    if (!q) return true
    return [e.title, v.fileName, v.source?.externalId, v.source?.author, ...e.tags].some((s) => s?.toLowerCase().includes(q))
  })
}
