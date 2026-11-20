import { useEffect, useState } from 'react'
import { Add01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import { comboFromEvent, defaultKeymap, findConflict, formatCombo, shortcutGroups, type Keymap, type ShortcutAction } from '../core/shortcuts'

const actionLabel = (a: ShortcutAction) => shortcutGroups.flatMap((g) => g.actions).find((x) => x.action === a)?.label ?? a

export function ComboKbd({ combo }: { combo: string }) {
  return (
    <KbdGroup>
      {formatCombo(combo).map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </KbdGroup>
  )
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  keymap: Keymap
  onChange: (k: Keymap) => void
  /** 关掉的功能不在列表里显示 */
  isEnabled?: (a: ShortcutAction) => boolean
}

export function ShortcutSettings({ open, onOpenChange, keymap, onChange, isEnabled = () => true }: Props) {
  const groups = shortcutGroups.map((g) => ({ ...g, actions: g.actions.filter((a) => isEnabled(a.action)) })).filter((g) => g.actions.length > 0)
  const [recording, setRecording] = useState<ShortcutAction | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 录制时在捕获阶段拦截按键，不让对话框和其他快捷键收到
  useEffect(() => {
    if (!recording) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        setRecording(null)
        return
      }
      const combo = comboFromEvent(e)
      if (!combo) return
      const next: Keymap = { ...keymap }
      const conflict = findConflict(keymap, combo, recording)
      if (conflict) {
        next[conflict] = next[conflict].filter((c) => c !== combo)
        setNotice(`${formatCombo(combo).join(' ')} 原来是「${actionLabel(conflict)}」的快捷键，已改给「${actionLabel(recording)}」。`)
      } else {
        setNotice(null)
      }
      if (!next[recording].includes(combo)) next[recording] = [...next[recording], combo]
      onChange(next)
      setRecording(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [recording, keymap, onChange])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setRecording(null)
        setNotice(null)
        onOpenChange(v)
      }}
    >
      <DialogContent className="flex max-h-[min(720px,90dvh)] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>快捷键</DialogTitle>
          <DialogDescription>点“添加”后按下新的组合键；按 Esc 取消。同一个键只能给一个动作。</DialogDescription>
        </DialogHeader>

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <section key={g.title}>
                <h3 className="mb-1 text-xs text-muted-foreground">{g.title}</h3>
                <div className="flex flex-col divide-y">
                  {g.actions.map(({ action, label, hint }) => (
                    <div key={action} className="flex min-h-10 items-center gap-3 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-body">{label}</div>
                        {hint && <div className="text-caption text-muted-foreground">{hint}</div>}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {keymap[action].map((combo) => (
                          <span key={combo} className="group/combo flex items-center gap-0.5">
                            <ComboKbd combo={combo} />
                            <button
                              type="button"
                              className="flex size-4 items-center justify-center rounded-sm text-muted-foreground opacity-50 hover:bg-muted hover:opacity-100 focus-visible:opacity-100"
                              aria-label={`移除 ${formatCombo(combo).join(' ')}`}
                              onClick={() => onChange({ ...keymap, [action]: keymap[action].filter((c) => c !== combo) })}
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
                            </button>
                          </span>
                        ))}
                        <Button
                          variant={recording === action ? 'secondary' : 'ghost'}
                          size="xs"
                          className={cn(recording === action && 'ring-2 ring-ring/40')}
                          onClick={() => setRecording(recording === action ? null : action)}
                        >
                          {recording === action ? (
                            '请按键…'
                          ) : (
                            <>
                              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
                              添加
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {notice && <p className="rounded-md bg-muted px-3 py-2 text-xs">{notice}</p>}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onChange(defaultKeymap)
              setNotice('已恢复默认快捷键。')
            }}
          >
            恢复默认
          </Button>
          <Button onClick={() => onOpenChange(false)}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
