/** 画面坐标统一用 0–1 的归一化值（相对视频原始宽高），导出时再换算成像素 */
export type Rect = { x: number; y: number; w: number; h: number }

/** 时间单位：秒 */
export type TimeRange = { start: number; end: number }

export type DelogoMode = 'delogo' | 'blur'

/** 区域来源：手动绘制，或由模型预设（保留模型给的标签和置信度，方便复核） */
export type RegionOrigin = { model: string; label?: string; score?: number; trackId?: string }

export type DelogoRegion = Rect &
  TimeRange & {
    id: string
    mode: DelogoMode
    origin?: RegionOrigin
  }

export type ReviewStatus = 'pending' | 'marked' | 'approved' | 'rejected'

export type VideoStats = {
  plays?: number
  likes?: number
  comments?: number
  shares?: number
  favorites?: number
}

/** 视频来源信息。字段都可选，宿主有什么传什么；其他数据放 extra，会按原样展示。 */
export type VideoSourceInfo = {
  externalId?: string
  platform?: string
  url?: string
  author?: string
  authorId?: string
  publishedAt?: string
  project?: string
  category?: string
  stats?: VideoStats
  extra?: Record<string, string | number>
}

/** 审核时可编辑、可撤销的全部内容 */
export type ReviewEdits = {
  title: string
  tags: string[]
  crop: Rect | null
  delogos: DelogoRegion[]
  segments: TimeRange[]
  status: ReviewStatus
  note: string
}

export type ReviewVideo = {
  id: string
  src: string
  poster?: string
  fileName: string
  /** 不传时从视频元数据读取 */
  width?: number
  height?: number
  duration?: number
  fps?: number
  source?: VideoSourceInfo
  edits: ReviewEdits
}

/** 视频元数据加载完成后才确定的信息 */
export type MediaInfo = { width: number; height: number; duration: number; fps: number }

export function emptyEdits(title: string): ReviewEdits {
  return { title, tags: [], crop: null, delogos: [], segments: [], status: 'pending', note: '' }
}
