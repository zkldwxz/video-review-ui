import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  defaultKeymap,
  featureLabels,
  featurePresets,
  resolveFeatures,
  VideoReviewer,
  type DelogoMode,
  type Keymap,

  type ReviewFeatures,
  type ReviewTask,
  type ReviewVideo,
  type TitleGenerator,
  type VideoReviewerHandle,
} from '@/review-kit'
import { loadBilibiliVideo } from './bilibili'
import { demoVideos, tagOptions } from './sample-data'

const KEYMAP_KEY = 'review-kit:keymap'
const DEFAULT_BVID = 'BV1GJ411x7h7'

const loadKeymap = (): Keymap => {
  const raw = localStorage.getItem(KEYMAP_KEY)
  return raw ? { ...defaultKeymap, ...(JSON.parse(raw) as Partial<Keymap>) } : defaultKeymap
}

/** 调开发服务器的 /api/titles（server/title-api.ts），API Key 只在服务端 */
const generateTitles: TitleGenerator = async ({ prompt, video, edits }, signal) => {
  const res = await fetch('/api/titles', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt,
      currentTitle: edits.title,
      category: video.source?.category,
      tags: edits.tags,
      author: video.source?.author,
      platform: video.source?.platform,
    }),
  })
  const json = (await res.json()) as { titles?: string[]; error?: string }
  if (!res.ok || !json.titles) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json.titles
}

const PRESET_LABELS: Record<keyof typeof featurePresets, string> = { full: '全部功能', delogoOnly: '只做 Delogo', delogoStatic: 'Delogo 整段生效', trimOnly: '只剪片段' }

type DemoOptions = { features: ReviewFeatures; embedded: boolean; readOnly: boolean; disabled: boolean; delogoMode?: DelogoMode }
const MODE_LABELS: Record<'embedded' | 'readOnly' | 'disabled', string> = { readOnly: '只读', disabled: '禁用', embedded: '嵌入（无外框，快捷键只在组件内生效）' }

/** 演示用的功能开关；接入时直接传 features={{ ... }} 或改 core/features.ts 的默认值 */
function FeatureToggles({ options, onChange }: { options: DemoOptions; onChange: (o: DemoOptions) => void }) {
  const id = useId()
  const value = options.features
  const resolved = resolveFeatures(value)
  const setFeatures = (features: ReviewFeatures) => onChange({ ...options, features })
  return (
    <details className="rounded-lg border bg-card text-xs">
      <summary className="cursor-pointer px-3 py-2 text-muted-foreground select-none">功能开关</summary>
      <div className="flex flex-col gap-2 border-t px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-muted-foreground">预设</span>
          {(Object.keys(featurePresets) as (keyof typeof featurePresets)[]).map((k) => (
            <Button key={k} size="xs" variant="outline" onClick={() => setFeatures(featurePresets[k])}>
              {PRESET_LABELS[k]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(featureLabels) as (keyof ReviewFeatures)[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <Switch id={`${id}-${k}`} size="sm" checked={resolved[k]} disabled={resolved[k] !== value[k]} onCheckedChange={(v) => setFeatures({ ...value, [k]: v })} />
              <Label htmlFor={`${id}-${k}`} className="text-xs font-normal">
                {featureLabels[k]}
              </Label>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-2">
          {(Object.keys(MODE_LABELS) as (keyof typeof MODE_LABELS)[]).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <Switch id={`${id}-${k}`} size="sm" checked={options[k]} onCheckedChange={(v) => onChange({ ...options, [k]: v })} />
              <Label htmlFor={`${id}-${k}`} className="text-xs font-normal">
                {MODE_LABELS[k]}
              </Label>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Delogo 处理方式</span>
            <Select value={options.delogoMode ?? 'any'} onValueChange={(v) => onChange({ ...options, delogoMode: v === 'any' ? undefined : (v as DelogoMode) })}>
              <SelectTrigger size="sm" className="w-32" aria-label="Delogo 处理方式">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">每个区域自选</SelectItem>
                <SelectItem value="delogo">固定插值修补</SelectItem>
                <SelectItem value="blur">固定模糊</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </details>
  )
}

type BiliState = { kind: 'loading'; bvid: string } | { kind: 'ok'; video: ReviewVideo } | { kind: 'error'; message: string }

/** 宿主接入示例：传入视频列表，保存时拿到处理任务；另外现查一条 B 站视频加进队列 */
export function ReviewerDemo() {
  const reviewer = useRef<VideoReviewerHandle>(null)
  const [videos, setVideos] = useState(demoVideos)
  const [lastTask, setLastTask] = useState<ReviewTask | null>(null)
  const [changes, setChanges] = useState(0)
  const [initialKeymap] = useState(loadKeymap)
  const [bvid, setBvid] = useState(DEFAULT_BVID)
  const [bili, setBili] = useState<BiliState>({ kind: 'loading', bvid: DEFAULT_BVID })
  const [options, setOptions] = useState<DemoOptions>({ features: featurePresets.full, embedded: false, readOnly: false, disabled: false })


  const onLoaded = (video: ReviewVideo) => {
    setVideos((list) => [video, ...list.filter((v) => v.id !== video.id)])
    setBili({ kind: 'ok', video })
  }
  const onFailed = (e: unknown) => setBili({ kind: 'error', message: e instanceof Error ? e.message : String(e) })

  useEffect(() => {
    const ctrl = new AbortController()
    loadBilibiliVideo(DEFAULT_BVID, ctrl.signal).then(onLoaded, (e) => !ctrl.signal.aborted && onFailed(e))
    return () => ctrl.abort()
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs"
        onSubmit={(e) => {
          e.preventDefault()
          setBili({ kind: 'loading', bvid: bvid.trim() })
          loadBilibiliVideo(bvid.trim()).then(onLoaded, onFailed)
        }}
      >
        <span className="font-medium">B 站测试视频</span>
        <Input value={bvid} onChange={(e) => setBvid(e.target.value)} aria-label="BV 号" className="h-7 w-40 tabular-nums" spellCheck={false} />
        <Button type="submit" size="sm" variant="outline" disabled={bili.kind === 'loading'}>
          {bili.kind === 'loading' ? '解析中…' : '加载'}
        </Button>
        {bili.kind === 'ok' && (
          <>
            <span className="text-muted-foreground">已加入队列：{bili.video.edits.title}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => reviewer.current?.selectVideo(bili.video.id)}>
              打开
            </Button>
          </>
        )}
        {bili.kind === 'error' && <span className="min-w-0 flex-1 text-destructive">{bili.message}</span>}
      </form>

      <FeatureToggles options={options} onChange={setOptions} />

      <VideoReviewer
        ref={reviewer}
        features={options.features}
        embedded={options.embedded}
        readOnly={options.readOnly}
        disabled={options.disabled}
        delogoMode={options.delogoMode}
        videos={videos}
        tagOptions={tagOptions}
        generateTitles={generateTitles}
        keymap={initialKeymap}
        onKeymapChange={(k) => localStorage.setItem(KEYMAP_KEY, JSON.stringify(k))}
        onChange={() => setChanges((n) => n + 1)}
        onSave={async (task) => {
          // 真实接入时在这里提交给后端或转码队列
          await new Promise((r) => setTimeout(r, 300))
          setLastTask(task)
        }}
        className="h-[min(860px,calc(100dvh-120px))] min-h-[680px]"
      />
      <details className="rounded-lg border bg-card text-xs">
        <summary className="cursor-pointer px-3 py-2 text-muted-foreground select-none">
          宿主收到的数据：onChange {changes} 次{lastTask ? `，最近一次任务来自「${lastTask.title}」` : '，按 Enter 保存后显示 onSave 的任务'}
        </summary>
        <div className="border-t px-3 py-2">
          <Button size="xs" variant="outline" onClick={() => setLastTask(reviewer.current?.getTask() ?? null)}>
            调用 ref.getTask()（不保存）
          </Button>
        </div>
        {lastTask && <pre className="max-h-80 overflow-auto border-t px-3 py-2 text-[11px] leading-4 tabular-nums">{JSON.stringify(lastTask, null, 2)}</pre>}
      </details>
    </div>
  )
}
