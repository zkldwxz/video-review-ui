import type { ComponentProps } from 'react'

// 取景框四角 + 播放头 + 信号灯：审片台的标志
export function Logomark(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="stroke-primary-foreground" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12V10C8 8.895 8.895 8 10 8H12" />
        <path d="M20 8H22C23.105 8 24 8.895 24 10V12" />
        <path d="M24 20V22C24 23.105 23.105 24 22 24H20" />
        <path d="M12 24H10C8.895 24 8 23.105 8 22V20" />
        <path d="M16 13.5V24" />
      </g>
      <circle cx="16" cy="11" r="2" className="fill-playhead" />
    </svg>
  )
}
