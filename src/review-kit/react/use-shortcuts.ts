import { useEffect, useRef, type RefObject } from 'react'
import { comboFromEvent, isEditableTarget, resolveAction, type Keymap, type ShortcutAction } from '../core/shortcuts'

const HOLD_MS = 300

/** 允许按住连发的动作；其余动作按住只触发一次 */
const REPEATABLE = new Set<ShortcutAction>(['seekBack', 'frameBack', 'frameForward', 'undo', 'redo'])

/** 焦点在这些控件上时，空格 / 回车 / 方向键交给控件自己处理 */
const NATIVE_WIDGET = 'button, a[href], [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [role=slider], [role=menuitem], [role=option], [role=combobox]'
const NATIVE_KEYS = new Set(['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

export type HoldHandler = { onTap: () => void; onHoldStart: () => void; onHoldEnd: () => void }

type Options = {
  keymap: Keymap
  enabled: boolean
  handlers: Partial<Record<ShortcutAction, () => void>>
  /** 区分单击和长按的动作，例如 → 单击前进 5 秒、长按 2 倍速 */
  holds?: Partial<Record<ShortcutAction, HoldHandler>>
  onEscape?: () => void
  /** 传了就只在用户正在操作这块区域时响应：焦点在里面，或最后一次点击落在里面。嵌入到宿主页面时用，避免抢宿主的按键 */
  scope?: RefObject<HTMLElement | null>
}

export function useShortcuts({ keymap, enabled, handlers, holds = {}, onEscape, scope }: Options) {
  const latest = useRef({ keymap, handlers, holds, onEscape })
  useEffect(() => {
    latest.current = { keymap, handlers, holds, onEscape }
  })

  useEffect(() => {
    if (!enabled) return
    const held = new Map<string, { action: ShortcutAction; timer: number; holding: boolean }>()
    let pointerInside = false
    const onPointerDown = (e: PointerEvent) => {
      pointerInside = !!scope?.current?.contains(e.target as Node)
    }
    const inScope = () => {
      const root = scope?.current
      if (!scope) return true
      if (!root) return false
      const active = document.activeElement
      return active && active !== document.body ? root.contains(active) : pointerInside
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || isEditableTarget(e.target) || !inScope()) return
      if (e.code === 'Escape') {
        latest.current.onEscape?.()
        return
      }
      const combo = comboFromEvent(e)
      if (!combo) return
      if (NATIVE_KEYS.has(combo) && e.target instanceof Element && e.target.closest(NATIVE_WIDGET)) return
      const action = resolveAction(latest.current.keymap, combo)
      if (!action) return
      e.preventDefault()

      const hold = latest.current.holds[action]
      if (hold) {
        if (held.has(e.code)) return
        const entry = { action, holding: false, timer: 0 }
        entry.timer = window.setTimeout(() => {
          entry.holding = true
          latest.current.holds[action]?.onHoldStart()
        }, HOLD_MS)
        held.set(e.code, entry)
        return
      }
      if (e.repeat && !REPEATABLE.has(action)) return
      latest.current.handlers[action]?.()
    }

    const release = (code: string) => {
      const entry = held.get(code)
      if (!entry) return
      held.delete(code)
      window.clearTimeout(entry.timer)
      const hold = latest.current.holds[entry.action]
      if (entry.holding) hold?.onHoldEnd()
      else hold?.onTap()
    }
    const onKeyUp = (e: KeyboardEvent) => release(e.code)
    // 切走窗口时按键松开事件会丢，统一收尾
    const onBlur = () => [...held.keys()].forEach(release)

    window.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      held.forEach((entry) => {
        window.clearTimeout(entry.timer)
        if (entry.holding) latest.current.holds[entry.action]?.onHoldEnd()
      })
    }
  }, [enabled, scope])
}

/** 鼠标点按钮时不抢焦点，避免之后空格 / 方向键被按钮吃掉；键盘 Tab 仍可聚焦 */
export const keepFocus = { onMouseDown: (e: { preventDefault: () => void }) => e.preventDefault() }
