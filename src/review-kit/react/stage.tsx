import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRightDoubleIcon, Alert02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FAST_FORWARD_RATE, type Player } from './use-player'

const LONG_PRESS_MS = 350

type Props = {
  player: Player
  /** 变化时重新挂载 video 元素 */
  mediaKey: string
  src: string
  poster?: string
  /** 视频像素尺寸；元数据加载前用宿主传入的值，都没有时按 16:9 */
  width: number
  height: number
  /** 点画面空白处（不是长按）时调用，用来取消选中 */
  onBackgroundTap?: () => void
  children?: ReactNode
  className?: string
}

/**
 * 播放区：视频 + 标记层 + 状态提示。
 * 点空白处播放 / 暂停，长按 2 倍速快进（松开恢复），和抖音一致。
 */
export function Stage({ player, mediaKey, src, poster, width, height, onBackgroundTap, children, className }: Props) {
  const { ref, state } = player
  const press = useRef<{ timer: number; fast: boolean } | null>(null)
  const [boxRef, box] = useContainSize(width / height)

  const endPress = (tap: boolean) => {
    const p = press.current
    if (!p) return
    window.clearTimeout(p.timer)
    press.current = null
    if (p.fast) player.stopFastForward()
    else if (tap) {
      player.togglePlay()
      onBackgroundTap?.()
    }
  }

  return (
    <div ref={boxRef} className={cn('flex size-full min-h-0 min-w-0 items-center justify-center', className)}>
    <div className="relative overflow-hidden rounded-lg bg-black select-none" style={{ width: box.width, height: box.height }}>
      <video key={mediaKey} ref={ref} src={src} poster={poster} preload="auto" playsInline className="absolute inset-0 size-full object-contain" />

      {/* 空白处：点按播放 / 暂停，长按快进 */}
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const timer = window.setTimeout(() => {
            if (!press.current) return
            press.current.fast = true
            player.startFastForward()
          }, LONG_PRESS_MS)
          press.current = { timer, fast: false }
        }}
        onPointerUp={() => endPress(true)}
        onPointerLeave={() => endPress(false)}
        onPointerCancel={() => endPress(false)}
      />

      {children}

      {state.fastForward && (
        <div className="pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white tabular-nums">
          {FAST_FORWARD_RATE}× 快进中
          <HugeiconsIcon icon={ArrowRightDoubleIcon} size={14} strokeWidth={1.75} />
        </div>
      )}

      {state.loading && !state.error && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5" role="progressbar" aria-label="视频加载中">
          <div className="size-full origin-center bg-white/85 animate-loading-line motion-reduce:animate-none motion-reduce:opacity-50" />
        </div>
      )}

      {state.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-6 text-center text-white" role="alert">
          <HugeiconsIcon icon={Alert02Icon} size={24} strokeWidth={1.5} className="text-white/80" />
          <p className="max-w-[40ch] text-[13px]">{state.error}</p>
          <Button size="sm" variant="secondary" onClick={player.retry}>
            重新加载
          </Button>
        </div>
      )}
    </div>
    </div>
  )
}

/** 按比例完整放进容器（object-fit: contain 的效果），返回像素尺寸 */
function useContainSize(aspect: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const width = Math.min(box.w, box.h * aspect)
  return [ref, { width, height: width / aspect }] as const
}
