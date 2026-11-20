import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { moveRect, resizeRect, type ResizeHandle } from '../core/geometry'
import { formatShort } from '../core/timecode'
import type { DelogoRegion, Rect } from '../core/types'
import { modelLabel } from './labels'
import type { Selection } from './use-reviewer-state'

const MIN_SIZE = 0.01
const pct = (n: number) => `${n * 100}%`
const rectStyle = (r: Rect): CSSProperties => ({ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) })

type Props = {
  width: number
  height: number
  time: number
  crop: Rect | null
  delogos: DelogoRegion[]
  selection?: Selection
  showThirds?: boolean
  /** 裁剪框锁定的像素宽高比，例如 16/9；null 为自由 */
  cropAspect?: number | null
  /** false 时 Delogo 不分时间段：框始终生效，标签不显示时间 */
  showTimes?: boolean
  /** 不传回调时只展示，不可交互 */
  onSelect?: (s: Selection) => void
  onCropChange?: (rect: Rect, coalesceKey: string) => void
  onDelogoChange?: (id: string, rect: Rect, coalesceKey: string) => void
  className?: string
}

/** 画面上的裁剪框和 Delogo 框。坐标都是 0–1 归一化值，拖动和缩放的结果通过回调交出去。 */
export function RegionOverlay({ width, height, time, crop, delogos, selection, showThirds = true, cropAspect, showTimes = true, onSelect, onCropChange, onDelogoChange, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const interactive = !!onSelect

  const beginDrag = (e: ReactPointerEvent, start: Rect, mode: 'move' | ResizeHandle, aspect: number | undefined, apply?: (r: Rect, key: string) => void) => {
    if (!apply || !ref.current || e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const box = ref.current.getBoundingClientRect()
    const target = e.currentTarget as HTMLElement
    const key = `drag-${e.pointerId}-${e.timeStamp}`
    const x0 = e.clientX
    const y0 = e.clientY
    target.setPointerCapture(e.pointerId)
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - x0) / box.width
      const dy = (ev.clientY - y0) / box.height
      // 按住 Shift 缩放时保持当前比例
      const lock = aspect ?? (ev.shiftKey ? start.w / start.h : undefined)
      apply(mode === 'move' ? moveRect(start, dx, dy) : resizeRect(start, mode, dx, dy, MIN_SIZE, lock), key)
    }
    const onUp = () => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onUp)
    }
    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onUp)
  }

  const cropNormAspect = cropAspect ? (cropAspect * height) / width : undefined
  const cropSelected = selection?.kind === 'crop'

  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0', className)}>
      {crop && (
        <>
          <svg className="absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            <path d={`M0 0H1V1H0Z M${crop.x} ${crop.y}V${crop.y + crop.h}H${crop.x + crop.w}V${crop.y}Z`} fillRule="evenodd" fill="oklch(0 0 0 / 55%)" />
          </svg>
          <div
            className={cn('mark-outline absolute animate-in rounded-[2px] duration-150 ease-snap fade-in zoom-in-95 [--mark:var(--mark-crop)]', interactive && 'pointer-events-auto', onCropChange && 'cursor-move')}
            style={rectStyle(crop)}
            onPointerDown={(e) => {
              onSelect?.({ kind: 'crop' })
              beginDrag(e, crop, 'move', undefined, onCropChange)
            }}
          >
            {showThirds && <Thirds />}
            <MarkLabel className="bg-mark-crop" placement={crop.y < 0.05 ? 'inside' : 'above'}>
              裁剪 <span className="tabular-nums">{Math.round(crop.w * width)}×{Math.round(crop.h * height)}</span>
            </MarkLabel>
            {((cropSelected && onCropChange) || !interactive) && <Handles onDown={onCropChange ? (e, h) => beginDrag(e, crop, h, cropNormAspect, onCropChange) : undefined} />}
          </div>
        </>
      )}

      {delogos.map((d, i) => {
        const active = !showTimes || (time >= d.start && time <= d.end)
        const selected = selection?.kind === 'delogo' && selection.id === d.id
        const apply = onDelogoChange && ((r: Rect, key: string) => onDelogoChange(d.id, r, key))
        return (
          <div
            key={d.id}
            className={cn(
              'absolute animate-in rounded-[2px] duration-150 ease-snap fade-in zoom-in-95 [--mark:var(--mark-delogo)]',
              active
                ? 'mark-outline bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--mark-delogo)_28%,transparent)_0_4px,transparent_4px_8px)]'
                : 'border-[1.5px] border-dashed border-mark-delogo/70',
              selected && 'z-10',
              interactive && 'pointer-events-auto',
              apply && 'cursor-move',
            )}
            style={rectStyle(d)}
            onPointerDown={(e) => {
              onSelect?.({ kind: 'delogo', id: d.id })
              beginDrag(e, d, 'move', undefined, apply)
            }}
          >
            <MarkLabel
              className={cn('bg-mark-delogo', !active && !selected && 'opacity-70')}
              placement={d.y < 0.12 ? 'below' : 'above'}
              alignEnd={d.x + d.w > 0.75}
            >
              Delogo {i + 1}
              {showTimes && (
                <span className="tabular-nums opacity-75">
                  {formatShort(d.start)}–{formatShort(d.end)}
                </span>
              )}
              {d.origin && <span className="opacity-75">{modelLabel(d.origin)}</span>}
            </MarkLabel>
            {selected && apply && <Handles onDown={(e, h) => beginDrag(e, d, h, undefined, apply)} />}
          </div>
        )
      })}
    </div>
  )
}

function Thirds() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {[1, 2].map((n) => (
        <span key={`v${n}`} className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${(n / 3) * 100}%` }} />
      ))}
      {[1, 2].map((n) => (
        <span key={`h${n}`} className="absolute inset-x-0 h-px bg-white/30" style={{ top: `${(n / 3) * 100}%` }} />
      ))}
    </div>
  )
}

type LabelPlacement = 'above' | 'below' | 'inside'

const placementClass: Record<LabelPlacement, string> = {
  above: 'bottom-[calc(100%+4px)]',
  below: 'top-[calc(100%+4px)]',
  inside: 'top-1',
}

function MarkLabel({ children, className, placement, alignEnd = false }: { children: ReactNode; className?: string; placement: LabelPlacement; alignEnd?: boolean }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute flex items-center gap-1 rounded-[3px] px-1.5 py-px text-caption font-medium whitespace-nowrap text-mark-ink shadow-[0_0_0_1px_oklch(0_0_0/35%)]',
        placementClass[placement],
        alignEnd ? 'right-[-1.5px]' : 'left-[-1.5px]',
        placement === 'inside' && (alignEnd ? 'right-1' : 'left-1'),
        className,
      )}
    >
      {children}
    </span>
  )
}

const handles: { h: ResizeHandle; pos: string; cursor: string }[] = [
  { h: 'nw', pos: 'left-0 top-0', cursor: 'cursor-nwse-resize' },
  { h: 'n', pos: 'left-1/2 top-0', cursor: 'cursor-ns-resize' },
  { h: 'ne', pos: 'left-full top-0', cursor: 'cursor-nesw-resize' },
  { h: 'w', pos: 'left-0 top-1/2', cursor: 'cursor-ew-resize' },
  { h: 'e', pos: 'left-full top-1/2', cursor: 'cursor-ew-resize' },
  { h: 'sw', pos: 'left-0 top-full', cursor: 'cursor-nesw-resize' },
  { h: 's', pos: 'left-1/2 top-full', cursor: 'cursor-ns-resize' },
  { h: 'se', pos: 'left-full top-full', cursor: 'cursor-nwse-resize' },
]

function Handles({ onDown }: { onDown?: (e: ReactPointerEvent, h: ResizeHandle) => void }) {
  return (
    <>
      {handles.map(({ h, pos, cursor }) => (
        // 可点区域 16px，可见方块 8px
        <span
          key={h}
          className={cn('absolute flex size-4 -translate-1/2 items-center justify-center', pos, onDown && cn('pointer-events-auto', cursor))}
          onPointerDown={onDown && ((e) => onDown(e, h))}
          aria-hidden="true"
        >
          <span className="size-2 rounded-[2px] bg-(--mark) shadow-[0_0_0_1px_oklch(0_0_0/55%)]" />
        </span>
      ))}
    </>
  )
}
