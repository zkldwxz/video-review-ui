// 核心逻辑（不依赖 React，可在 Node / Worker 里复用）
export * from './core/types'
export { applyEdit, createHistory, pushHistory, undo, redo, type EditAction, type History } from './core/edits'
export { detectionsToRegions, type Detection, type MergeOptions } from './core/detections'
export { buildTask, type ReviewTask, type PixelRect } from './core/task'
export { defaultKeymap, shortcutGroups, comboFromEvent, formatCombo, resolveAction, type Keymap, type ShortcutAction } from './core/shortcuts'
export { formatTimecode, formatShort, formatCount, parseTimecode } from './core/timecode'
export { createId } from './core/id'
export { DEFAULT_TITLE_PROMPT, fillPrompt, titlePromptVars, type TitleGenerator } from './core/title-prompt'
export { filterQueue, type QueueFilter } from './core/queue'

// 模型适配器
export { parseYoloLabels, fromUltralytics, type UltralyticsBox, type UltralyticsFrame } from './adapters/yolo'
export { fromSam, type SamItem, type SamMask } from './adapters/sam'
export { decodeCocoCounts, rleBBox, maskBBox, type CocoRle } from './adapters/rle'
export { parseDetections, formatLabels, type DetectionFormat } from './adapters/parse'

// React 组件
export { VideoReviewer, type VideoReviewerProps, type VideoReviewerHandle } from './react/video-reviewer'
export { RegionOverlay } from './react/region-overlay'
export { StatusBadge } from './react/fields'
