import { createContext, useContext } from 'react'
import type { RefObject } from 'react'
import type { EditAction } from '../core/edits'
import type { ReviewFeatures } from '../core/features'
import type { Keymap } from '../core/shortcuts'
import type { TitleGenerator } from '../core/title-prompt'
import type { MediaInfo, ReviewEdits, ReviewVideo } from '../core/types'
import type { Notify } from './use-toasts'
import type { Player } from './use-player'
import type { Selection } from './use-reviewer-state'

export type ReviewerContextValue = {
  video: ReviewVideo
  edits: ReviewEdits
  media: MediaInfo
  player: Player
  selection: Selection
  setSelection: (s: Selection) => void
  dispatch: (action: EditAction, coalesceKey?: string, videoId?: string) => void
  tagOptions: string[]
  /** 和当前视频声明分辨率相同的其他视频 */
  sameResolution: ReviewVideo[]
  cropAspect: number | null
  setCropAspect: (a: number | null) => void
  showThirds: boolean
  setShowThirds: (v: boolean) => void
  newDelogo: () => void
  newCrop: () => void
  openImport: () => void
  /** 轻提示；action 常用来放“撤销” */
  notify: Notify
  /** 撤销当前视频的上一步（给提示里的“撤销”按钮用） */
  undo: () => void
  keymap: Keymap
  /** 已合并默认值的功能开关 */
  features: ReviewFeatures
  /** 关掉改标题时为 undefined */
  generateTitles?: TitleGenerator
  titlePromptTemplate: string
  /** AI 改写标题的输入框，快捷键聚焦用 */
  aiTitleInput: RefObject<HTMLInputElement | null>
}

export const ReviewerContext = createContext<ReviewerContextValue | null>(null)

export function useReviewer(): ReviewerContextValue {
  const ctx = useContext(ReviewerContext)
  if (!ctx) throw new Error('useReviewer 必须在 <VideoReviewer> 内使用')
  return ctx
}
