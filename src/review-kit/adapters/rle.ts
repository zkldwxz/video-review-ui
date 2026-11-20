/** COCO RLE（SAM 的 coco_rle 输出格式）。size = [高, 宽]，像素按列优先展开，counts 从 0 的游程开始交替。 */
export type CocoRle = { size: [number, number]; counts: string | number[] }

/** 解码 pycocotools 的压缩 counts 字符串 */
export function decodeCocoCounts(s: string): number[] {
  const counts: number[] = []
  let p = 0
  while (p < s.length) {
    let x = 0
    let k = 0
    let more = true
    while (more) {
      const c = s.charCodeAt(p) - 48
      x |= (c & 0x1f) << (5 * k)
      more = (c & 0x20) !== 0
      p++
      k++
      if (!more && c & 0x10) x |= -1 << (5 * k)
    }
    if (counts.length > 2) x += counts[counts.length - 2]
    counts.push(x)
  }
  return counts
}

/** 掩码的外接框（像素），没有前景时返回 null */
export function rleBBox(rle: CocoRle): { x: number; y: number; w: number; h: number } | null {
  const [h] = rle.size
  const counts = typeof rle.counts === 'string' ? decodeCocoCounts(rle.counts) : rle.counts
  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity
  let p = 0
  counts.forEach((len, i) => {
    if (i % 2 === 1 && len > 0) {
      const startCol = Math.floor(p / h)
      const endCol = Math.floor((p + len - 1) / h)
      minCol = Math.min(minCol, startCol)
      maxCol = Math.max(maxCol, endCol)
      if (startCol === endCol) {
        minRow = Math.min(minRow, p % h)
        maxRow = Math.max(maxRow, (p + len - 1) % h)
      } else {
        minRow = 0
        maxRow = h - 1
      }
    }
    p += len
  })
  if (minCol === Infinity) return null
  return { x: minCol, y: minRow, w: maxCol - minCol + 1, h: maxRow - minRow + 1 }
}

/** 二维二值掩码 mask[row][col] 的外接框（像素） */
export function maskBBox(mask: ArrayLike<ArrayLike<number | boolean>>): { x: number; y: number; w: number; h: number } | null {
  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity
  for (let r = 0; r < mask.length; r++) {
    const row = mask[r]
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      minRow = Math.min(minRow, r)
      maxRow = Math.max(maxRow, r)
      minCol = Math.min(minCol, c)
      maxCol = Math.max(maxCol, c)
    }
  }
  if (minCol === Infinity) return null
  return { x: minCol, y: minRow, w: maxCol - minCol + 1, h: maxRow - minRow + 1 }
}
