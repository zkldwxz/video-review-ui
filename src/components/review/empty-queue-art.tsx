// 队列空状态插画：叠放的画面帧 + 落入托盘的箭头
export function EmptyQueueArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 112" fill="none" className={className} aria-hidden="true">
      <g strokeWidth="1.5" strokeLinejoin="round">
        <rect x="44" y="10" width="84" height="50" rx="7" className="fill-muted stroke-border" />
        <rect x="38" y="16" width="84" height="50" rx="7" className="fill-muted stroke-border" />
        <rect x="32" y="22" width="84" height="50" rx="7" className="fill-card stroke-muted-foreground/45" />
        <path d="M32 60L52 44L66 55L80 46L116 66" className="stroke-muted-foreground/45" strokeLinecap="round" />
        <circle cx="96" cy="36" r="5" className="fill-mark-crop/70" />
        <path d="M41 30H47M41 30V36M107 30H101M107 30V36M41 64H47M41 64V58M107 64H101M107 64V58" className="stroke-mark-crop-fg" strokeLinecap="round" />
      </g>
      <path d="M14 84V96C14 99.3 16.7 102 20 102H144C147.3 102 150 99.3 150 96V84" className="stroke-muted-foreground/45" strokeWidth="1.5" strokeLinecap="round" />
      <g className="stroke-primary" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M138 46V78" />
        <path d="M131 71L138 78L145 71" />
      </g>
    </svg>
  )
}
