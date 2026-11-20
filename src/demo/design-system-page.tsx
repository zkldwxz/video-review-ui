import type { ReactNode } from 'react'
import {
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  ComputerIcon,
  CropIcon,
  Download04Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  NextIcon,
  PlayIcon,
  PreviousIcon,
  ScissorIcon,
  Sun03Icon,
  Upload04Icon,
  ZoomInIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Logomark } from '@/components/brand/logomark'
import * as ReviewIcons from '@/components/icons/review-icons'
import { EmptyQueueArt } from '@/components/review/empty-queue-art'
import { FrameScene } from '@/components/review/frame-scene'
import { useTheme, type Theme } from '@/lib/theme'
import { RegionOverlay, StatusBadge } from '@/review-kit'
import { ReviewerDemo } from './reviewer-demo'

const sections = [
  ['workstation', '工作台'],
  ['color', '颜色'],
  ['type', '字体与密度'],
  ['components', '组件'],
  ['marks', '标记'],
  ['icons', '图标与插画'],
] as const

export function DesignSystemPage() {
  const [theme, setTheme] = useTheme()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
          <div className="flex items-center gap-2.5">
            <Logomark className="size-7" />
            <span className="text-base font-semibold">审片台</span>
            <span className="text-xs text-muted-foreground">设计规范</span>
          </div>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="章节">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 transition-colors duration-120 ease-snap hover:bg-muted hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v as Theme)}
            variant="outline"
            size="sm"
            className="ml-auto"
            aria-label="主题"
          >
            <ToggleGroupItem value="light" aria-label="浅色">
              <HugeiconsIcon icon={Sun03Icon} strokeWidth={1.5} />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="深色">
              <HugeiconsIcon icon={Moon02Icon} strokeWidth={1.5} />
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="跟随系统">
              <HugeiconsIcon icon={ComputerIcon} strokeWidth={1.5} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-14 px-6 py-6 pb-24">
        <section id="workstation" className="scroll-mt-20">
          <ReviewerDemo />
          <p className="mt-3 max-w-[90ch] text-xs text-muted-foreground">
            第一条视频的两个 Delogo 由模型预设：台标来自 YOLO 单帧结果（覆盖整段），账号水印来自 SAM 2 逐帧结果（只在 0:08–0:20 出现）。点画面暂停，长按画面或按住 → 键 2 倍速快进。点右上角键盘图标可以改快捷键。
          </p>
        </section>

        <Section id="color" title="颜色" desc="不用纯黑，不用纯白。面板带一点灰绿，播放区保持无色中性灰。切换右上角的主题可以对比两套颜色。">
          <div className="grid gap-6 lg:grid-cols-3">
            <SwatchGroup
              title="表面与文字"
              items={[
                ['background', '应用底色', 'bg-background'],
                ['card', '面板', 'bg-card'],
                ['popover', '弹层', 'bg-popover'],
                ['muted', '输入框、次级块', 'bg-muted'],
                ['foreground', '正文', 'bg-foreground'],
                ['muted-foreground', '次要文字', 'bg-muted-foreground'],
                ['stage', '播放区，饱和度 0', 'bg-stage'],
              ]}
            />
            <SwatchGroup
              title="品牌与状态"
              items={[
                ['primary', '铜绿，主按钮和选中态', 'bg-primary'],
                ['accent', '列表选中底色', 'bg-accent'],
                ['success', '审核通过', 'bg-success'],
                ['destructive', '驳回、删除', 'bg-destructive'],
              ]}
            />
            <SwatchGroup
              title="标记色"
              items={[
                ['mark-crop', '裁剪，琥珀', 'bg-mark-crop'],
                ['mark-delogo', 'Delogo，鸢尾', 'bg-mark-delogo'],
                ['mark-segment', '保留片段，铜绿亮', 'bg-mark-segment'],
                ['playhead', '播放头，信号红', 'bg-playhead'],
                ['mark-ink', '标记色上的文字', 'bg-mark-ink'],
              ]}
              note="标记色用在面板文字上时改用 -fg 版本（例如 text-mark-crop-fg）。"
            />
          </div>
        </Section>

        <Section id="type" title="字体与密度" desc="IBM Plex Sans，中文回落到苹方或雅黑。时间码和数值统一用等宽数字。控件 28px 高，以 4px 为网格。">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col divide-y rounded-lg border bg-card">
              {[
                ['text-xl font-medium tabular-nums', '20 / 500', '00:01:23:12'],
                ['text-base font-semibold', '16 / 600', '山野记录 第 12 期'],
                ['text-sm font-semibold', '14 / 600', '审核结论'],
                ['text-[13px]', '13 / 400', '拖入视频文件，或粘贴视频地址'],
                ['text-xs', '12 / 500', '同步到 3 个同分辨率视频'],
                ['text-[11px] text-muted-foreground tabular-nums', '11 / 450', '0:10   0:20   0:30   1920×1080'],
              ].map(([cls, spec, sample]) => (
                <div key={spec} className="grid grid-cols-[72px_1fr] items-baseline gap-4 px-4 py-3">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{spec}</span>
                  <span className={cls}>{sample}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-5">
              <Spec title="控件高度">
                <div className="flex items-end gap-2">
                  <Button size="sm">24 小</Button>
                  <Button>28 默认</Button>
                  <Button size="lg">32 大</Button>
                </div>
              </Spec>
              <Spec title="间距">
                <div className="flex items-end gap-3">
                  {[4, 8, 12, 16, 24].map((n) => (
                    <div key={n} className="flex flex-col items-center gap-1.5">
                      <span className="rounded-[2px] bg-primary/70" style={{ width: n, height: n }} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">{n}</span>
                    </div>
                  ))}
                </div>
              </Spec>
              <Spec title="圆角（同心递减）">
                <div className="flex size-24 items-center justify-center rounded-[10px] border bg-card p-1.5">
                  <div className="flex size-full items-center justify-center rounded-lg bg-muted p-1.5">
                    <div className="size-full rounded-md border bg-background" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground tabular-nums">面板 10、内部块 8、控件 6、角标 4</p>
              </Spec>
            </div>
          </div>
        </Section>

        <Section id="components" title="组件" desc="shadcn/ui（Radix 基座，Mira 预设）。按钮图标用 data-icon，不手动设尺寸。">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Demo title="按钮">
              <div className="flex flex-wrap gap-2">
                <Button>保存结论</Button>
                <Button variant="secondary">跳过</Button>
                <Button variant="outline">
                  <HugeiconsIcon icon={Download04Icon} strokeWidth={1.5} data-icon="inline-start" />
                  导出任务
                </Button>
                <Button variant="ghost">取消</Button>
                <Button variant="destructive">删除区域</Button>
                <Button variant="outline" size="icon" aria-label="更多">
                  <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.5} />
                </Button>
              </div>
            </Demo>

            <Demo title="输入">
              <div className="flex flex-col gap-2">
                <Input placeholder="视频地址，例如 https://…/clip.mp4" aria-label="视频地址" />
                <div className="grid grid-cols-2 gap-2">
                  <Input defaultValue="00:00:12:00" className="tabular-nums" aria-label="开始时间" />
                  <Input defaultValue="00:00:30:00" aria-invalid className="tabular-nums" aria-label="结束时间" />
                </div>
                <p className="text-[11px] text-destructive">结束时间超过视频时长 1:42，请改到 1:42 以内。</p>
              </div>
            </Demo>

            <Demo title="选择与开关">
              <div className="flex flex-col gap-3">
                <Select defaultValue="h264">
                  <SelectTrigger className="w-full" aria-label="导出编码">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h264">H.264，兼容性最好</SelectItem>
                    <SelectItem value="h265">H.265，体积更小</SelectItem>
                    <SelectItem value="copy">不重新编码（仅片段剪切）</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <Label htmlFor="demo-snap" className="text-xs font-normal">
                    吸附到关键帧
                  </Label>
                  <Switch id="demo-snap" defaultChecked />
                </div>
                <Slider defaultValue={[40]} max={100} aria-label="音量" />
              </div>
            </Demo>

            <Demo title="分段与标签页">
              <div className="flex flex-col gap-3">
                <Tabs defaultValue="delogo">
                  <TabsList>
                    <TabsTrigger value="crop">裁剪</TabsTrigger>
                    <TabsTrigger value="delogo">Delogo</TabsTrigger>
                    <TabsTrigger value="segments">片段</TabsTrigger>
                  </TabsList>
                </Tabs>
                <ToggleGroup type="single" defaultValue="16:9" variant="outline" size="sm">
                  {['自由', '16:9', '9:16', '1:1'].map((r) => (
                    <ToggleGroupItem key={r} value={r} className="tabular-nums">
                      {r}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </Demo>

            <Demo title="状态与徽标">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status="pending" />
                <StatusBadge status="marked" />
                <StatusBadge status="approved" />
                <StatusBadge status="rejected" />
                <Badge variant="secondary" className="tabular-nums">
                  4K
                </Badge>
              </div>
            </Demo>

            <Demo title="快捷键、提示与菜单">
              <div className="flex flex-wrap items-center gap-3">
                <KbdGroup>
                  <Kbd>I</Kbd>
                  <Kbd>O</Kbd>
                </KbdGroup>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>Enter</Kbd>
                </KbdGroup>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      悬停查看提示
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    在播放头处切开 <Kbd>S</Kbd>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      批量操作
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      同步裁剪到同分辨率视频
                      <DropdownMenuShortcut>⇧C</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      同步 Delogo 到同分辨率视频
                      <DropdownMenuShortcut>⇧D</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">清空所有标记</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Demo>
          </div>
        </Section>

        <Section id="marks" title="标记" desc="双层描边（1px 半透明黑 + 1.5px 标记色），叠在亮画面和暗画面上都看得清。不在当前时间段的 Delogo 显示为虚线。">
          <div className="grid gap-6 md:grid-cols-3">
            {(['dusk', 'harbor', 'forest'] as const).map((palette, i) => (
              <div key={palette} className="rounded-lg bg-stage p-4">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <FrameScene palette={palette} className="absolute inset-0 size-full" />
                  <RegionOverlay
                    width={1920}
                    height={1080}
                    time={i === 2 ? 50 : 20}
                    crop={i === 0 ? { x: 0.08, y: 0.1, w: 0.84, h: 0.8 } : null}
                    delogos={[
                      { id: 'a', x: 0.83, y: 0.055, w: 0.115, h: 0.085, start: 0, end: 40, mode: 'delogo', origin: i === 1 ? { model: 'yolo', score: 0.93 } : undefined },
                      { id: 'b', x: 0.058, y: 0.858, w: 0.132, h: 0.068, start: 12, end: 30, mode: 'delogo' },
                    ]}
                    selection={i === 1 ? { kind: 'delogo', id: 'a' } : null}
                  />
                </div>
                <p className="mt-3 text-[11px] text-white/70">
                  {['裁剪 + 两个生效中的 Delogo', '选中的 Delogo 显示控制点，模型预设的显示来源', '时间段外的 Delogo 显示虚线'][i]}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="icons" title="图标与插画" desc="Hugeicons 描边 1.5。官方没有的领域图标按同一规格自己画，数据格式也和 Hugeicons 相同。">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_280px]">
            <IconGrid
              title="自绘领域图标"
              icons={[
                ['DelogoIcon', '去台标', ReviewIcons.DelogoIcon],
                ['MarkInIcon', '设为入点', ReviewIcons.MarkInIcon],
                ['MarkOutIcon', '设为出点', ReviewIcons.MarkOutIcon],
                ['SplitAtPlayheadIcon', '在播放头处切开', ReviewIcons.SplitAtPlayheadIcon],
                ['ApplyToBatchIcon', '同步到同分辨率', ReviewIcons.ApplyToBatchIcon],
              ]}
              highlight
            />
            <IconGrid
              title="使用的 Hugeicons"
              icons={[
                ['CropIcon', '裁剪', CropIcon],
                ['ScissorIcon', '片段', ScissorIcon],
                ['PlayIcon', '播放', PlayIcon],
                ['PreviousIcon', '上一帧', PreviousIcon],
                ['NextIcon', '下一帧', NextIcon],
                ['Upload04Icon', '导入', Upload04Icon],
                ['Download04Icon', '导出', Download04Icon],
                ['CheckmarkCircle02Icon', '通过', CheckmarkCircle02Icon],
                ['CancelCircleIcon', '驳回', CancelCircleIcon],
                ['ZoomInIcon', '放大', ZoomInIcon],
              ]}
            />
            <div className="flex flex-col gap-3">
              <h3 className="text-xs text-muted-foreground">标志与空状态</h3>
              <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <Logomark className="size-10" />
                <p className="text-xs text-muted-foreground">取景框四角 + 播放头 + 信号灯</p>
              </div>
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-4 py-6 text-center">
                <EmptyQueueArt className="w-36" />
                <p className="text-[13px]">队列里还没有视频</p>
                <p className="text-xs text-muted-foreground">拖入视频文件，或粘贴视频地址</p>
                <Button size="sm">选择文件</Button>
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t pt-8">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 mb-6 max-w-[72ch] text-xs text-muted-foreground">{desc}</p>
      {children}
    </section>
  )
}

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-xs text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function Spec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs text-muted-foreground">{title}</h3>
      {children}
    </div>
  )
}

function SwatchGroup({ title, items, note }: { title: string; items: [string, string, string][]; note?: string }) {
  return (
    <div>
      <h3 className="mb-2 text-xs text-muted-foreground">{title}</h3>
      <div className="flex flex-col divide-y rounded-lg border bg-card">
        {items.map(([token, role, cls]) => (
          <div key={token} className="flex items-center gap-3 px-3 py-2">
            <span className={`size-7 shrink-0 rounded-md shadow-[inset_0_0_0_1px_var(--border)] ${cls}`} />
            <span className="min-w-0">
              <span className="block text-xs font-medium">--{token}</span>
              <span className="block text-[11px] text-muted-foreground">{role}</span>
            </span>
          </div>
        ))}
      </div>
      {note && <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

function IconGrid({ title, icons, highlight }: { title: string; icons: [string, string, IconSvgElement][]; highlight?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-xs text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
        {icons.map(([name, label, icon]) => (
          <div key={name} className="flex flex-col items-center gap-2 rounded-lg border bg-card px-2 pt-4 pb-3" title={name}>
            <HugeiconsIcon icon={icon} size={24} strokeWidth={1.5} className={highlight ? 'text-primary' : undefined} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
