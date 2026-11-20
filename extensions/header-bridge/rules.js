// 规则 → chrome.declarativeNetRequest 动态规则。纯函数，不依赖 chrome API，可单测。

/** 规则只对这些类型的请求生效：视频、fetch/XHR、图片（封面）、其他 */
export const RESOURCE_TYPES = ['media', 'xmlhttprequest', 'image', 'other']

export const UA_PRESETS = [
  { label: '浏览器自带', value: '' },
  { label: 'Chrome 桌面', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' },
  { label: 'iPhone Safari', value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' },
  { label: '安卓 Chrome', value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36' },
]

/** 默认的“生效页面”：只有从这些页面发出的请求才会被改写，不影响平时浏览 */
export const DEFAULT_INITIATORS = ['localhost', '127.0.0.1']

export const PRESETS = [
  {
    id: 'bilibili',
    name: 'B 站',
    enabled: true,
    domains: ['bilibili.com', 'bilivideo.com', 'bilivideo.cn', 'hdslb.com'],
    initiators: DEFAULT_INITIATORS,
    referer: 'https://www.bilibili.com/',
    origin: 'https://www.bilibili.com',
    userAgent: '',
    headers: [],
    cors: true,
  },
]

const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

/** "https://*.a.com:8080/x" → "a.com"；空行忽略 */
export function normalizeDomain(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\*\./, '')
}

/** "Name: value" 每行一个 → [{ name, value }] */
export function parseHeaderLines(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const idx = line.indexOf(':')
      const name = idx === -1 ? '' : line.slice(0, idx).trim()
      if (!HEADER_NAME.test(name)) throw new Error(`第 ${i + 1} 行请求头格式不对，应为 "Name: value"：${line}`)
      return { name, value: line.slice(idx + 1).trim() }
    })
}

/** 返回问题列表；为空表示可以保存 */
export function validateRule(rule) {
  const problems = []
  if (!rule.name.trim()) problems.push('请填写名称')
  if (rule.domains.length === 0) problems.push('至少填一个目标域名')
  if (rule.initiators.length === 0) problems.push('至少填一个生效页面，否则会改写所有网页的请求')
  const bad = [...rule.domains, ...rule.initiators].filter((d) => !/^[a-z0-9.-]+$/.test(d))
  if (bad.length) problems.push(`域名格式不对：${bad.join('、')}`)
  if (rule.referer && !/^https?:\/\/[^/\s]+(\/\S*)?$/.test(rule.referer)) problems.push('Referer 需要是完整网址，例如 https://www.example.com/')
  if (rule.origin && !/^https?:\/\/[^/\s]+$/.test(rule.origin)) problems.push('Origin 只写协议和域名，例如 https://www.example.com')
  if (!rule.referer && !rule.origin && !rule.userAgent && rule.headers.length === 0 && !rule.cors) problems.push('没有任何要改写的内容')
  return problems
}

export function toDnrRules(rules) {
  const out = []
  rules.forEach((r, i) => {
    if (!r.enabled || validateRule(r).length) return
    const requestHeaders = []
    if (r.referer) requestHeaders.push({ header: 'referer', operation: 'set', value: r.referer })
    if (r.origin) requestHeaders.push({ header: 'origin', operation: 'set', value: r.origin })
    if (r.userAgent) requestHeaders.push({ header: 'user-agent', operation: 'set', value: r.userAgent })
    for (const h of r.headers) requestHeaders.push({ header: h.name.toLowerCase(), operation: 'set', value: h.value })
    // 改了 Origin 之后服务端回的 CORS 头对不上页面，这里统一放行（不带 Cookie 的请求）
    const responseHeaders = r.cors ? [{ header: 'access-control-allow-origin', operation: 'set', value: '*' }] : []
    out.push({
      id: i + 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        ...(requestHeaders.length && { requestHeaders }),
        ...(responseHeaders.length && { responseHeaders }),
      },
      condition: { requestDomains: r.domains, initiatorDomains: r.initiators, resourceTypes: RESOURCE_TYPES },
    })
  })
  return out
}

/** 规则需要的主机权限：目标域名（含子域名）和生效页面 */
export function requiredOrigins(rule) {
  return [...new Set([...rule.domains, ...rule.initiators].flatMap((d) => [`*://${d}/*`, `*://*.${d}/*`]))]
}
