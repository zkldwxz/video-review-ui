import { Alert02Icon, CheckmarkCircle02Icon, Undo02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import type { Toast } from './use-toasts'

const toneIcon = { info: Undo02Icon, success: CheckmarkCircle02Icon, error: Alert02Icon }
const toneClass = { info: 'text-muted-foreground', success: 'text-success', error: 'text-destructive' }

export function ToastViewport({ toasts, onDismiss, className }: { toasts: Toast[]; onDismiss: (id: number) => void; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('pointer-events-none flex flex-col items-center gap-1.5', className)}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex h-8 items-center gap-2 rounded-full bg-popover/95 pr-1.5 pl-3 text-xs text-popover-foreground shadow-[0_8px_24px_-12px_oklch(0_0_0/50%)] ring-1 ring-border',
            t.leaving
              ? 'animate-out fill-mode-forwards fade-out slide-out-to-bottom-1 duration-150 ease-snap'
              : 'animate-in fade-in slide-in-from-bottom-2 duration-200 ease-snap',
            !t.action && 'pr-3',
          )}
        >
          <HugeiconsIcon icon={toneIcon[t.tone ?? 'info']} size={14} strokeWidth={1.75} className={toneClass[t.tone ?? 'info']} />
          <span className="whitespace-nowrap">{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="h-6 rounded-full px-2 font-medium text-primary transition-colors duration-120 ease-snap hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              onClick={() => {
                t.action!.onClick()
                onDismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
