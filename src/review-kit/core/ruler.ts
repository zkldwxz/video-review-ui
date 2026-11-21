const GAP = 4
/** 播放头顶端的标记宽 11px、居中在 0 处，停在开头时会压住 0:00，第一个标签至少让出这么多 */
const START_INSET = 6

/** 按刻度顺序居中放置标签；靠边时内收，空间不足就省略文字（刻度线保留）。 */
export function placeRulerLabels(labels: { time: number; width: number }[], duration: number, rulerWidth: number): (number | null)[] {
  let nextLeft = START_INSET
  return labels.map(({ time, width }) => {
    if (width > rulerWidth - START_INSET) return null
    const left = Math.max(START_INSET, Math.min((time / duration) * rulerWidth - width / 2, rulerWidth - width))
    if (left < nextLeft) return null
    nextLeft = left + width + GAP
    return left
  })
}
