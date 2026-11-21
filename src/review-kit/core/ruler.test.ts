import { describe, expect, it } from 'vitest'
import { placeRulerLabels } from './ruler'

const labels = [0, 5, 10, 15, 20, 25, 30, 35].map((time) => ({ time, width: 24 }))

describe('placeRulerLabels', () => {
  it('在 36 秒的窄栏上保留末尾两个刻度，且不挤在一起', () => {
    expect(placeRulerLabels(labels, 36, 360).slice(-2)).toEqual([288, 336])
  })

  it('0:00 让出播放头的位置，不被停在开头的播放头压住', () => {
    expect(placeRulerLabels(labels, 36, 360)[0]).toBe(6)
  })

  it('空位不足时只省略刻度文字，不把文字挤出边界', () => {
    expect(placeRulerLabels(labels.slice(0, 5), 20, 120)).toEqual([6, null, 48, 78, null])
    expect(placeRulerLabels([{ time: 0, width: 36 }], 10, 30)).toEqual([null])
  })

  it('按各标签实际宽度放置长时间刻度', () => {
    expect(placeRulerLabels([{ time: 0, width: 24 }, { time: 3600, width: 36 }, { time: 7200, width: 42 }], 7200, 200)).toEqual([6, 82, 158])
  })
})
