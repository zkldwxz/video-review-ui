import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { PencilEdit02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatTimecode, parseTimecode } from '../core/timecode'
import type { ReviewStatus } from '../core/types'
import { statusMeta } from './labels'

/** labelClassName 用来在窄处只留圆点，例如 'sr-only @min-[15rem]/queue:not-sr-only' */
export function StatusBadge({ status, labelClassName }: { status: ReviewStatus; labelClassName?: string }) {
  const { label, dot } = statusMeta[status]
  return (
    <Badge variant="outline" className="gap-1.5 font-normal" title={label}>
      <span className={cn('size-1.5 rounded-full', dot)} />
      <span className={labelClassName}>{label}</span>
    </Badge>
  )
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/** 回车或失焦时提交；Esc 还原 */
const commitKeys = (e: KeyboardEvent<HTMLInputElement>, reset: () => void) => {
  if (e.key === 'Enter') e.currentTarget.blur()
  if (e.key === 'Escape') {
    reset()
    e.currentTarget.blur()
  }
}

/** 像素数值输入。外部值变化时（例如拖框）重新挂载以显示新值。 */
export function NumberField({ label, value, min = 0, max, onCommit }: { label: string; value: number; min?: number; max?: number; onCommit: (v: number) => void }) {
  const id = useId()
  return (
    <div className="relative">
      <Label htmlFor={id} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-caption font-normal text-muted-foreground">
        {label}
      </Label>
      <Input
        key={value}
        id={id}
        defaultValue={value}
        inputMode="numeric"
        className="pl-6 text-right tabular-nums"
        onKeyDown={(e) => commitKeys(e, () => (e.currentTarget.value = String(value)))}
        onBlur={(e) => {
          const v = Number(e.currentTarget.value)
          if (!Number.isFinite(v)) {
            e.currentTarget.value = String(value)
            return
          }
          const clamped = Math.min(max ?? Infinity, Math.max(min, Math.round(v)))
          if (clamped !== value) onCommit(clamped)
          else e.currentTarget.value = String(value)
        }}
      />
    </div>
  )
}

/** 时间输入，附“设为当前时间”按钮 */
export function TimeField({ label, value, fps, icon, onCommit, onUsePlayhead }: { label: string; value: number; fps: number; icon: IconSvgElement; onCommit: (t: number) => void; onUsePlayhead: () => void }) {
  const id = useId()
  const [invalid, setInvalid] = useState(false)
  const text = formatTimecode(value, fps)
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-caption font-normal text-muted-foreground">
        {label}
      </Label>
      <div className="flex">
        <Input
          key={text}
          id={id}
          defaultValue={text}
          aria-invalid={invalid || undefined}
          className="rounded-r-none tabular-nums"
          onKeyDown={(e) => commitKeys(e, () => (e.currentTarget.value = text))}
          onBlur={(e) => {
            const t = parseTimecode(e.currentTarget.value, fps)
            setInvalid(t === null)
            if (t !== null && t !== value) onCommit(t)
          }}
        />
        <Button variant="outline" size="icon" className="rounded-l-none border-l-0" aria-label={`把${label}设为当前时间`} title={`把${label}设为当前时间`} onClick={onUsePlayhead}>
          <HugeiconsIcon icon={icon} strokeWidth={1.5} />
        </Button>
      </div>
      {invalid && <span className="text-caption text-destructive">格式示例：1:23、83.5、00:01:23:12</span>}
    </div>
  )
}

/** 可点击改名的标题 */
export function InlineTitle({ value, onCommit, className }: { value: string; onCommit: (v: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <Input
        autoFocus
        defaultValue={value}
        aria-label="视频标题"
        className={cn('text-sm font-semibold md:text-sm', className)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => commitKeys(e, () => (e.currentTarget.value = value))}
        onBlur={(e) => {
          const v = e.currentTarget.value.trim()
          if (v && v !== value) onCommit(v)
          setEditing(false)
        }}
      />
    )
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn('group/title flex min-w-0 items-center gap-1.5 rounded-md text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring/40', className)}
      title="点击重命名"
    >
      <span className="truncate">{value}</span>
      <HugeiconsIcon icon={PencilEdit02Icon} size={14} strokeWidth={1.5} className="shrink-0 text-muted-foreground opacity-0 transition-opacity duration-120 ease-snap group-hover/title:opacity-100 group-focus-visible/title:opacity-100" />
    </button>
  )
}
