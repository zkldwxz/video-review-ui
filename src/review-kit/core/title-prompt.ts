import type { ReviewEdits, ReviewVideo } from './types'

export const DEFAULT_TITLE_PROMPT = '生成一个{category}的视频标题'

/** 提示词里可用的变量，取自视频的来源信息和当前编辑 */
export function titlePromptVars(video: ReviewVideo, edits: ReviewEdits): Record<string, string | undefined> {
  return {
    category: video.source?.category,
    title: edits.title,
    author: video.source?.author,
    platform: video.source?.platform,
    project: video.source?.project,
    tags: edits.tags.length ? edits.tags.join('、') : undefined,
  }
}

/** 用变量填充模板；模板里引用的变量有任何一个缺失时返回 null（交给用户自己写） */
export function fillPrompt(template: string, vars: Record<string, string | undefined>): string | null {
  let missing = false
  const out = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name]?.trim()
    if (!v) missing = true
    return v ?? ''
  })
  return missing ? null : out
}

/** 宿主提供的生成函数：收到提示词和视频信息，返回候选标题 */
export type TitleGenerator = (req: { prompt: string; video: ReviewVideo; edits: ReviewEdits }, signal: AbortSignal) => Promise<string[]>
