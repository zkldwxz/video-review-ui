import { CropIcon, ScissorIcon, Search01Icon, Video01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { DelogoIcon } from '@/components/icons/review-icons'
import { EmptyQueueArt } from '@/components/review/empty-queue-art'
import { cn } from '@/lib/utils'
import { formatShort } from '../core/timecode'
import type { QueueFilter } from '../core/queue'
import type { ReviewEdits, ReviewVideo } from '../core/types'
import { StatusBadge } from './fields'
import { keepFocus } from './use-shortcuts'

const FILTERS: [QueueFilter, string][] = [
  ['all', '全部'],
  ['pending', '待审'],
  ['marked', '已标记'],
  ['done', '已审'],
]

type Props = {
  videos: ReviewVideo[]
  total: number
  doneCount: number
  editsOf: (id: string) => ReviewEdits | undefined
  activeId?: string
  onSelect: (id: string) => void
  query: string
  onQueryChange: (q: string) => void
  filter: QueueFilter
  onFilterChange: (f: QueueFilter) => void
}

export function QueuePanel({ videos, total, doneCount, editsOf, activeId, onSelect, query, onQueryChange, filter, onFilterChange }: Props) {
  return (
    <aside className="flex min-h-0 flex-col border-r">
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">视频队列</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            已审 {doneCount} / {total}
          </span>
        </div>
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.5} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="搜索标题、ID、作者、标签" aria-label="搜索视频" className="pl-7" />
        </div>
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && onFilterChange(v as QueueFilter)} size="sm" className="w-full">
          {FILTERS.map(([v, l]) => (
            <ToggleGroupItem key={v} value={v} className="flex-1">
              {l}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 px-1.5 pb-2">
          {videos.map((v) => (
            <QueueItem key={v.id} video={v} edits={editsOf(v.id) ?? v.edits} active={v.id === activeId} onSelect={() => onSelect(v.id)} />
          ))}
          {videos.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <EmptyQueueArt className="w-28" />
              <p className="text-xs text-muted-foreground">{total === 0 ? '队列里还没有视频' : '没有符合条件的视频，换个关键词或筛选试试'}</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}

function QueueItem({ video, edits, active, onSelect }: { video: ReviewVideo; edits: ReviewEdits; active: boolean; onSelect: () => void }) {
  const author = video.source?.author
  return (
    <button
      type="button"
      onClick={onSelect}
      {...keepFocus}
      aria-current={active || undefined}
      className={cn(
        'relative grid w-full grid-cols-[64px_1fr_auto] items-start gap-2.5 rounded-md px-2 py-2 text-left outline-none',
        'transition-colors duration-120 ease-snap hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40',
        active && 'bg-accent text-accent-foreground hover:bg-accent',
      )}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
      <span className="relative mt-0.5 flex h-9 w-16 items-center justify-center overflow-hidden rounded-[4px] bg-stage text-white/50">
        {video.poster ? <img src={video.poster} alt="" className="size-full object-cover" loading="lazy" /> : <HugeiconsIcon icon={Video01Icon} size={16} strokeWidth={1.5} />}
        {video.duration !== undefined && (
          <span className="absolute right-0.5 bottom-0.5 rounded-[3px] bg-black/60 px-1 text-[10px] leading-3.5 text-white tabular-nums">{formatShort(video.duration)}</span>
        )}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[13px] leading-5" title={edits.title}>
          {edits.title}
        </span>
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
          {author && <span className="truncate">{author}</span>}
          <MarkCount icon={CropIcon} on={edits.crop !== null} className="text-mark-crop-fg" />
          <MarkCount icon={DelogoIcon} on={edits.delogos.length > 0} count={edits.delogos.length} className="text-mark-delogo-fg" />
          <MarkCount icon={ScissorIcon} on={edits.segments.length > 0} count={edits.segments.length} className="text-mark-segment-fg" />
        </span>
        {edits.tags.length > 0 && (
          <span className="mt-1 flex gap-1 overflow-hidden">
            {edits.tags.slice(0, 3).map((t) => (
              <span key={t} className="shrink-0 rounded-sm bg-muted px-1 text-[10px] leading-4 text-muted-foreground">
                {t}
              </span>
            ))}
            {edits.tags.length > 3 && <span className="text-[10px] leading-4 text-muted-foreground">+{edits.tags.length - 3}</span>}
          </span>
        )}
      </span>

      <StatusBadge status={edits.status} />
    </button>
  )
}

function MarkCount({ icon, on, count, className }: { icon: IconSvgElement; on: boolean; count?: number; className: string }) {
  if (!on) return null
  return (
    <span className={cn('flex shrink-0 items-center gap-0.5', className)}>
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.75} />
      {count}
    </span>
  )
}
