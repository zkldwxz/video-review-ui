import { describe, expect, it } from 'vitest'
import { normalizeDomain, parseHeaderLines, PRESETS, requiredOrigins, toDnrRules, validateRule } from './rules.js'

const base = { id: 'x', name: '测试', enabled: true, domains: ['a.com'], initiators: ['localhost'], referer: '', origin: '', userAgent: '', headers: [], cors: false }

describe('header-bridge rules', () => {
  it('B 站预设：改 Referer / Origin，放行跨域，只对 localhost 发起的请求生效', () => {
    const [r] = toDnrRules(PRESETS)
    expect(r.action.requestHeaders).toEqual([
      { header: 'referer', operation: 'set', value: 'https://www.bilibili.com/' },
      { header: 'origin', operation: 'set', value: 'https://www.bilibili.com' },
    ])
    expect(r.action.responseHeaders).toEqual([{ header: 'access-control-allow-origin', operation: 'set', value: '*' }])
    expect(r.condition.initiatorDomains).toEqual(['localhost', '127.0.0.1'])
    expect(r.condition.requestDomains).toContain('bilivideo.com')
  })

  it('不生成空的 header 数组（DNR 会拒绝）', () => {
    const [r] = toDnrRules([{ ...base, userAgent: 'UA' }])
    expect(r.action).toEqual({ type: 'modifyHeaders', requestHeaders: [{ header: 'user-agent', operation: 'set', value: 'UA' }] })
  })

  it('停用或不合法的规则跳过，id 按位置保持稳定', () => {
    const rules = toDnrRules([{ ...base, enabled: false, referer: 'https://a.com/' }, { ...base, initiators: [], referer: 'https://a.com/' }, { ...base, referer: 'https://a.com/' }])
    expect(rules.map((r) => r.id)).toEqual([3])
  })

  it('校验：没填生效页面会被拦下', () => {
    expect(validateRule({ ...base, initiators: [], referer: 'https://a.com/' })).toContain('至少填一个生效页面，否则会改写所有网页的请求')
    expect(validateRule({ ...base })).toContain('没有任何要改写的内容')
    expect(validateRule({ ...base, origin: 'https://a.com/' })).toContain('Origin 只写协议和域名，例如 https://www.example.com')
    expect(validateRule({ ...base, referer: 'a.com' })).toContain('Referer 需要是完整网址，例如 https://www.example.com/')
  })

  it('域名和请求头解析', () => {
    expect(normalizeDomain(' https://*.Bilivideo.com:443/path?x ')).toBe('bilivideo.com')
    expect(parseHeaderLines('X-Token: abc\n\nX-A:b:c')).toEqual([
      { name: 'X-Token', value: 'abc' },
      { name: 'X-A', value: 'b:c' },
    ])
    expect(() => parseHeaderLines('bad line')).toThrow('第 1 行')
  })

  it('主机权限覆盖子域名', () => {
    expect(requiredOrigins({ ...base })).toEqual(['*://a.com/*', '*://*.a.com/*', '*://localhost/*', '*://*.localhost/*'])
  })
})
