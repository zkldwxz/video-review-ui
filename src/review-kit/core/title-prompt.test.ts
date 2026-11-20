import { describe, expect, it } from 'vitest'
import { DEFAULT_TITLE_PROMPT, fillPrompt, titlePromptVars } from './title-prompt'
import { emptyEdits, type ReviewVideo } from './types'

const video = (category?: string): ReviewVideo => ({ id: 'v', src: '', fileName: 'a.mp4', source: { category }, edits: emptyEdits('原标题') })

describe('fillPrompt', () => {
  it('有分类时直接生成默认提示词', () => {
    const v = video('舞蹈')
    expect(fillPrompt(DEFAULT_TITLE_PROMPT, titlePromptVars(v, v.edits))).toBe('生成一个舞蹈的视频标题')
  })

  it('没有分类（或只有空白）时返回 null，让用户自己填', () => {
    const v = video(undefined)
    expect(fillPrompt(DEFAULT_TITLE_PROMPT, titlePromptVars(v, v.edits))).toBeNull()
    expect(fillPrompt('{category}', { category: '  ' })).toBeNull()
  })

  it('支持多个变量', () => {
    expect(fillPrompt('给{author}的{category}视频起标题', { author: '@小明', category: '舞蹈' })).toBe('给@小明的舞蹈视频起标题')
  })
})
