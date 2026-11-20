import { describe, expect, it } from 'vitest'
import { filterQueue } from './queue'
import { emptyEdits, type ReviewVideo } from './types'

const v = (id: string, status: ReviewVideo['edits']['status'], extra: Partial<ReviewVideo> = {}): ReviewVideo => ({
  id,
  src: '',
  fileName: `${id}.mp4`,
  edits: { ...emptyEdits(`标题${id}`), status },
  ...extra,
})

const videos = [v('a', 'pending', { source: { author: '@山野记录', externalId: '7438' } }), v('b', 'approved'), v('c', 'rejected')]

describe('filterQueue', () => {
  it('“已审”包含通过和驳回', () => {
    expect(filterQueue(videos, () => undefined, '', 'done').map((x) => x.id)).toEqual(['b', 'c'])
  })

  it('按作者、ID、标签搜索，使用最新的编辑结果', () => {
    expect(filterQueue(videos, () => undefined, '山野', 'all').map((x) => x.id)).toEqual(['a'])
    expect(filterQueue(videos, () => undefined, '7438', 'all').map((x) => x.id)).toEqual(['a'])
    const edited = { ...emptyEdits('x'), tags: ['需二审'] }
    expect(filterQueue(videos, (id) => (id === 'b' ? edited : undefined), '二审', 'all').map((x) => x.id)).toEqual(['b'])
  })
})
