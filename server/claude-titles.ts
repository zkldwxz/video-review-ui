// 调 Claude 生成候选标题。只在服务端运行，API Key 不进浏览器。

export const MODEL = 'claude-opus-5-5'
const API_URL = 'https://api.anthropic.com/v1/messages'

export type TitleRequestInput = {
  prompt: string
  currentTitle?: string
  category?: string
  tags?: string[]
  author?: string
  platform?: string
}

const SYSTEM = `你是短视频平台的运营编辑，负责给待发布的视频改写标题。
按用户的要求生成 3 个不同角度的中文标题：
- 每个不超过 30 个字，口语化、有画面感，避免夸大和虚假承诺
- 不要加引号、序号、话题标签（#）或表情符号
- 参考给出的视频信息，但不要编造视频里没有的具体事实`

const SCHEMA = {
  type: 'object',
  properties: { titles: { type: 'array', items: { type: 'string' } } },
  required: ['titles'],
  additionalProperties: false,
}

export function buildTitleRequest(input: TitleRequestInput) {
  const context = [
    input.currentTitle && `当前标题：${input.currentTitle}`,
    input.category && `分类：${input.category}`,
    input.tags?.length && `标签：${input.tags.join('、')}`,
    input.author && `作者：${input.author}`,
    input.platform && `来源平台：${input.platform}`,
  ].filter(Boolean)
  const content = context.length ? `${input.prompt}\n\n视频信息：\n${context.join('\n')}` : input.prompt
  return {
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: 'user', content }],
    // 起标题是轻任务，effort 用 low；结构化输出保证返回 { titles: string[] }
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // 被安全分类器拒绝时由服务端自动换模型重试
    fallbacks: 'default',
  }
}

type ApiResponse = {
  stop_reason?: string
  content?: { type: string; text?: string }[]
  error?: { message?: string }
}

export function parseTitleResponse(json: ApiResponse): string[] {
  if (json.stop_reason === 'refusal') throw new Error('模型拒绝了这次请求，换个说法再试')
  if (json.stop_reason === 'max_tokens') throw new Error('生成被截断，请再试一次')
  const text = json.content?.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('模型没有返回内容')
  const { titles } = JSON.parse(text) as { titles: unknown }
  const list = Array.isArray(titles) ? [...new Set(titles.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean))] : []
  if (list.length === 0) throw new Error('模型没有给出可用的标题')
  return list
}

export async function generateTitles(input: TitleRequestInput, apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify(buildTitleRequest(input)),
  })
  const json = (await res.json()) as ApiResponse
  if (!res.ok) throw new Error(`Claude API ${res.status}：${json.error?.message ?? '请求失败'}`)
  return parseTitleResponse(json)
}
