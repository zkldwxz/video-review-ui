import { describe, expect, it } from 'vitest'
import { fitAspect, moveRect, resizeRect } from './geometry'

const close = (r: { x: number; y: number; w: number; h: number }) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 1000) / 1000]))

describe('resizeRect', () => {
  const start = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }

  it('拖右下角自由缩放', () => {
    expect(close(resizeRect(start, 'se', 0.1, -0.1, 0.01))).toEqual({ x: 0.2, y: 0.2, w: 0.5, h: 0.3 })
  })

  it('拖左边越过右边时停在最小宽度', () => {
    expect(close(resizeRect(start, 'w', 0.9, 0, 0.05))).toEqual({ x: 0.55, y: 0.2, w: 0.05, h: 0.4 })
  })

  it('不会拖出画面', () => {
    expect(close(resizeRect(start, 'nw', -0.5, -0.5, 0.01))).toEqual({ x: 0, y: 0, w: 0.6, h: 0.6 })
  })

  it('锁定比例时按宽度推高度，锚定对角', () => {
    // aspect 2：高度 = 宽度 / 2
    expect(close(resizeRect(start, 'nw', -0.1, 0, 0.01, 2))).toEqual({ x: 0.1, y: 0.35, w: 0.5, h: 0.25 })
  })

  it('锁定比例时超出画面会整体缩小', () => {
    // 右边被画面截在 1，宽 0.8 → 高 0.8，从 y=0.2 往下正好还有 0.8
    expect(close(resizeRect(start, 'se', 0.5, 0, 0.01, 1))).toEqual({ x: 0.2, y: 0.2, w: 0.8, h: 0.8 })
  })
})

describe('moveRect / fitAspect', () => {
  it('移动时贴边停住', () => {
    expect(close(moveRect({ x: 0.5, y: 0.5, w: 0.4, h: 0.4 }, 0.3, -0.7))).toEqual({ x: 0.6, y: 0, w: 0.4, h: 0.4 })
  })

  it('改比例时保持中心，不超过原框', () => {
    expect(close(fitAspect({ x: 0, y: 0, w: 1, h: 1 }, 2))).toEqual({ x: 0, y: 0.25, w: 1, h: 0.5 })
  })
})
