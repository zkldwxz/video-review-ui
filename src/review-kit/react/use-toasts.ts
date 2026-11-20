import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastTone = 'info' | 'success' | 'error'
export type ToastOptions = { tone?: ToastTone; action?: { label: string; onClick: () => void }; duration?: number }
/** changesLeft：带操作的提示只对紧接着的那次修改有效，再有新修改就失效 */
export type Toast = ToastOptions & { id: number; message: string; leaving: boolean; changesLeft: number }
export type Notify = (message: string, opts?: ToastOptions) => void

const LIMIT = 3
const LEAVE_MS = 150

/** 轻量提示：最多同时 3 条，默认 2.6 秒后淡出 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const timers = useRef(new Set<number>())

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }, [])

  const dismiss = useCallback(
    (id: number) => {
      setToasts((ts) => ts.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
      later(() => setToasts((ts) => ts.filter((t) => t.id !== id)), LEAVE_MS)
    },
    [later],
  )

  const notify = useCallback<Notify>(
    (message, opts = {}) => {
      const id = ++seq.current
      setToasts((ts) => [...ts.filter((t) => !t.leaving).slice(-(LIMIT - 1)), { ...opts, id, message, leaving: false, changesLeft: opts.action ? 1 : Infinity }])
      later(() => dismiss(id), opts.duration ?? (opts.action ? 4000 : 2600))
    },
    [dismiss, later],
  )

  /** 编辑内容或当前视频变化时调用：提示里的“撤销 / 重做”只对产生它的那一步有效，之后的变化让它失效 */
  const expireActions = useCallback(() => {
    setToasts((ts) => ts.map((t) => (t.action && !t.leaving ? { ...t, changesLeft: t.changesLeft - 1 } : t)))
  }, [])

  useEffect(() => {
    toasts.filter((t) => t.changesLeft < 0 && !t.leaving).forEach((t) => dismiss(t.id))
  }, [toasts, dismiss])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  return { toasts, notify, dismiss, expireActions }
}
