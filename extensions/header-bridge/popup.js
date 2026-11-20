import { DEFAULT_INITIATORS, normalizeDomain, parseHeaderLines, PRESETS, requiredOrigins, UA_PRESETS, validateRule } from './rules.js'

const list = document.getElementById('list')
const tpl = document.getElementById('rule-tpl')
const statusEl = document.getElementById('status')

const lines = (text) => text.split(/\r?\n/).map(normalizeDomain).filter(Boolean)

async function getRules() {
  const { rules } = await chrome.storage.local.get('rules')
  return rules ?? PRESETS
}

const setRules = (rules) => chrome.storage.local.set({ rules })

function summary(r) {
  const parts = [r.domains.join('、')]
  if (r.referer) parts.push(`Referer ${new URL(r.referer).host}`)
  if (r.userAgent) parts.push('自定义 UA')
  return parts.join('，')
}

function render(rules, openId) {
  list.replaceChildren(
    ...rules.map((rule, index) => {
      const node = tpl.content.firstElementChild.cloneNode(true)
      const form = node.querySelector('form')
      const expand = node.querySelector('.expand')
      node.querySelector('.name').textContent = rule.name || '未命名规则'
      node.querySelector('.summary').textContent = summary(rule)

      const enabled = node.querySelector('.enabled')
      enabled.checked = rule.enabled
      enabled.setAttribute('aria-label', `启用 ${rule.name}`)
      enabled.addEventListener('change', async () => {
        const next = await getRules()
        next[index] = { ...next[index], enabled: enabled.checked }
        await setRules(next)
      })

      const toggle = (open) => {
        form.hidden = !open
        expand.setAttribute('aria-expanded', String(open))
      }
      expand.addEventListener('click', () => toggle(form.hidden))
      toggle(rule.id === openId)

      form.name.value = rule.name
      form.domains.value = rule.domains.join('\n')
      form.initiators.value = rule.initiators.join('\n')
      form.referer.value = rule.referer
      form.origin.value = rule.origin
      form.userAgent.value = rule.userAgent
      form.headers.value = rule.headers.map((h) => `${h.name}: ${h.value}`).join('\n')
      form.cors.checked = rule.cors
      form.uaPreset.replaceChildren(...UA_PRESETS.map((p) => new Option(p.label, p.value, false, p.value === rule.userAgent)))
      if (rule.userAgent && !UA_PRESETS.some((p) => p.value === rule.userAgent)) form.uaPreset.prepend(new Option('自定义', rule.userAgent, true, true))
      form.uaPreset.addEventListener('change', () => (form.userAgent.value = form.uaPreset.value))

      const error = form.querySelector('.error')
      const showError = (msg) => {
        error.textContent = msg
        error.hidden = !msg
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        let headers
        try {
          headers = parseHeaderLines(form.headers.value)
        } catch (err) {
          showError(err.message)
          return
        }
        const next = {
          ...rule,
          name: form.name.value.trim(),
          domains: lines(form.domains.value),
          initiators: lines(form.initiators.value),
          referer: form.referer.value.trim(),
          origin: form.origin.value.trim(),
          userAgent: form.userAgent.value.trim(),
          headers,
          cors: form.cors.checked,
        }
        const problems = validateRule(next)
        if (problems.length) {
          showError(problems.join('；'))
          return
        }
        // 新域名需要用户授权，必须在点击事件里申请
        const origins = requiredOrigins(next)
        if (!(await chrome.permissions.contains({ origins })) && !(await chrome.permissions.request({ origins }))) {
          showError('没有获得这些域名的访问权限，规则不会生效。')
          return
        }
        showError('')
        const all = await getRules()
        all[index] = next
        await setRules(all)
      })

      node.querySelector('.remove').addEventListener('click', async () => {
        const all = await getRules()
        all.splice(index, 1)
        await setRules(all)
      })
      return node
    }),
  )
}

function renderStatus(status) {
  statusEl.className = status?.ok === false ? 'bad' : status?.ok ? 'ok' : 'muted'
  statusEl.textContent = !status ? '' : status.ok ? `已生效 ${status.active} 条` : `应用失败：${status.error}`
}

let openId
document.getElementById('add').addEventListener('click', async () => {
  const rule = {
    id: crypto.randomUUID(),
    name: '新规则',
    enabled: false,
    domains: [],
    initiators: DEFAULT_INITIATORS,
    referer: '',
    origin: '',
    userAgent: '',
    headers: [],
    cors: false,
  }
  openId = rule.id
  await setRules([...(await getRules()), rule])
})

document.getElementById('reset').addEventListener('click', () => setRules(PRESETS))

chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.rules) render(await getRules(), openId)
  if (changes.status) renderStatus(changes.status.newValue)
})

render(await getRules(), openId)
renderStatus((await chrome.storage.local.get('status')).status)
