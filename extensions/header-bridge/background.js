import { PRESETS, toDnrRules } from './rules.js'

async function loadRules() {
  const { rules } = await chrome.storage.local.get('rules')
  return rules ?? PRESETS
}

/** 用存储里的规则整体替换动态规则；结果写回 storage 供面板显示 */
async function applyNow() {
  const rules = await loadRules()
  const next = toDnrRules(rules)
  const current = await chrome.declarativeNetRequest.getDynamicRules()
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: current.map((r) => r.id), addRules: next })
    await chrome.storage.local.set({ status: { ok: true, active: next.length, at: Date.now() } })
  } catch (e) {
    await chrome.storage.local.set({ status: { ok: false, error: String(e?.message ?? e), at: Date.now() } })
  }
}

// 安装时写入预设会触发 onChanged，和 onInstalled 里的 apply 并发；串行执行，避免重复添加同一 id
let queue = Promise.resolve()
const apply = () => (queue = queue.then(applyNow, applyNow))

chrome.runtime.onInstalled.addListener(async () => {
  const { rules } = await chrome.storage.local.get('rules')
  if (!rules) await chrome.storage.local.set({ rules: PRESETS })
  await apply()
})

chrome.runtime.onStartup.addListener(apply)

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.rules) apply()
})
