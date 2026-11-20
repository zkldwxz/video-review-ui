import { useId } from 'react'
import { Add01Icon, AiScanIcon, CropIcon, Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ApplyToBatchIcon, MarkInIcon, MarkOutIcon, SplitAtPlayheadIcon } from '@/components/icons/review-icons'
import { cn } from '@/lib/utils'
import { clampRect, fitAspect } from '../core/geometry'
import { createId } from '../core/id'
import { formatShort, formatTimecode } from '../core/timecode'
import type { DelogoMode, DelogoRegion, Rect } from '../core/types'
import { useReviewer } from './context'
import { Field, NumberField, TimeField } from './fields'
import { modelLabel } from './labels'

const MIN_RANGE = 0.1

/** 像素 ↔ 归一化 的四个输入框 */
function RectFields({ rect, onChange, columns = 2 }: { rect: Rect; onChange: (r: Rect, key: string) => void; columns?: 2 | 4 }) {
  const { media } = useReviewer()
  const W = media.width
  const H = media.height
  const px = (v: number, total: number) => Math.round(v * total)
  const set = (field: keyof Rect, value: number) => onChange(clampRect({ ...rect, [field]: field === 'x' || field === 'w' ? value / W : value / H }), `num-${field}-${Date.now()}`)
  return (
    <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-4')}>
      <NumberField label="X" value={px(rect.x, W)} max={W} onCommit={(v) => set('x', v)} />
      <NumberField label="Y" value={px(rect.y, H)} max={H} onCommit={(v) => set('y', v)} />
      <NumberField label="宽" value={px(rect.w, W)} min={2} max={W} onCommit={(v) => set('w', v)} />
      <NumberField label="高" value={px(rect.h, H)} min={2} max={H} onCommit={(v) => set('h', v)} />
    </div>
  )
}

const ASPECTS: { label: string; value: string }[] = [
  { label: '自由', value: 'free' },
  { label: '原始', value: 'source' },
  { label: '16:9', value: String(16 / 9) },
  { label: '9:16', value: String(9 / 16) },
  { label: '1:1', value: '1' },
  { label: '4:3', value: String(4 / 3) },
]

export function CropPanel() {
  const { edits, media, dispatch, cropAspect, setCropAspect, showThirds, setShowThirds, sameResolution, newCrop, notify, undo, features, readOnly } = useReviewer()
  const thirdsId = useId()
  const crop = edits.crop
  const aspectValue = cropAspect === null ? 'free' : Math.abs(cropAspect - media.width / media.height) < 1e-6 ? 'source' : String(cropAspect)

  return (
    <div className="flex flex-col gap-4">
      {!readOnly && (
      <Field label="画面比例">
        <ToggleGroup
          type="single"
          value={aspectValue}
          onValueChange={(v) => {
            if (!v) return
            const a = v === 'free' ? null : v === 'source' ? media.width / media.height : Number(v)
            setCropAspect(a)
            if (a !== null && crop) dispatch({ type: 'setCrop', crop: fitAspect(crop, (a * media.height) / media.width) })
          }}
          variant="outline"
          size="sm"
          className="grid w-full grid-cols-6"
        >
          {ASPECTS.map((a) => (
            <ToggleGroupItem key={a.value} value={a.value} className="tabular-nums">
              {a.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      )}


      {crop ? (
        <>
          <fieldset disabled={readOnly} className="contents">
            <RectFields rect={crop} onChange={(r, key) => dispatch({ type: 'setCrop', crop: r }, key)} />
          </fieldset>
          <div className="flex items-center justify-between">
            <Label htmlFor={thirdsId} className="text-xs font-normal">
              显示三分线
            </Label>
            <Switch id={thirdsId} size="sm" checked={showThirds} onCheckedChange={setShowThirds} />
          </div>
          {!readOnly && (
          <div className="flex justify-end gap-2">
            {features.batchSync && (
            <Button
              variant="outline"
              className="flex-1 justify-start"
              disabled={sameResolution.length === 0}
              onClick={() => {
                sameResolution.forEach((v) => dispatch({ type: 'setCrop', crop }, undefined, v.id))
                notify(`裁剪框已同步到 ${sameResolution.length} 个视频`, { tone: 'success' })
              }}
            >
              <HugeiconsIcon icon={ApplyToBatchIcon} strokeWidth={1.5} data-icon="inline-start" />
              同步到 {sameResolution.length} 个同分辨率视频
            </Button>
            )}
            <Button variant="destructive" size="icon" aria-label="删除裁剪框" onClick={() => {
                dispatch({ type: 'setCrop', crop: null })
                notify('已删除裁剪框', { action: { label: '撤销', onClick: undo } })
              }}>
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
            </Button>
          </div>
          )}
        </>
      ) : readOnly ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">没有裁剪框，导出原始画面。</p>
      ) : (
        <Button variant="outline" onClick={newCrop} className="justify-start">
          <HugeiconsIcon icon={CropIcon} strokeWidth={1.5} data-icon="inline-start" />
          添加裁剪框
          <Kbd className="ml-auto">C</Kbd>
        </Button>
      )}
    </div>
  )
}

export function DelogoPanel() {
  const { edits, media, player, selection, setSelection, dispatch, sameResolution, newDelogo, openImport, notify, undo, features, readOnly, delogoMode } = useReviewer()
  const timed = features.delogoTimeRange
  const time = player.state.time
  const fps = media.fps

  return (
    <div className="flex flex-col gap-2">
      {edits.delogos.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          {readOnly ? '没有 Delogo 区域。' : <>还没有 Delogo 区域。按 <Kbd>N</Kbd> 新建{features.modelImport && '，或导入模型识别结果'}。</>}
        </p>
      )}
      {edits.delogos.map((d, i) => {
        const selected = selection?.kind === 'delogo' && selection.id === d.id
        const active = !timed || (time >= d.start && time <= d.end)
        const update = (patch: Partial<Omit<DelogoRegion, 'id'>>, key?: string) => dispatch({ type: 'updateDelogo', id: d.id, patch }, key)
        return (
          <div key={d.id} className={cn('rounded-lg border transition-colors duration-120 ease-snap', selected ? 'border-mark-delogo-fg/50 bg-mark-delogo/8' : 'hover:bg-muted/60')}>
            <button
              type="button"
              onClick={() => setSelection(selected ? null : { kind: 'delogo', id: d.id })}
              aria-expanded={selected}
              className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <span className={cn('size-2 shrink-0 rounded-[2px]', active ? 'bg-mark-delogo' : 'border border-mark-delogo-fg')} />
              <span className="font-medium">Delogo {i + 1}</span>
              {d.origin && <span className="truncate text-caption text-mark-delogo-fg">{modelLabel(d.origin)}</span>}
              {timed && (
                <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                  {formatShort(d.start)}–{formatShort(d.end)}
                </span>
              )}
            </button>
            {selected && (
              <div className="flex animate-in flex-col gap-3 border-t px-2.5 pt-2.5 pb-3 duration-150 ease-snap fade-in slide-in-from-top-1">
                <fieldset disabled={readOnly} className="contents">
                {timed && (
                <div className="grid grid-cols-2 gap-2">
                  <TimeField
                    label="开始"
                    value={d.start}
                    fps={fps}
                    icon={MarkInIcon}
                    onCommit={(t) => update({ start: Math.min(t, d.end - MIN_RANGE) })}
                    onUsePlayhead={() => update({ start: Math.min(time, d.end - MIN_RANGE) })}
                  />
                  <TimeField
                    label="结束"
                    value={d.end}
                    fps={fps}
                    icon={MarkOutIcon}
                    onCommit={(t) => update({ end: Math.min(media.duration, Math.max(t, d.start + MIN_RANGE)) })}
                    onUsePlayhead={() => update({ end: Math.max(time, d.start + MIN_RANGE) })}
                  />
                </div>
                )}
                <RectFields rect={d} columns={4} onChange={(r, key) => update(r, key)} />
                {!delogoMode && (
                <Field label="处理方式">
                  <Select value={d.mode} onValueChange={(v) => update({ mode: v as DelogoMode })}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delogo">插值修补（delogo）</SelectItem>
                      <SelectItem value="blur">模糊（boxblur）</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                )}
                </fieldset>
                {d.origin && (
                  <p className="text-caption text-muted-foreground">
                    由 {modelLabel(d.origin)} 预设
                    {d.origin.label && `，类别 ${d.origin.label}`}
                    {d.origin.trackId && `，跟踪 ID ${d.origin.trackId}`}
                  </p>
                )}
                {!readOnly && (
                <div className="flex justify-end gap-2">
                  {timed && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => update({ start: 0, end: media.duration })}>
                      整段生效
                    </Button>
                  )}
                  {features.batchSync && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={sameResolution.length === 0}
                    title="复制到同分辨率的其他视频"
                    onClick={() => {
                      sameResolution.forEach((v) => dispatch({ type: 'addDelogo', region: { ...d, id: createId('d'), origin: d.origin } }, undefined, v.id))
                      notify(`Delogo ${i + 1} 已同步到 ${sameResolution.length} 个视频`, { tone: 'success' })
                    }}
                  >
                    <HugeiconsIcon icon={ApplyToBatchIcon} strokeWidth={1.5} data-icon="inline-start" />
                    同步 {sameResolution.length}
                  </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => {
                      dispatch({ type: 'removeDelogo', id: d.id })
                      notify(`已删除 Delogo ${i + 1}`, { action: { label: '撤销', onClick: undo } })
                    }}>
                    <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} data-icon="inline-start" />
                    删除
                  </Button>
                </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {!readOnly && (
      <div className={cn('grid gap-2 pt-1', features.modelImport && 'grid-cols-2')}>
        <Button variant="outline" onClick={newDelogo}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} data-icon="inline-start" />
          新建区域
          <Kbd className="ml-auto">N</Kbd>
        </Button>
        {features.modelImport && (
          <Button variant="outline" onClick={openImport}>
            <HugeiconsIcon icon={AiScanIcon} strokeWidth={1.5} data-icon="inline-start" />
            导入模型结果
          </Button>
        )}
      </div>
      )}
    </div>
  )
}

export function SegmentsPanel({ onMarkIn, onMarkOut, onSplit }: { onMarkIn: () => void; onMarkOut: () => void; onSplit: () => void }) {
  const { edits, media, selection, setSelection, dispatch, notify, undo, readOnly } = useReviewer()
  const kept = edits.segments.reduce((sum, s) => sum + s.end - s.start, 0)

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={onMarkIn}>
          <HugeiconsIcon icon={MarkInIcon} strokeWidth={1.5} data-icon="inline-start" />
          入点 <Kbd className="ml-auto">I</Kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={onMarkOut}>
          <HugeiconsIcon icon={MarkOutIcon} strokeWidth={1.5} data-icon="inline-start" />
          出点 <Kbd className="ml-auto">O</Kbd>
        </Button>
        <Button variant="outline" size="sm" onClick={onSplit}>
          <HugeiconsIcon icon={SplitAtPlayheadIcon} strokeWidth={1.5} data-icon="inline-start" />
          切开 <Kbd className="ml-auto">S</Kbd>
        </Button>
      </div>
      )}
      {edits.segments.map((s, i) => {
        const selected = selection?.kind === 'segment' && selection.index === i
        return (
          <div
            key={`${i}-${s.start}`}
            className={cn('grid h-9 grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg border pr-1 pl-2.5 text-xs', selected && 'border-mark-segment-fg/50 bg-mark-segment/10')}
          >
            <span className="h-3 w-[3px] rounded-full bg-mark-segment" />
            <button type="button" className="truncate text-left tabular-nums outline-none focus-visible:underline" onClick={() => setSelection({ kind: 'segment', index: i })}>
              {formatTimecode(s.start, media.fps)} – {formatTimecode(s.end, media.fps)}
            </button>
            <span className="text-muted-foreground tabular-nums">{formatShort(s.end - s.start)}</span>
            {!readOnly && (
              <Button variant="ghost" size="icon-sm" aria-label={`删除片段 ${i + 1}`} onClick={() => {
                  dispatch({ type: 'removeSegment', index: i })
                  notify(`已删除片段 ${i + 1}`, { action: { label: '撤销', onClick: undo } })
                }}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
              </Button>
            )}
          </div>
        )
      })}
      <p className="px-1 text-xs text-muted-foreground tabular-nums">
        {edits.segments.length === 0 ? '未设置片段，导出整段视频。' : `保留 ${formatShort(kept)}，剪掉 ${formatShort(Math.max(0, media.duration - kept))}`}
      </p>
    </div>
  )
}
