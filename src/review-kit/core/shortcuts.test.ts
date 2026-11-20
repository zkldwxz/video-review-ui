import { describe, expect, it } from 'vitest'
import { comboFromEvent, defaultKeymap, findConflict, formatCombo, resolveAction } from './shortcuts'

const ev = (code: string, mods: Partial<Record<'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey', boolean>> = {}) => ({
  code,
  shiftKey: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...mods,
})

describe('shortcuts', () => {
  it('按 code 解析，和输入法无关', () => {
    expect(comboFromEvent(ev('KeyN'), true)).toBe('N')
    expect(comboFromEvent(ev('KeyZ', { shiftKey: true }), true)).toBe('Shift+Z')
    expect(comboFromEvent(ev('KeyZ', { metaKey: true }), true)).toBe('Mod+Z')
    expect(comboFromEvent(ev('KeyZ', { ctrlKey: true }), false)).toBe('Mod+Z')
    expect(comboFromEvent(ev('Digit1'), true)).toBe('1')
    expect(comboFromEvent(ev('ShiftLeft', { shiftKey: true }), true)).toBeNull()
  })

  it('默认键位', () => {
    expect(resolveAction(defaultKeymap, 'N')).toBe('newDelogo')
    expect(resolveAction(defaultKeymap, 'Enter')).toBe('save')
    expect(resolveAction(defaultKeymap, 'Z')).toBe('undo')
    expect(resolveAction(defaultKeymap, 'Shift+Z')).toBe('redo')
    expect(resolveAction(defaultKeymap, 'ArrowRight')).toBe('seekForward')
  })

  it('检测冲突', () => {
    expect(findConflict(defaultKeymap, 'N', 'save')).toBe('newDelogo')
    expect(findConflict(defaultKeymap, 'N', 'newDelogo')).toBeUndefined()
  })

  it('显示格式', () => {
    expect(formatCombo('Mod+Shift+Z', true)).toEqual(['⌘', '⇧', 'Z'])
    expect(formatCombo('Mod+Z', false)).toEqual(['Ctrl', 'Z'])
    expect(formatCombo('ArrowLeft', true)).toEqual(['←'])
  })
})
