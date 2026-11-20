import { iou, padRect, unionRect } from './geometry'
import { createId } from './id'
import type { DelogoMode, DelogoRegion, Rect } from './types'

/** 各模型适配器统一输出的中间格式：某一时刻的一个框（归一化坐标） */
export type Detection = {
  time: number
  box: Rect
  label?: string
  score?: number
  trackId?: string
}

export type MergeOptions = {
  /** 写进 region.origin.model，例如 'yolo'、'sam2' */
  model: string
  duration: number
  /** 低于这个置信度的框丢掉。默认 0.25 */
  minScore?: number
  /** 同一目标在正常采样间隔之外又缺失超过这个秒数，就拆成两段。默认 1 */
  maxGap?: number
  /** 每个框向外扩的归一化边距，盖住边缘残影。默认 0.006 */
  padding?: number
  /** 每次检测覆盖的时长。不传时按检测时间的间隔推算 */
  sampleInterval?: number
  /** 短于这个秒数的片段丢掉。默认 0 */
  minDuration?: number
  /** 没有 trackId 时，同类框 IoU 超过这个值算同一目标。默认 0.3 */
  matchIou?: number
  mode?: DelogoMode
}

type Track = { key: string; label?: string; items: Detection[] }

function inferInterval(dets: Detection[]): number {
  const times = [...new Set(dets.map((d) => d.time))].sort((a, b) => a - b)
  if (times.length < 2) return 0
  const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

function buildTracks(dets: Detection[], matchIou: number): Track[] {
  const tracks: Track[] = []
  const sorted = [...dets].sort((a, b) => a.time - b.time)
  for (const d of sorted) {
    if (d.trackId !== undefined) {
      const key = `id:${d.trackId}`
      const t = tracks.find((tr) => tr.key === key)
      if (t) t.items.push(d)
      else tracks.push({ key, label: d.label, items: [d] })
      continue
    }
    // 没有 trackId：同类框里找上一帧位置最接近的
    let best: Track | undefined
    let bestIou = matchIou
    for (const t of tracks) {
      const last = t.items[t.items.length - 1]
      if (t.key.startsWith('id:') || last.label !== d.label || last.time === d.time) continue
      const v = iou(last.box, d.box)
      if (v >= bestIou) {
        best = t
        bestIou = v
      }
    }
    if (best) best.items.push(d)
    else tracks.push({ key: `auto:${tracks.length}`, label: d.label, items: [d] })
  }
  return tracks
}

/**
 * 逐帧检测结果 → 带时间段的 Delogo 区域。
 * 所有检测都在同一时刻（例如只对一帧跑了模型）时，区域覆盖整个视频。
 */
export function detectionsToRegions(dets: Detection[], opts: MergeOptions): DelogoRegion[] {
  const { model, duration, minScore = 0.25, maxGap = 1, padding = 0.006, minDuration = 0, matchIou = 0.3, mode = 'delogo' } = opts
  const kept = dets.filter((d) => d.score === undefined || d.score >= minScore)
  if (kept.length === 0) return []

  const singleFrame = kept.every((d) => d.time === kept[0].time)
  const interval = opts.sampleInterval ?? inferInterval(kept)
  const regions: DelogoRegion[] = []

  for (const track of buildTracks(kept, matchIou)) {
    let run: Detection[] = []
    const flush = () => {
      if (run.length === 0) return
      const box = padRect(run.map((d) => d.box).reduce(unionRect), padding)
      const start = singleFrame ? 0 : Math.max(0, run[0].time)
      const end = singleFrame ? duration : Math.min(duration, run[run.length - 1].time + interval)
      const scores = run.flatMap((d) => (d.score === undefined ? [] : [d.score]))
      if (end - start >= minDuration && end > start) {
        regions.push({
          ...box,
          start,
          end,
          id: createId(model),
          mode,
          origin: {
            model,
            label: track.label,
            score: scores.length ? Math.max(...scores) : undefined,
            trackId: track.key.startsWith('id:') ? track.key.slice(3) : undefined,
          },
        })
      }
      run = []
    }
    for (const d of track.items) {
      if (run.length > 0 && d.time - run[run.length - 1].time > interval + maxGap) flush()
      run.push(d)
    }
    flush()
  }
  return regions.sort((a, b) => a.start - b.start)
}
