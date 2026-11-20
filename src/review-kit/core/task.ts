import type { MediaInfo, RegionOrigin, ReviewEdits, ReviewStatus, ReviewVideo, TimeRange, VideoSourceInfo } from './types'

export type PixelRect = { x: number; y: number; w: number; h: number }

/**
 * 保存时交给宿主的处理任务。坐标已换算成像素：
 * - crop：宽高和起点取偶数（yuv420 编码要求）
 * - delogos：相对原始画面，四周至少留 1px（ffmpeg delogo 需要用边框像素插值），应在 crop 之前处理
 * - segments：为空表示整段保留
 */
export type ReviewTask = {
  videoId: string
  src: string
  fileName: string
  title: string
  tags: string[]
  status: ReviewStatus
  note: string
  source?: VideoSourceInfo
  media: MediaInfo
  crop: PixelRect | null
  delogos: (PixelRect & TimeRange & { mode: 'delogo' | 'blur'; origin?: RegionOrigin })[]
  segments: TimeRange[]
}

const even = (v: number) => Math.floor(v / 2) * 2
const round3 = (v: number) => Math.round(v * 1000) / 1000

export function buildTask(video: ReviewVideo, edits: ReviewEdits, media: MediaInfo): ReviewTask {
  const { width: W, height: H } = media
  const crop = edits.crop && {
    x: even(edits.crop.x * W),
    y: even(edits.crop.y * H),
    w: even(edits.crop.w * W),
    h: even(edits.crop.h * H),
  }
  const delogos = edits.delogos.map((d) => {
    const x = Math.max(1, Math.round(d.x * W))
    const y = Math.max(1, Math.round(d.y * H))
    return {
      x,
      y,
      w: Math.max(1, Math.min(Math.round(d.w * W), W - 1 - x)),
      h: Math.max(1, Math.min(Math.round(d.h * H), H - 1 - y)),
      start: round3(d.start),
      end: round3(d.end),
      mode: d.mode,
      ...(d.origin && { origin: d.origin }),
    }
  })
  return {
    videoId: video.id,
    src: video.src,
    fileName: video.fileName,
    title: edits.title,
    tags: edits.tags,
    status: edits.status,
    note: edits.note,
    ...(video.source && { source: video.source }),
    media,
    crop,
    delogos,
    segments: edits.segments.map((s) => ({ start: round3(s.start), end: round3(s.end) })),
  }
}
