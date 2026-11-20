/** 按刻度顺序居中放置标签；靠边时内收，空间不足就省略文字。 */
export function placeRulerLabels(labels: { time: number; width: number }[], duration: number, rulerWidth: number): (number | null)[] {
  let nextLeft = 0
  return labels.map(({ time, width }) => {
    if (width > rulerWidth) return null
    const left = Math.max(0, Math.min((time / duration) * rulerWidth - width / 2, rulerWidth - width))
    if (left < nextLeft) return null
    nextLeft = left + width + 4
    return left
  })
}
