import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { CropIcon, ScissorIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { DelogoIcon } from '@/components/icons/review-icons'
import { cn } from '@/lib/utils'
import { clamp } from '../core/geometry'
import { formatShort } from '../core/timecode'
import type { DelogoRegion, Rect, TimeRange } from '../core/types'
import type { Selection } from './use-reviewer-state'

const MIN_RANGE = 0.1
const EDGE_PX = 6
const SNAP_PX = 6

type Props = {
  duration: number
  time: number
  crop: Rect | null
  segments: TimeRange[]
  delogos: DelogoRegion[]
  selection: Selection
  onSeek: (time: number) => void
  onSelect: (s: Selection) => void
  onDelogoRange: (id: string, range: TimeRange, coalesceKey: string) => void
  onSegmentRange: (index: number, range: TimeRange, coalesceKey: string) => void
  className?: string
}

const majorStep = (duration: number) => (duration > 600 ? 60 : duration > 180 ? 30 : duration > 40 ? 10 : 5)

type DragMode = 'move' | 'start' | 'end'

export function Timeline({ duration, time, crop, segments, delogos, selection, onSeek, onSelect, onDelogoRange, onSegmentRange, className }: Props) {
  const lanes = useRef<HTMLDivElement>(null)
  const safeDuration = duration > 0 ? duration : 1
  const at = (t: number) => `${(t / safeDuration) * 100}%`
  const step = majorStep(safeDuration)
  const majors = Array.from({ length: Math.floor(safeDuration / step) + 1 }, (_, i) => i * step)
  const minors = Array.from({ length: Math.floor(safeDuration / (step / 5)) + 1 }, (_, i) => (i * step) / 5)

  const timeAt = (clientX: number) => {
    const r = lanes.current!.getBoundingClientRect()
    return clamp(((clientX - r.left) / r.width) * safeDuration, 0, safeDuration)
  }

  /** 拖背景：移动播放头 */
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    onSeek(timeAt(e.clientX))
    const onMove = (ev: PointerEvent) => onSeek(timeAt(ev.clientX))
    const onUp = () => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
  }

  /** 拖色条：中间平移，两端改开始 / 结束；靠近播放头时吸附 */
  const dragRange = (e: ReactPointerEvent<HTMLElement>, start: TimeRange, apply: (r: TimeRange, key: string) => void) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const bar = e.currentTarget
    const mode = ((e.target as HTMLElement).dataset.edge as DragMode | undefined) ?? 'move'
    const laneWidth = lanes.current!.getBoundingClientRect().width
    const pxPerSec = laneWidth / safeDuration
    const snap = (t: number) => (Math.abs(t - time) * pxPerSec < SNAP_PX ? time : t)
    const key = `range-${e.pointerId}-${e.timeStamp}`
    const x0 = e.clientX
    bar.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pxPerSec
      const len = start.end - start.start
      let next: TimeRange
      if (mode === 'move') {
        const s = clamp(start.start + dt, 0, safeDuration - len)
        next = { start: s, end: s + len }
      } else if (mode === 'start') {
        next = { start: clamp(snap(start.start + dt), 0, start.end - MIN_RANGE), end: start.end }
      } else {
        next = { start: start.start, end: clamp(snap(start.end + dt), start.start + MIN_RANGE, safeDuration) }
      }
      apply(next, key)
    }
    const onUp = () => {
      bar.removeEventListener('pointermove', onMove)
      bar.removeEventListener('pointerup', onUp)
      bar.removeEventListener('pointercancel', onUp)
    }
    bar.addEventListener('pointermove', onMove)
    bar.addEventListener('pointerup', onUp)
    bar.addEventListener('pointercancel', onUp)
  }

  const span = (r: TimeRange) => ({ left: at(r.start), width: at(r.end - r.start) })

  return (
    <div className={cn('grid grid-cols-[112px_1fr] text-[11px] select-none', className)}>
      <div className="border-r">
        <div className="h-5 border-b" />
        <TrackHead icon={ScissorIcon} swatch="bg-mark-segment" label="片段" count={segments.length} />
        {crop && <TrackHead icon={CropIcon} swatch="bg-mark-crop" label="裁剪" selected={selection?.kind === 'crop'} onClick={() => onSelect({ kind: 'crop' })} />}
        {delogos.map((d, i) => (
          <TrackHead
            key={d.id}
            icon={DelogoIcon}
            swatch="bg-mark-delogo"
            label={`Delogo ${i + 1}`}
            selected={selection?.kind === 'delogo' && selection.id === d.id}
            onClick={() => onSelect({ kind: 'delogo', id: d.id })}
          />
        ))}
      </div>

      <div ref={lanes} className="relative mx-3 cursor-pointer" onPointerDown={scrub}>
        <div className="relative h-5 border-b text-muted-foreground">
          {minors.map((t) => (
            <span key={t} className="absolute bottom-0 h-1 w-px bg-border" style={{ left: at(t) }} />
          ))}
          {majors.map((t) => {
            const nearEnd = t / safeDuration > 0.95
            return (
              <span key={t} className={cn('absolute bottom-0 flex h-full items-end', nearEnd && '-translate-x-full')} style={{ left: at(t) }}>
                <span className="h-2 w-px bg-muted-foreground/50" />
                <span className={cn('mb-1 tabular-nums', nearEnd ? 'order-first mr-1' : 'ml-1')}>{formatShort(t)}</span>
              </span>
            )
          })}
        </div>

        <Lane className="bg-[repeating-linear-gradient(135deg,var(--muted)_0_3px,transparent_3px_7px)]">
          {segments.length === 0 && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted-foreground">未设置片段，导出整段。按 I 设入点、S 切开</span>
          )}
          {segments.map((s, i) => (
            <Bar
              key={`${i}-${s.start}`}
              style={span(s)}
              className="bg-mark-segment"
              selected={selection?.kind === 'segment' && selection.index === i}
              onPointerDown={(e) => {
                onSelect({ kind: 'segment', index: i })
                dragRange(e, s, (r, key) => onSegmentRange(i, r, key))
              }}
            >
              <span className="truncate">片段 {i + 1}</span>
              <span className="ml-auto pl-2 tabular-nums opacity-70">{formatShort(s.end - s.start)}</span>
            </Bar>
          ))}
        </Lane>

        {crop && (
          <Lane>
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-mark-crop/80" />
          </Lane>
        )}

        {delogos.map((d) => {
          const selected = selection?.kind === 'delogo' && selection.id === d.id
          return (
            <Lane key={d.id} className={cn(selected && 'bg-mark-delogo/8')}>
              <Bar
                style={span(d)}
                className="bg-mark-delogo"
                selected={selected}
                onPointerDown={(e) => {
                  onSelect({ kind: 'delogo', id: d.id })
                  dragRange(e, d, (r, key) => onDelogoRange(d.id, r, key))
                }}
              >
                <span className="truncate tabular-nums">
                  {formatShort(d.start)}–{formatShort(d.end)}
                </span>
              </Bar>
            </Lane>
          )
        })}

        <Playhead left={at(time)} />
      </div>
    </div>
  )
}

function TrackHead({ icon, swatch, label, count, selected, onClick }: { icon: IconSvgElement; swatch: string; label: string; count?: number; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'flex h-7 w-full items-center gap-1.5 border-b px-2 text-left text-xs text-muted-foreground outline-none focus-visible:bg-muted disabled:cursor-default',
        onClick && 'hover:text-foreground',
        selected && 'bg-accent text-accent-foreground',
      )}
    >
      <span className={cn('h-3 w-[3px] shrink-0 rounded-full', swatch)} />
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.5} className="shrink-0" />
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="ml-auto tabular-nums">{count}</span>}
    </button>
  )
}

function Lane({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('relative h-7 border-b', className)}>{children}</div>
}

function Bar({
  children,
  className,
  style,
  selected,
  onPointerDown,
}: {
  children: ReactNode
  className?: string
  style: { left: string; width: string }
  selected?: boolean
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
}) {
  return (
    <div
      className={cn(
        'absolute inset-y-1 flex min-w-1 cursor-grab items-center overflow-hidden rounded-[4px] px-2 font-medium text-mark-ink active:cursor-grabbing',
        selected && 'ring-2 ring-foreground/70',
        className,
      )}
      style={style}
      onPointerDown={onPointerDown}
    >
      <span data-edge="start" className="absolute inset-y-0 left-0 flex cursor-ew-resize items-center pl-0.5" style={{ width: EDGE_PX }}>
        <span className="pointer-events-none h-3 w-0.5 rounded-full bg-mark-ink/40" />
      </span>
      {children}
      <span data-edge="end" className="absolute inset-y-0 right-0 flex cursor-ew-resize items-center justify-end pr-0.5" style={{ width: EDGE_PX }}>
        <span className="pointer-events-none h-3 w-0.5 rounded-full bg-mark-ink/40" />
      </span>
    </div>
  )
}

function Playhead({ left }: { left: string }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-playhead" style={{ left }} aria-hidden="true">
      <svg viewBox="0 0 11 12" className="absolute -top-px left-1/2 w-[11px] -translate-x-1/2 fill-playhead">
        <path d="M1.5 0H9.5C10.33 0 11 .67 11 1.5V6.4C11 6.8 10.84 7.18 10.56 7.46L6.56 11.46C5.97 12.05 5.03 12.05 4.44 11.46L.44 7.46C.16 7.18 0 6.8 0 6.4V1.5C0 .67.67 0 1.5 0Z" />
      </svg>
    </div>
  )
}
