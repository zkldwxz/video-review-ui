/**
 * 快捷键。组合写法：'N'、'Shift+Z'、'Mod+S'（Mod 在 macOS 上是 ⌘，其他系统是 Ctrl）。
 * 按键名取自 KeyboardEvent.code，去掉 Key / Digit 前缀，和输入法、键盘布局无关。
 */
export type ShortcutAction =
  | 'playPause'
  | 'seekBack'
  | 'seekForward'
  | 'frameBack'
  | 'frameForward'
  | 'prevVideo'
  | 'nextVideo'
  | 'speedDown'
  | 'speedUp'
  | 'newDelogo'
  | 'newCrop'
  | 'deleteSelected'
  | 'markIn'
  | 'markOut'
  | 'split'
  | 'undo'
  | 'redo'
  | 'save'
  | 'aiTitle'

export type Keymap = Record<ShortcutAction, string[]>

export const shortcutGroups: { title: string; actions: { action: ShortcutAction; label: string; hint?: string }[] }[] = [
  {
    title: '播放',
    actions: [
      { action: 'playPause', label: '播放 / 暂停' },
      { action: 'seekBack', label: '后退 5 秒' },
      { action: 'seekForward', label: '前进 5 秒', hint: '长按 2 倍速快进，松开恢复' },
      { action: 'frameBack', label: '上一帧' },
      { action: 'frameForward', label: '下一帧' },
      { action: 'speedDown', label: '降低倍速' },
      { action: 'speedUp', label: '提高倍速' },
      { action: 'prevVideo', label: '上一条视频' },
      { action: 'nextVideo', label: '下一条视频' },
    ],
  },
  {
    title: '标记',
    actions: [
      { action: 'newDelogo', label: '新建 Delogo 区域' },
      { action: 'newCrop', label: '新建 / 选中裁剪框' },
      { action: 'deleteSelected', label: '删除选中的区域' },
      { action: 'markIn', label: '把选中项的开始设为当前时间' },
      { action: 'markOut', label: '把选中项的结束设为当前时间' },
      { action: 'split', label: '在播放头处切开片段' },
    ],
  },
  {
    title: '编辑',
    actions: [
      { action: 'undo', label: '撤销' },
      { action: 'redo', label: '重做' },
      { action: 'save', label: '保存' },
      { action: 'aiTitle', label: 'AI 改写标题', hint: '聚焦提示词输入框，回车生成' },
    ],
  },
]

export const defaultKeymap: Keymap = {
  playPause: ['Space'],
  seekBack: ['ArrowLeft'],
  seekForward: ['ArrowRight'],
  frameBack: ['Comma'],
  frameForward: ['Period'],
  prevVideo: ['ArrowUp'],
  nextVideo: ['ArrowDown'],
  speedDown: ['BracketLeft'],
  speedUp: ['BracketRight'],
  newDelogo: ['N'],
  newCrop: ['C'],
  deleteSelected: ['Delete', 'Backspace'],
  markIn: ['I'],
  markOut: ['O'],
  split: ['S'],
  undo: ['Z', 'Mod+Z'],
  redo: ['Shift+Z', 'Mod+Shift+Z'],
  save: ['Enter'],
  aiTitle: ['T'],
}

const MODIFIER_CODES = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'])

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

type KeyLike = Pick<KeyboardEvent, 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>

/** 键盘事件 → 组合字符串。只按了修饰键时返回 null。 */
export function comboFromEvent(e: KeyLike, mac = isMac()): string | null {
  if (MODIFIER_CODES.has(e.code)) return null
  const key = e.code.replace(/^Key/, '').replace(/^Digit/, '')
  const mod = mac ? e.metaKey : e.ctrlKey
  const parts = [mod && 'Mod', (mac ? e.ctrlKey : e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key]
  return parts.filter(Boolean).join('+')
}

export function resolveAction(keymap: Keymap, combo: string): ShortcutAction | undefined {
  return (Object.keys(keymap) as ShortcutAction[]).find((a) => keymap[a].includes(combo))
}

/** 新绑定和已有绑定冲突时，返回占用它的动作 */
export function findConflict(keymap: Keymap, combo: string, except: ShortcutAction): ShortcutAction | undefined {
  return (Object.keys(keymap) as ShortcutAction[]).find((a) => a !== except && keymap[a].includes(combo))
}

const KEY_LABELS: Record<string, string> = {
  Space: '空格',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Comma: ',',
  Period: '.',
  BracketLeft: '[',
  BracketRight: ']',
  Enter: 'Enter',
  Backspace: '⌫',
  Delete: 'Del',
  Escape: 'Esc',
  Slash: '/',
  Minus: '-',
  Equal: '=',
}

/** 组合字符串 → 显示用的按键列表，例如 'Mod+Shift+Z' → ['⌘', '⇧', 'Z'] */
export function formatCombo(combo: string, mac = isMac()): string[] {
  return combo.split('+').map((p) => {
    if (p === 'Mod') return mac ? '⌘' : 'Ctrl'
    if (p === 'Shift') return '⇧'
    if (p === 'Alt') return mac ? '⌥' : 'Alt'
    if (p === 'Ctrl') return mac ? '⌃' : 'Win'
    return KEY_LABELS[p] ?? p
  })
}

/** 焦点在输入框里时不触发快捷键 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
