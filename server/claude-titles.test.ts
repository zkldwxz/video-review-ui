import { describe, expect, it } from 'vitest'
import { buildTitleRequest, MODEL, parseTitleResponse } from './claude-titles.ts'

describe('buildTitleRequest', () => {
  it('提示词在前，视频信息附在后面；只带有值的字段', () => {
    const body = buildTitleRequest({ prompt: '生成一个舞蹈的视频标题', category: '舞蹈', tags: ['街舞'], author: '' })
    expect(body.model).toBe(MODEL)
    expect(body.messages[0].content).toBe('生成一个舞蹈的视频标题\n\n视频信息：\n分类：舞蹈\n标签：街舞')
    expect(body.output_config.format.type).toBe('json_schema')
  })

  it('没有视频信息时只发提示词', () => {
    expect(buildTitleRequest({ prompt: 'x' }).messages[0].content).toBe('x')
  })
})

describe('parseTitleResponse', () => {
  it('跳过 thinking 块，取 text 里的 JSON，去重去空', () => {
    const titles = parseTitleResponse({
      stop_reason: 'end_turn',
      content: [{ type: 'thinking' }, { type: 'text', text: '{"titles":["A"," A ","","B"]}' }],
    })
    expect(titles).toEqual(['A', 'B'])
  })

  it('拒绝和截断给出可读的错误', () => {
    expect(() => parseTitleResponse({ stop_reason: 'refusal', content: [] })).toThrow('拒绝')
    expect(() => parseTitleResponse({ stop_reason: 'max_tokens', content: [] })).toThrow('截断')
    expect(() => parseTitleResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"titles":[]}' }] })).toThrow('没有给出')
  })
})
