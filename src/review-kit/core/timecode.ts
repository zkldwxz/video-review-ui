const pad = (n: number) => String(n).padStart(2, '0')

/** 秒 → HH:MM:SS:FF（帧号从 0 开始） */
export function formatTimecode(seconds: number, fps: number): string {
  const totalFrames = Math.floor(seconds * fps + 1e-6)
  const frames = totalFrames % fps
  const totalSeconds = Math.floor(totalFrames / fps)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`
}

/** 秒 → M:SS（列表、刻度用的短格式） */
export function formatShort(seconds: number): string {
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}

/** 12345 → 1.2万，123456789 → 1.2亿 */
export function formatCount(n: number): string {
  if (n >= 1e8) return `${trim(n / 1e8)}亿`
  if (n >= 1e4) return `${trim(n / 1e4)}万`
  return String(n)
}

const trim = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, ''))

/**
 * 输入框里的时间 → 秒。支持 "83.5"、"1:23"、"1:23.5"、"00:01:23"、"00:01:23:12"（最后一段是帧）。
 * 格式不对返回 null。
 */
export function parseTimecode(input: string, fps: number): number | null {
  const s = input.trim()
  if (!/^\d+(\.\d+)?$|^\d+(:\d{1,2}){1,3}(\.\d+)?$/.test(s)) return null
  const parts = s.split(':')
  if (parts.length === 4) {
    const [h, m, sec, f] = parts.map(Number)
    if (f >= fps) return null
    return h * 3600 + m * 60 + sec + f / fps
  }
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0)
}
