import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '../core/geometry'

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const
export const FAST_FORWARD_RATE = 2

export type PlayerState = {
  time: number
  duration: number
  width: number
  height: number
  playing: boolean
  rate: number
  /** 元数据未就绪或缓冲中 */
  loading: boolean
  error: string | null
  /** 长按快进中 */
  fastForward: boolean
}

const initial: PlayerState = {
  time: 0,
  duration: 0,
  width: 0,
  height: 0,
  playing: false,
  rate: 1,
  loading: true,
  error: null,
  fastForward: false,
}

const mediaErrorText: Record<number, string> = {
  1: '加载被中止',
  2: '网络错误，视频没有下载完',
  3: '视频解码失败，文件可能损坏或编码不受支持',
  4: '视频地址无法访问，或格式不受浏览器支持',
}

/** mediaKey 变化时重置播放状态（同一文件被多条视频引用时，用视频 id 区分） */
export function usePlayer(mediaKey: string) {
  const ref = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<PlayerState>(initial)
  const rateRef = useRef(1)
  const patch = useCallback((p: Partial<PlayerState>) => setState((s) => ({ ...s, ...p })), [])

  // 换视频时重置，倍速沿用
  useEffect(() => {
    setState({ ...initial, rate: rateRef.current })
  }, [mediaKey])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.playbackRate = rateRef.current
    const onMeta = () => patch({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
    const onReady = () => patch({ loading: false })
    const onWaiting = () => patch({ loading: true })
    const onPlay = () => patch({ playing: true })
    const onPause = () => patch({ playing: false, time: v.currentTime })
    const onSeeked = () => patch({ time: v.currentTime })
    const onError = () => patch({ loading: false, error: mediaErrorText[v.error?.code ?? 4] ?? '视频加载失败' })
    const events: [string, () => void][] = [
      ['loadedmetadata', onMeta],
      ['canplay', onReady],
      ['playing', onReady],
      ['waiting', onWaiting],
      ['play', onPlay],
      ['pause', onPause],
      ['seeked', onSeeked],
      ['timeupdate', onSeeked],
      ['error', onError],
    ]
    events.forEach(([e, fn]) => v.addEventListener(e, fn))
    // 事件可能在监听前就已触发（缓存命中）
    if (v.readyState >= 1) onMeta()
    if (v.readyState >= 3) onReady()
    return () => events.forEach(([e, fn]) => v.removeEventListener(e, fn))
  }, [mediaKey, patch])

  // 播放时逐帧刷新播放头（timeupdate 只有 4Hz，时间轴会一跳一跳）
  useEffect(() => {
    if (!state.playing) return
    let raf = 0
    const tick = () => {
      if (ref.current) setState((s) => (s.time === ref.current!.currentTime ? s : { ...s, time: ref.current!.currentTime }))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state.playing])

  const seek = useCallback((t: number) => {
    const v = ref.current
    if (!v || !Number.isFinite(v.duration)) return
    v.currentTime = clamp(t, 0, v.duration)
    setState((s) => ({ ...s, time: v.currentTime }))
  }, [])

  const togglePlay = useCallback(() => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }, [])

  const setRate = useCallback((rate: number) => {
    rateRef.current = rate
    if (ref.current) ref.current.playbackRate = rate
    setState((s) => ({ ...s, rate }))
  }, [])

  const stepRate = useCallback(
    (dir: 1 | -1) => {
      const i = PLAYBACK_RATES.indexOf(rateRef.current as (typeof PLAYBACK_RATES)[number])
      setRate(PLAYBACK_RATES[clamp((i === -1 ? 2 : i) + dir, 0, PLAYBACK_RATES.length - 1)])
    },
    [setRate],
  )

  /** 长按快进：临时切到 2 倍速并开始播放，松开后恢复原倍速和原播放状态 */
  const ffResume = useRef(false)
  const startFastForward = useCallback(() => {
    const v = ref.current
    if (!v) return
    ffResume.current = v.paused
    v.playbackRate = FAST_FORWARD_RATE
    if (v.paused) void v.play()
    setState((s) => ({ ...s, fastForward: true }))
  }, [])
  const stopFastForward = useCallback(() => {
    const v = ref.current
    if (!v) return
    v.playbackRate = rateRef.current
    if (ffResume.current) v.pause()
    setState((s) => ({ ...s, fastForward: false }))
  }, [])

  const retry = useCallback(() => {
    patch({ error: null, loading: true })
    ref.current?.load()
  }, [patch])

  return { ref, state, seek, togglePlay, setRate, stepRate, startFastForward, stopFastForward, retry }
}

export type Player = ReturnType<typeof usePlayer>
