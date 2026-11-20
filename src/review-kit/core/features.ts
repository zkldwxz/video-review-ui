import type { ShortcutAction } from './shortcuts'
import type { DelogoMode, ReviewEdits } from './types'

/**
 * 功能开关。三种调整方式：
 * 1. 传参数，只写要改的项：<VideoReviewer features={{ segments: false }} />
 * 2. 用预设：<VideoReviewer features={featurePresets.delogoOnly} />
 * 3. 改下面的 defaultFeatures：所有没传 features 的地方都会跟着变
 *
 * 关掉的功能会同时去掉界面、快捷键，以及保存任务里对应的数据。
 */
export type ReviewFeatures = {
  /** 左侧视频队列。关掉后只显示当前视频，↑ / ↓ 切换失效 */
  queue: boolean
  /** 改标题（含 AI 改写标题） */
  rename: boolean
  /** 打标签 */
  tags: boolean
  /** 来源信息：平台、作者、视频 ID、播放 / 点赞等数据、自定义字段 */
  sourceInfo: boolean
  /** 裁剪框 */
  crop: boolean
  /** Delogo 区域。关掉后“Delogo 时间段”和“模型导入”也一起关掉 */
  delogo: boolean
  /** Delogo 可设生效时间段。关掉后每个区域都整段生效 */
  delogoTimeRange: boolean
  /** 导入 YOLO / SAM 结果预设 Delogo */
  modelImport: boolean
  /** 片段剪切：入点、出点、在播放头处切开 */
  segments: boolean
  /** 把裁剪框 / Delogo 同步到同分辨率的其他视频 */
  batchSync: boolean
  /** 审核结论：通过 / 驳回和备注。关掉后只保留“保存” */
  decision: boolean
}

export const defaultFeatures: ReviewFeatures = {
  queue: true,
  rename: true,
  tags: true,
  sourceInfo: true,
  crop: true,
  delogo: true,
  delogoTimeRange: true,
  modelImport: true,
  segments: true,
  batchSync: true,
  decision: true,
}

export const featurePresets = {
  /** 全部功能 */
  full: defaultFeatures,
  /** 只做 Delogo：不要裁剪和片段剪切 */
  delogoOnly: { ...defaultFeatures, crop: false, segments: false },
  /** 只做 Delogo，每个区域整段生效 */
  delogoStatic: { ...defaultFeatures, crop: false, segments: false, delogoTimeRange: false },
  /** 只剪片段 */
  trimOnly: { ...defaultFeatures, crop: false, delogo: false },
} satisfies Record<string, ReviewFeatures>

export const featureLabels: Record<keyof ReviewFeatures, string> = {
  queue: '视频队列',
  rename: '改标题',
  tags: '标签',
  sourceInfo: '来源信息',
  crop: '裁剪',
  delogo: 'Delogo',
  delogoTimeRange: 'Delogo 时间段',
  modelImport: '模型导入',
  segments: '片段剪切',
  batchSync: '同步到同分辨率',
  decision: '审核结论',
}

/** 合并默认值，并处理依赖：没有 Delogo 时，时间段和模型导入都没有意义 */
export function resolveFeatures(features?: Partial<ReviewFeatures>): ReviewFeatures {
  const f = { ...defaultFeatures, ...features }
  if (!f.delogo) {
    f.delogoTimeRange = false
    f.modelImport = false
  }
  return f
}

/** 只读时不可用的动作：所有会改动内容或提交的操作 */
const EDIT_ACTIONS = new Set<ShortcutAction>(['newDelogo', 'newCrop', 'deleteSelected', 'markIn', 'markOut', 'split', 'undo', 'redo', 'save', 'aiTitle'])

/** 当前开关下某个快捷键动作是否可用 */
export function isActionEnabled(action: ShortcutAction, f: ReviewFeatures, opts: { aiTitle: boolean; readOnly?: boolean }): boolean {
  if (opts.readOnly && EDIT_ACTIONS.has(action)) return false
  switch (action) {
    case 'prevVideo':
    case 'nextVideo':
      return f.queue
    case 'newDelogo':
      return f.delogo
    case 'newCrop':
      return f.crop
    case 'markIn':
    case 'markOut':
      return f.segments || f.delogoTimeRange
    case 'split':
      return f.segments
    case 'deleteSelected':
      return f.crop || f.delogo || f.segments
    case 'aiTitle':
      return opts.aiTitle && f.rename
    default:
      return true
  }
}

/**
 * 按开关整理要保存的内容：关掉的功能不进入任务，Delogo 不分时间段时统一为整段。
 * 传了 delogoMode 时所有区域（含模型导入的）都用这种处理方式。
 */
export function applyFeatures(edits: ReviewEdits, f: ReviewFeatures, duration: number, opts: { delogoMode?: DelogoMode } = {}): ReviewEdits {
  const { delogoMode } = opts
  const delogos = !f.delogo
    ? []
    : edits.delogos.map((d) => ({
        ...d,
        ...(!f.delogoTimeRange && { start: 0, end: duration }),
        ...(delogoMode && { mode: delogoMode }),
      }))
  return {
    ...edits,
    crop: f.crop ? edits.crop : null,
    delogos,
    segments: f.segments ? edits.segments : [],
  }
}
