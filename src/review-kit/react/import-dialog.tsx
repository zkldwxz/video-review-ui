import { useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatLabels, parseDetections, type DetectionFormat } from '../adapters/parse'
import { detectionsToRegions } from '../core/detections'
import { formatShort } from '../core/timecode'
import type { DelogoRegion, MediaInfo } from '../core/types'
import { modelLabel } from './labels'

const MODEL_OF: Record<DetectionFormat, string> = { 'yolo-txt': 'yolo', 'ultralytics-json': 'yolo', 'sam-json': 'sam2' }

/** 按当前视频尺寸生成的示例，方便对照格式 */
function samples(m: MediaInfo): { label: string; format: DetectionFormat; text: string }[] {
  const px = (x: number, y: number, w: number, h: number) => [Math.round(x * m.width), Math.round(y * m.height), Math.round(w * m.width), Math.round(h * m.height)]
  const [lx, ly, lw, lh] = px(0.834, 0.06, 0.106, 0.074)
  const step = Math.max(1, Math.round(m.duration / 8))
  const frames = Array.from({ length: Math.floor(m.duration / step) }, (_, i) => i * step)
  return [
    { label: 'YOLO 标签', format: 'yolo-txt', text: '0 0.887 0.097 0.106 0.074 0.93' },
    {
      label: 'Ultralytics 跟踪',
      format: 'ultralytics-json',
      text: JSON.stringify(
        frames.map((t) => ({ time: t, detections: [{ name: 'logo', class: 0, confidence: 0.91, track_id: 1, box: { x1: lx, y1: ly, x2: lx + lw, y2: ly + lh } }] })),
        null,
        1,
      ),
    },
    {
      label: 'SAM 2 视频',
      format: 'sam-json',
      text: JSON.stringify(
        Array.from({ length: 13 }, (_, i) => ({ frame_idx: (8 + i) * m.fps, obj_id: 2, label: 'watermark', mask: { bbox: px(0.064, 0.883, 0.125, 0.053), predicted_iou: 0.96 } })),
        null,
        1,
      ),
    },
  ]
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  media: MediaInfo
  /** false 时 Delogo 不分时间段：同一目标不拆段，列表不显示时间 */
  timeRange?: boolean
  onImport: (regions: DelogoRegion[]) => void
}

export function ImportDialog({ open, onOpenChange, media, timeRange = true, onImport }: Props) {
  const ids = { text: useId(), score: useId(), gap: useId() }
  const [text, setText] = useState('')
  const [format, setFormat] = useState<DetectionFormat | 'auto'>('auto')
  const [minScore, setMinScore] = useState(0.25)
  const [maxGap, setMaxGap] = useState(1)

  const result = useMemo(() => {
    if (!text.trim()) return null
    try {
      const parsed = parseDetections(text, media, format === 'auto' ? undefined : format)
      const regions = detectionsToRegions(parsed.detections, { model: MODEL_OF[parsed.format], duration: media.duration, minScore, maxGap: timeRange ? maxGap : Infinity })
      return { ok: true as const, ...parsed, regions }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  }, [text, format, media, minScore, maxGap, timeRange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>导入模型结果</DialogTitle>
          <DialogDescription>
            粘贴 YOLO 或 SAM 的输出，逐帧的框会按目标合并成带时间段的 Delogo 区域。像素坐标按当前视频 {media.width}×{media.height}、{media.fps} fps 换算。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={format} onValueChange={(v) => setFormat(v as DetectionFormat | 'auto')}>
              <SelectTrigger size="sm" className="w-44" aria-label="格式">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">自动识别格式</SelectItem>
                {(Object.keys(formatLabels) as DetectionFormat[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {formatLabels[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-[11px] text-muted-foreground">填入示例</span>
            {samples(media).map((s) => (
              <Button key={s.label} variant="outline" size="xs" onClick={() => setText(s.text)}>
                {s.label}
              </Button>
            ))}
          </div>

          <Label htmlFor={ids.text} className="sr-only">
            模型输出
          </Label>
          <Textarea
            id={ids.text}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            placeholder={'YOLO 标签：0 0.887 0.097 0.106 0.074 0.93\nUltralytics：result.summary() 的数组，或 [{ time, detections }]\nSAM：[{ bbox, segmentation, predicted_iou }] 或 SAM 2 的 [{ frame_idx, obj_id, mask }]'}
            className="h-44 resize-none font-mono text-[11px] leading-4"
          />

          <div className={cn('grid gap-3', timeRange && 'grid-cols-2')}>
            <div className="flex flex-col gap-1">
              <Label htmlFor={ids.score} className="text-[11px] font-normal text-muted-foreground">
                置信度下限
              </Label>
              <Input id={ids.score} type="number" step={0.05} min={0} max={1} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="tabular-nums" />
            </div>
            {timeRange && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={ids.gap} className="text-[11px] font-normal text-muted-foreground">
                缺失超过多少秒拆成两段
              </Label>
              <Input id={ids.gap} type="number" step={0.5} min={0} value={maxGap} onChange={(e) => setMaxGap(Number(e.target.value))} className="tabular-nums" />
             </div>
             )}
          </div>

          {result && !result.ok && <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{result.error}</p>}
          {result?.ok && (
            <div className="rounded-md border">
              <p className="border-b px-3 py-2 text-xs text-muted-foreground">
                识别为 {formatLabels[result.format]}：{result.detections.length} 个框，合并成 {result.regions.length} 个区域
              </p>
              <ul className="max-h-32 divide-y overflow-y-auto text-xs">
                {result.regions.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 tabular-nums">
                    <span className="size-2 rounded-[2px] bg-mark-delogo" />
                    {r.origin && modelLabel(r.origin)}
                    {r.origin?.label && <span className="text-muted-foreground">{r.origin.label}</span>}
                    {timeRange && (
                      <span className="ml-auto text-muted-foreground">
                        {formatShort(r.start)}–{formatShort(r.end)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!result?.ok || result.regions.length === 0}
            onClick={() => {
              if (result?.ok) onImport(result.regions)
              setText('')
              onOpenChange(false)
            }}
          >
            导入 {result?.ok ? result.regions.length : 0} 个区域
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
