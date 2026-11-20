import { useId } from 'react'

// 没有真实视频时的画面占位插画：16:9 风景 + 虚构台标 + 账号水印，用来演示 Delogo。
const palettes = {
  dusk: {
    sky: ['#2b3a55', '#a7807a', '#e6c29c'],
    sun: '#f6dcb0',
    far: '#5d6079',
    mid: '#3f4660',
    lake: ['#626a83', '#2a3046'],
    near: '#1d2333',
  },
  harbor: {
    sky: ['#1d3a4b', '#5c8c99', '#cad8d2'],
    sun: '#eef3ea',
    far: '#4a6d77',
    mid: '#33535e',
    lake: ['#4f7983', '#1c3842'],
    near: '#132830',
  },
  forest: {
    sky: ['#273f2f', '#7a9868', '#d8d6a6'],
    sun: '#f3efc9',
    far: '#4e6949',
    mid: '#354c36',
    lake: ['#5a7555', '#213421'],
    near: '#172519',
  },
} as const

export type ScenePalette = keyof typeof palettes

type Props = {
  palette?: ScenePalette
  showLogo?: boolean
  showWatermark?: boolean
  className?: string
}

export function FrameScene({ palette = 'dusk', showLogo = true, showWatermark = true, className }: Props) {
  const id = useId()
  const p = palettes[palette]

  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="0.55" stopColor={p.sky[1]} />
          <stop offset="0.72" stopColor={p.sky[2]} />
        </linearGradient>
        <radialGradient id={`${id}glow`} cx="1040" cy="470" r="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={p.sun} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}lake`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lake[0]} />
          <stop offset="1" stopColor={p.lake[1]} />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id}sky)`} />
      <rect width="1600" height="900" fill={`url(#${id}glow)`} />
      <circle cx="1040" cy="470" r="64" fill={p.sun} />

      <path
        d="M0 520C160 470 300 492 460 448C600 410 720 452 860 420C1000 388 1110 470 1250 452C1390 434 1480 470 1600 456V900H0Z"
        fill={p.far}
        opacity="0.85"
      />
      <path
        d="M0 600C140 556 260 584 400 548C560 508 660 572 820 560C980 548 1080 520 1220 548C1360 576 1480 556 1600 572V900H0Z"
        fill={p.mid}
      />

      <rect y="628" width="1600" height="272" fill={`url(#${id}lake)`} />
      <g fill={p.sun} opacity="0.5">
        <rect x="990" y="646" width="100" height="5" rx="2.5" />
        <rect x="1004" y="668" width="72" height="4" rx="2" opacity="0.8" />
        <rect x="1016" y="690" width="48" height="4" rx="2" opacity="0.6" />
        <rect x="1026" y="712" width="28" height="3" rx="1.5" opacity="0.4" />
      </g>

      <path
        d="M0 790C220 730 420 770 640 748C820 730 960 780 1140 770C1320 760 1460 728 1600 740V900H0Z"
        fill={p.near}
      />
      <g stroke={p.near} strokeWidth="5" strokeLinecap="round">
        <path d="M180 760C176 700 168 660 150 622" />
        <path d="M200 762C204 708 214 676 232 646" />
        <path d="M222 766C222 724 226 700 240 680" />
        <path d="M1380 748C1376 706 1366 676 1348 650" />
        <path d="M1402 748C1408 712 1420 690 1436 672" />
      </g>

      {showLogo && (
        <g transform="translate(1340 58)" opacity="0.92">
          <rect width="160" height="58" rx="12" fill="#ffffff" fillOpacity="0.16" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" />
          <path d="M30 16L42 23V37L30 44L18 37V23Z" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="30" cy="30" r="4" fill="#ffffff" />
          <text x="56" y="38" fill="#ffffff" fontSize="22" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="1">
            NOVA 4K
          </text>
        </g>
      )}

      {showWatermark && (
        <g transform="translate(108 800)" opacity="0.78">
          <circle cx="18" cy="18" r="18" fill="#ffffff" fillOpacity="0.25" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" />
          <text x="48" y="27" fill="#ffffff" fontSize="26" fontWeight="500" fontFamily="system-ui, sans-serif">
            @山野记录
          </text>
        </g>
      )}
    </svg>
  )
}
