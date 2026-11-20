import type { IconSvgElement } from '@hugeicons/react'

// Hugeicons 里没有的领域图标。规格与 Hugeicons stroke-rounded 一致：24 网格、1.5 描边、圆头圆角。
const line = { stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5' } as const

export const DelogoIcon: IconSvgElement = [
  ['rect', { x: '2.75', y: '4.75', width: '18.5', height: '14.5', rx: '3', ...line, key: '0' }],
  ['rect', { x: '13.25', y: '7.75', width: '5', height: '3.5', rx: '1', ...line, key: '1' }],
  ['path', { d: 'M12.25 12.75L19.5 6.25', ...line, key: '2' }],
  ['path', { d: 'M5.75 16.25L8.75 13.25L11 15.5', ...line, key: '3' }],
]

export const MarkInIcon: IconSvgElement = [
  ['path', { d: 'M9 4.75H6.75V19.25H9', ...line, key: '0' }],
  ['path', { d: 'M10.75 12H18.25', ...line, key: '1' }],
  ['path', { d: 'M15.75 9.25L18.5 12L15.75 14.75', ...line, key: '2' }],
]

export const MarkOutIcon: IconSvgElement = [
  ['path', { d: 'M15 4.75H17.25V19.25H15', ...line, key: '0' }],
  ['path', { d: 'M5.5 12H13', ...line, key: '1' }],
  ['path', { d: 'M10.5 9.25L13.25 12L10.5 14.75', ...line, key: '2' }],
]

export const SplitAtPlayheadIcon: IconSvgElement = [
  ['rect', { x: '2.75', y: '8.75', width: '6.5', height: '6.5', rx: '1.5', ...line, key: '0' }],
  ['rect', { x: '14.75', y: '8.75', width: '6.5', height: '6.5', rx: '1.5', ...line, key: '1' }],
  ['path', { d: 'M12 6.5V20.25', ...line, key: '2' }],
  ['path', { d: 'M10 3.75H14L12 6.25L10 3.75Z', ...line, key: '3' }],
]

export const ApplyToBatchIcon: IconSvgElement = [
  ['rect', { x: '7.75', y: '3.75', width: '12.5', height: '9.5', rx: '2', ...line, key: '0' }],
  ['path', { d: 'M5.25 7.25V14.25C5.25 15.3546 6.14543 16.25 7.25 16.25H16.25', ...line, key: '1' }],
  ['path', { d: 'M2.75 10.25V17.75C2.75 18.8546 3.64543 19.75 4.75 19.75H12.75', ...line, key: '2' }],
  ['path', { d: 'M11.25 8.5L13 10.25L16.75 6.5', ...line, key: '3' }],
]
