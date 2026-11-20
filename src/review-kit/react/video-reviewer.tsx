import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react'
import { flushSync } from 'react-dom'
import {
  AiMagicIcon,
  AiScanIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  CropIcon,
  InformationCircleIcon,
  KeyboardIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  Redo02Icon,
  Undo02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DelogoIcon, MarkInIcon, MarkOutIcon, SplitAtPlayheadIcon } from '@/components/icons/review-icons'
import { cn } from '@/lib/utils'
import { createId } from '../core/id'
import { defaultKeymap, type Keymap } from '../core/shortcuts'
import { buildTask, type ReviewTask } from '../core/task'
import { DEFAULT_TITLE_PROMPT, type TitleGenerator } from '../core/title-prompt'
import { describeChange } from '../core/describe'
import { formatShort, formatTimecode } from '../core/timecode'
import type { DelogoRegion, MediaInfo, ReviewEdits, ReviewVideo, TimeRange } from '../core/types'
import { ReviewerContext, type ReviewerContextValue } from './context'
import { InlineTitle } from './fields'
import { ImportDialog } from './import-dialog'
import { InfoPanel } from './info-panel'
import { CropPanel, DelogoPanel, SegmentsPanel } from './panels'
import { filterQueue, type QueueFilter } from '../core/queue'
import { QueuePanel } from './queue-panel'
import { RegionOverlay } from './region-overlay'
import { ComboKbd, ShortcutSettings } from './shortcut-settings'
import { Stage } from './stage'
import { Timeline } from './timeline'
import { PLAYBACK_RATES, usePlayer } from './use-player'
import { useReviewerState, type Selection } from './use-reviewer-state'
import { ToastViewport } from './toast'
import { useToasts } from './use-toasts'
import { keepFocus, useShortcuts } from './use-shortcuts'

export type VideoReviewerHandle = {
  /** 把模型预设的区域加到某条视频（作为一步，可撤销） */
  importRegions: (videoId: string, regions: DelogoRegion[]) => void
  getEdits: (videoId: string) => ReviewEdits | undefined
  selectVideo: (videoId: string) => void
}

export type VideoReviewerProps = {
  videos: ReviewVideo[]
  initialVideoId?: string
  /** 标签候选 */
  tagOptions?: string[]
  /** 初始快捷键，不传用默认键位 */
  keymap?: Keymap
  onKeymapChange?: (keymap: Keymap) => void
  /** 任意编辑（含撤销）后调用 */
  onChange?: (videoId: string, edits: ReviewEdits) => void
  /** 按保存（默认 Enter）时调用；返回 Promise 时等待完成，抛错会显示在保存按钮旁 */
  onSave?: (task: ReviewTask) => void | Promise<void>
  onActiveVideoChange?: (videoId: string) => void
  /** AI 改写标题：传了才显示。收到提示词和视频信息，返回候选标题（API Key 放在宿主后端） */
  generateTitles?: TitleGenerator
  /** 提示词模板，可用 {category} {title} {author} {platform} {project} {tags}；引用的变量缺失时输入框留空。默认“生成一个{category}的视频标题” */
  titlePromptTemplate?: string
  ref?: Ref<VideoReviewerHandle>
  className?: string
}

export function VideoReviewer(props: VideoReviewerProps) {
  if (props.videos.length === 0) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl border bg-card p-10 text-sm text-muted-foreground', props.className)}>
        队列里还没有视频
      </div>
    )
  }
  return <ReviewerBody {...props} />
}

type Tab = 'info' | 'crop' | 'delogo' | 'segments'
const TAB_OF: Record<NonNullable<Selection>['kind'], Tab> = { crop: 'crop', delogo: 'delogo', segment: 'segments' }
const MIN_RANGE = 0.1
const SEEK_STEP = 5

/** 插入或替换后，新片段在排好序的数组里的位置 */
function indexAfter(segments: TimeRange[], seg: TimeRange, replace?: number) {
  const next = replace === undefined ? [...segments, seg] : segments.map((s, i) => (i === replace ? seg : s))
  return next.sort((a, b) => a.start - b.start).indexOf(seg)
}

function ReviewerBody({
  videos,
  initialVideoId,
  tagOptions = [],
  keymap: initialKeymap,
  onKeymapChange,
  onChange,
  onSave,
  onActiveVideoChange,
  generateTitles,
  titlePromptTemplate = DEFAULT_TITLE_PROMPT,
  ref,
  className,
}: VideoReviewerProps) {
  const st = useReviewerState(videos, { initialVideoId, onChange })
  const video = videos.find((v) => v.id === st.activeId) ?? videos[0]
  const edits = st.editsOf(video.id) ?? video.edits
  const player = usePlayer(video.id)
  const ps = player.state

  const media: MediaInfo = {
    width: ps.width || video.width || 1920,
    height: ps.height || video.height || 1080,
    duration: ps.duration || video.duration || 0,
    fps: video.fps ?? 25,
  }

  const [keymap, setKeymapState] = useState<Keymap>(initialKeymap ?? defaultKeymap)
  const setKeymap = (k: Keymap) => {
    setKeymapState(k)
    onKeymapChange?.(k)
  }
  const [tab, setTab] = useState<Tab>('info')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [cropAspect, setCropAspect] = useState<number | null>(null)
  const [showThirds, setShowThirds] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [keysOpen, setKeysOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { toasts, notify, dismiss, expireActions } = useToasts()
  useEffect(() => expireActions(), [edits, video.id, expireActions])
  const aiTitleInput = useRef<HTMLInputElement>(null)

  /** 切到信息页并聚焦 AI 标题输入框：先同步渲染出页签内容，再聚焦 */
  const focusAiTitle = () => {
    flushSync(() => setTab('info'))
    aiTitleInput.current?.focus()
  }

  // 撤销后选中的区域可能已不存在
  const selection: Selection = (() => {
    const s = st.selection
    if (s?.kind === 'delogo' && !edits.delogos.some((d) => d.id === s.id)) return null
    if (s?.kind === 'segment' && s.index >= edits.segments.length) return null
    if (s?.kind === 'crop' && !edits.crop) return null
    return s
  })()

  const select = (s: Selection) => {
    st.setSelection(s)
    if (s) setTab(TAB_OF[s.kind])
  }

  const queue = useMemo(() => filterQueue(videos, st.editsOf, query, filter), [videos, st.editsOf, query, filter])
  const doneCount = videos.filter((v) => ['approved', 'rejected'].includes((st.editsOf(v.id) ?? v.edits).status)).length
  const sameResolution = videos.filter((v) => v.id !== video.id && v.width === media.width && v.height === media.height)

  const selectVideo = (id: string) => {
    if (id === video.id) return
    st.setActiveId(id)
    setSaveError(null)
    onActiveVideoChange?.(id)
  }

  useImperativeHandle(ref, () => ({
    importRegions: (videoId, regions) => st.dispatch({ type: 'addDelogos', regions }, undefined, videoId),
    getEdits: (videoId) => st.editsOf(videoId),
    selectVideo,
  }))

  const now = () => player.ref.current?.currentTime ?? ps.time
  const dispatch = st.dispatch

  const newDelogo = () => {
    const region: DelogoRegion = { id: createId('d'), x: 0.4, y: 0.44, w: 0.2, h: 0.12, start: 0, end: media.duration, mode: 'delogo' }
    dispatch({ type: 'addDelogo', region })
    select({ kind: 'delogo', id: region.id })
  }

  const newCrop = () => {
    if (!edits.crop) dispatch({ type: 'setCrop', crop: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 } })
    select({ kind: 'crop' })
  }

  const mark = (edge: 'start' | 'end') => {
    const t = now()
    if (selection?.kind === 'delogo') {
      const d = edits.delogos.find((x) => x.id === selection.id)!
      const patch = edge === 'start' ? { start: Math.min(t, d.end - MIN_RANGE) } : { end: Math.max(t, d.start + MIN_RANGE) }
      dispatch({ type: 'updateDelogo', id: d.id, patch })
      return
    }
    if (selection?.kind === 'segment') {
      const s = edits.segments[selection.index]
      const seg = edge === 'start' ? { start: Math.min(t, s.end - MIN_RANGE), end: s.end } : { start: s.start, end: Math.max(t, s.start + MIN_RANGE) }
      dispatch({ type: 'updateSegment', index: selection.index, segment: seg })
      select({ kind: 'segment', index: indexAfter(edits.segments, seg, selection.index) })
      return
    }
    // 没选中时新建片段：入点到结尾，或开头到出点
    const seg = edge === 'start' ? { start: t, end: media.duration } : { start: 0, end: t }
    if (seg.end - seg.start < MIN_RANGE) return
    dispatch({ type: 'addSegment', segment: seg })
    select({ kind: 'segment', index: indexAfter(edits.segments, seg) })
  }

  const split = () => {
    const t = now()
    const key = createId('split')
    if (edits.segments.length > 0 && !edits.segments.some((s) => t > s.start && t < s.end)) {
      return notify('播放头不在任何片段里，没有切开', { tone: 'error' })
    }
    if (edits.segments.length === 0) dispatch({ type: 'addSegment', segment: { start: 0, end: media.duration } }, key)
    dispatch({ type: 'splitSegment', time: t }, key)
    notify(`已在 ${formatShort(t)} 切开`, { action: { label: '撤销', onClick: st.undo } })
  }

  // 撤销提示描述“被撤销的那一步做了什么”：从上一步到当前
  const undo = () => {
    const p = st.undoPreview
    if (!p) return notify('没有可撤销的操作')
    st.undo()
    notify(`已撤销：${describeChange(p.to, p.from)}`, { action: { label: '重做', onClick: st.redo } })
  }

  const redo = () => {
    const p = st.redoPreview
    if (!p) return notify('没有可重做的操作')
    st.redo()
    notify(`已重做：${describeChange(p.from, p.to)}`)
  }

  const deleteSelected = () => {
    if (!selection) return notify('先选中要删除的区域')
    const message =
      selection.kind === 'delogo'
        ? `已删除 Delogo ${edits.delogos.findIndex((d) => d.id === selection.id) + 1}`
        : selection.kind === 'crop'
          ? '已删除裁剪框'
          : `已删除片段 ${selection.index + 1}`
    if (selection.kind === 'delogo') dispatch({ type: 'removeDelogo', id: selection.id })
    if (selection.kind === 'crop') dispatch({ type: 'setCrop', crop: null })
    if (selection.kind === 'segment') dispatch({ type: 'removeSegment', index: selection.index })
    st.setSelection(null)
    notify(message, { action: { label: '撤销', onClick: st.undo } })
  }

  const save = async () => {
    if (saving) return
    if (edits.status === 'rejected' && !edits.note.trim()) {
      setSaveError('驳回需要填写备注')
      notify('驳回需要填写备注', { tone: 'error' })
      return
    }
    let current = edits
    const hasMarks = !!current.crop || current.delogos.length > 0 || current.segments.length > 0
    if (current.status === 'pending' && hasMarks) {
      dispatch({ type: 'setDecision', status: 'marked' })
      current = { ...current, status: 'marked' }
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave?.(buildTask(video, current, media))
      st.markSaved(video.id)
      notify(`已保存「${current.title}」`, { tone: 'success' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setSaveError(msg)
      notify(`保存失败：${msg}`, { tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const stepVideo = (dir: 1 | -1) => {
    const i = queue.findIndex((v) => v.id === video.id)
    const next = queue[i === -1 ? 0 : i + dir]
    if (next) selectVideo(next.id)
  }

  const frame = (dir: 1 | -1) => {
    player.ref.current?.pause()
    player.seek(now() + dir / media.fps)
  }

  useShortcuts({
    keymap,
    enabled: !importOpen && !keysOpen,
    onEscape: () => st.setSelection(null),
    handlers: {
      playPause: player.togglePlay,
      seekBack: () => player.seek(now() - SEEK_STEP),
      frameBack: () => frame(-1),
      frameForward: () => frame(1),
      prevVideo: () => stepVideo(-1),
      nextVideo: () => stepVideo(1),
      speedDown: () => player.stepRate(-1),
      speedUp: () => player.stepRate(1),
      newDelogo,
      newCrop,
      deleteSelected,
      markIn: () => mark('start'),
      markOut: () => mark('end'),
      split,
      undo,
      redo,
      save: () => void save(),
      ...(generateTitles && { aiTitle: focusAiTitle }),
    },
    holds: {
      seekForward: { onTap: () => player.seek(now() + SEEK_STEP), onHoldStart: player.startFastForward, onHoldEnd: player.stopFastForward },
    },
  })

  const ctx: ReviewerContextValue = {
    video,
    edits,
    media,
    player,
    selection,
    setSelection: select,
    dispatch,
    tagOptions,
    sameResolution,
    cropAspect,
    setCropAspect,
    showThirds,
    setShowThirds,
    newDelogo,
    newCrop,
    openImport: () => setImportOpen(true),
    notify,
    undo: st.undo,
    keymap,
    generateTitles,
    titlePromptTemplate,
    aiTitleInput,
  }

  const savedAt = st.savedAt[video.id]
  const src = video.source

  return (
    <ReviewerContext value={ctx}>
      <div className={cn('grid min-h-0 grid-cols-[280px_minmax(0,1fr)_340px] overflow-hidden rounded-xl border bg-card', className)}>
        <QueuePanel
          videos={queue}
          total={videos.length}
          doneCount={doneCount}
          editsOf={st.editsOf}
          activeId={video.id}
          onSelect={selectVideo}
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
        />

        <section className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
            <div className="flex min-w-0 flex-col">
              <InlineTitle value={edits.title} onCommit={(title) => dispatch({ type: 'rename', title })} />
              <div className="flex min-w-0 gap-3 truncate text-[11px] text-muted-foreground">
                {src?.platform && <span>{src.platform}</span>}
                {src?.author && <span>{src.author}</span>}
                {src?.externalId && <span className="tabular-nums">ID {src.externalId}</span>}
                {src?.project && <span>{src.project}</span>}
                {src?.category && <span>{src.category}</span>}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {generateTitles && <IconAction icon={AiMagicIcon} label="AI 改写标题" combo={keymap.aiTitle[0]} onClick={focusAiTitle} />}
              <IconAction icon={Undo02Icon} label="撤销" combo={keymap.undo[0]} onClick={undo} disabled={!st.canUndo} />
              <IconAction icon={Redo02Icon} label="重做" combo={keymap.redo[0]} onClick={redo} disabled={!st.canRedo} />
              <IconAction icon={KeyboardIcon} label="快捷键设置" onClick={() => setKeysOpen(true)} />
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 bg-stage p-4">
            <Stage player={player} mediaKey={video.id} src={video.src} poster={video.poster} width={media.width} height={media.height} onBackgroundTap={() => st.setSelection(null)}>
              <RegionOverlay
                width={media.width}
                height={media.height}
                time={ps.time}
                crop={edits.crop}
                delogos={edits.delogos}
                selection={selection}
                showThirds={showThirds}
                cropAspect={cropAspect}
                onSelect={select}
                onCropChange={(crop, key) => dispatch({ type: 'setCrop', crop }, key)}
                onDelogoChange={(id, r, key) => dispatch({ type: 'updateDelogo', id, patch: r }, key)}
              />
            </Stage>
            <ToastViewport toasts={toasts} onDismiss={dismiss} className="absolute inset-x-0 bottom-3 z-20" />
          </div>

          <div className="flex h-11 shrink-0 items-center gap-1 border-y px-3">
            <IconAction icon={PreviousIcon} label="上一帧" combo={keymap.frameBack[0]} onClick={() => frame(-1)} />
            <Button size="icon" aria-label={ps.playing ? '暂停' : '播放'} onClick={player.togglePlay} {...keepFocus}>
              <HugeiconsIcon icon={ps.playing ? PauseIcon : PlayIcon} strokeWidth={1.75} />
            </Button>
            <IconAction icon={NextIcon} label="下一帧" combo={keymap.frameForward[0]} onClick={() => frame(1)} />
            <div className="ml-2 flex items-baseline gap-1.5 tabular-nums">
              <span className="text-xl leading-none font-medium">{formatTimecode(ps.time, media.fps)}</span>
              <span className="text-xs text-muted-foreground">/ {formatTimecode(media.duration, media.fps)}</span>
            </div>
            <Separator orientation="vertical" className="mx-2 h-5!" />
            <IconAction icon={MarkInIcon} label="设为入点" combo={keymap.markIn[0]} onClick={() => mark('start')} />
            <IconAction icon={MarkOutIcon} label="设为出点" combo={keymap.markOut[0]} onClick={() => mark('end')} />
            <IconAction icon={SplitAtPlayheadIcon} label="在播放头处切开" combo={keymap.split[0]} onClick={split} />
            <IconAction icon={DelogoIcon} label="新建 Delogo 区域" combo={keymap.newDelogo[0]} onClick={newDelogo} />
            <IconAction icon={AiScanIcon} label="导入模型结果" onClick={() => setImportOpen(true)} />
            <div className="ml-auto flex items-center gap-1">
              <SpeedMenu rate={ps.rate} onChange={player.setRate} combos={[keymap.speedDown[0], keymap.speedUp[0]]} />
            </div>
          </div>

          <div className="max-h-52 shrink-0 overflow-y-auto">
            <Timeline
              duration={media.duration}
              time={ps.time}
              crop={edits.crop}
              segments={edits.segments}
              delogos={edits.delogos}
              selection={selection}
              onSeek={player.seek}
              onSelect={select}
              onDelogoRange={(id, r, key) => dispatch({ type: 'updateDelogo', id, patch: r }, key)}
              onSegmentRange={(i, r, key) => dispatch({ type: 'updateSegment', index: i, segment: r }, key)}
              className="pb-2"
            />
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="min-h-0 flex-1 gap-0">
            <div className="px-3 pt-3">
              <TabsList className="w-full">
                <TabTrigger value="info" icon={InformationCircleIcon} label="信息" />
                <TabTrigger value="crop" icon={CropIcon} label="裁剪" />
                <TabTrigger value="delogo" icon={DelogoIcon} label="Delogo" count={edits.delogos.length} />
                <TabTrigger value="segments" icon={SplitAtPlayheadIcon} label="片段" count={edits.segments.length} />
              </TabsList>
            </div>
            <TabsContent value="info" className="min-h-0 overflow-y-auto p-3">
              <InfoPanel />
            </TabsContent>
            <TabsContent value="crop" className="min-h-0 overflow-y-auto p-3">
              <CropPanel />
            </TabsContent>
            <TabsContent value="delogo" className="min-h-0 overflow-y-auto p-3">
              <DelogoPanel />
            </TabsContent>
            <TabsContent value="segments" className="min-h-0 overflow-y-auto p-3">
              <SegmentsPanel onMarkIn={() => mark('start')} onMarkOut={() => mark('end')} onSplit={split} />
            </TabsContent>
          </Tabs>

          <Separator />
          <Decision
            key={video.id}
            edits={edits}
            onDecision={(status, note) => dispatch({ type: 'setDecision', status, note }, note !== undefined ? 'note' : undefined)}
            onSave={() => void save()}
            saving={saving}
            savedAt={savedAt}
            error={saveError}
            saveCombo={keymap.save[0]}
          />
        </aside>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        media={media}
        onImport={(regions) => {
          dispatch({ type: 'addDelogos', regions })
          notify(`已导入 ${regions.length} 个区域`, { action: { label: '撤销', onClick: st.undo } })
          if (regions[0]) select({ kind: 'delogo', id: regions[0].id })
        }}
      />
      <ShortcutSettings open={keysOpen} onOpenChange={setKeysOpen} keymap={keymap} onChange={setKeymap} />
    </ReviewerContext>
  )
}

function TabTrigger({ value, icon, label, count }: { value: Tab; icon: IconSvgElement; label: string; count?: number }) {
  return (
    <TabsTrigger value={value} className="gap-1">
      <HugeiconsIcon icon={icon} strokeWidth={1.5} data-icon="inline-start" />
      {label}
      {count ? <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span> : null}
    </TabsTrigger>
  )
}

function IconAction({ icon, label, combo, onClick, disabled }: { icon: IconSvgElement; label: string; combo?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled} {...keepFocus}>
          <HugeiconsIcon icon={icon} strokeWidth={1.5} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} {combo && <ComboKbd combo={combo} />}
      </TooltipContent>
    </Tooltip>
  )
}

function SpeedMenu({ rate, onChange, combos }: { rate: number; onChange: (r: number) => void; combos: (string | undefined)[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('min-w-12 tabular-nums', rate !== 1 && 'text-primary')} aria-label={`倍速 ${rate}×`} {...keepFocus}>
          {rate}×
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          倍速
          <span className="flex gap-1">{combos.map((c) => c && <ComboKbd key={c} combo={c} />)}</span>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(rate)} onValueChange={(v) => onChange(Number(v))}>
          {PLAYBACK_RATES.map((r) => (
            <DropdownMenuRadioItem key={r} value={String(r)} className="tabular-nums">
              {r}×{r === 1 && <span className="ml-auto text-muted-foreground">正常</span>}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Decision({
  edits,
  onDecision,
  onSave,
  saving,
  savedAt,
  error,
  saveCombo,
}: {
  edits: ReviewEdits
  onDecision: (status: ReviewEdits['status'], note?: string) => void
  onSave: () => void
  saving: boolean
  savedAt?: number
  error: string | null
  saveCombo?: string
}) {
  const noteRequired = edits.status === 'rejected' && !edits.note.trim()
  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">审核结论</h3>
        {savedAt && !error && (
          <span key={savedAt} className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={1.75} className="animate-saved-pop text-success" />
            已保存 {new Date(savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <ToggleGroup
        type="single"
        value={edits.status === 'approved' || edits.status === 'rejected' ? edits.status : ''}
        onValueChange={(v) => onDecision(v === 'approved' || v === 'rejected' ? v : edits.crop || edits.delogos.length || edits.segments.length ? 'marked' : 'pending')}
        variant="outline"
        className="w-full"
      >
        <ToggleGroupItem value="approved" className="flex-1 data-[state=on]:bg-success/12 data-[state=on]:text-success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={1.5} data-icon="inline-start" />
          通过
        </ToggleGroupItem>
        <ToggleGroupItem value="rejected" className="flex-1 data-[state=on]:bg-destructive/12 data-[state=on]:text-destructive">
          <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={1.5} data-icon="inline-start" />
          驳回
        </ToggleGroupItem>
      </ToggleGroup>
      <Label htmlFor="review-note" className="sr-only">
        备注
      </Label>
      <Textarea
        key={edits.note}
        id="review-note"
        defaultValue={edits.note}
        onBlur={(e) => e.currentTarget.value !== edits.note && onDecision(edits.status, e.currentTarget.value)}
        placeholder="备注（驳回时必填）"
        aria-invalid={noteRequired || undefined}
        className="min-h-14 resize-none text-xs"
      />
      {error && <p className="text-[11px] text-destructive">保存失败：{error}</p>}
      <Button onClick={onSave} disabled={saving || noteRequired} {...keepFocus}>
        {saving ? '保存中…' : '保存'}
        {saveCombo && !saving && <ComboKbd combo={saveCombo} />}
      </Button>
      {noteRequired && <p className="text-[11px] text-muted-foreground">驳回需要填写备注后才能保存。</p>}
    </div>
  )
}
