export function createId(prefix = 'r'): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
