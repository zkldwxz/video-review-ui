import { useEffect, useRef, useState } from 'react'
import { AiMagicIcon, CheckmarkCircle02Icon, Refresh01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fillPrompt, titlePromptVars } from '../core/title-prompt'
import { useReviewer } from './context'
import { ComboKbd } from './shortcut-settings'

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; titles: string[] } | { kind: 'error'; message: string }

/**
 * AI 改写标题。提示词按模板预填（默认“生成一个{category}的视频标题”）；
 * 视频没有分类时留空，由用户自己写。回车生成，点候选直接替换标题（可撤销）。
 * 父组件按视频 id 设 key，换视频时重置。
 */
export function AiTitle() {
  const { video, edits, dispatch, generateTitles, titlePromptTemplate, aiTitleInput: input, keymap } = useReviewer()
  const preset = fillPrompt(titlePromptTemplate, titlePromptVars(video, edits))
  const [prompt, setPrompt] = useState(preset ?? '')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const pending = useRef<AbortController | null>(null)

  useEffect(() => () => pending.current?.abort(), [])

  if (!generateTitles) return null

  const run = () => {
    const p = prompt.trim()
    if (!p) {
      input.current?.focus()
      return
    }
    pending.current?.abort()
    const ctrl = new AbortController()
    pending.current = ctrl
    setState({ kind: 'loading' })
    generateTitles({ prompt: p, video, edits }, ctrl.signal).then(
      (titles) => !ctrl.signal.aborted && setState({ kind: 'done', titles }),
      (e) => !ctrl.signal.aborted && setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) }),
    )
  }

  const combo = keymap.aiTitle[0]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <HugeiconsIcon icon={AiMagicIcon} size={14} strokeWidth={1.5} className="text-primary" />
        AI 改写标题
        {combo && (
          <span className="ml-auto">
            <ComboKbd combo={combo} />
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        <Input
          ref={input}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              run()
            }
          }}
          placeholder="例如：生成一个舞蹈视频的标题"
          aria-label="标题生成要求"
        />
        <Button size="sm" onClick={run} disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? '生成中…' : '生成'}
        </Button>
      </div>
      {!preset && state.kind === 'idle' && <p className="text-caption text-muted-foreground">这条视频没有分类，请自己描述想要的标题。</p>}

      {state.kind === 'loading' && (
        <div className="flex flex-col gap-1.5" aria-label="生成中">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-muted motion-reduce:animate-none" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      )}

      {state.kind === 'error' && <p className="text-caption text-destructive">生成失败：{state.message}</p>}

      {state.kind === 'done' && (
        <div className="flex flex-col gap-1">
          {state.titles.map((t) => {
            const applied = t === edits.title
            return (
              <button
                key={t}
                type="button"
                onClick={() => dispatch({ type: 'rename', title: t })}
                className={cn(
                  'flex items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-120 ease-snap hover:bg-muted',
                  applied && 'bg-accent text-accent-foreground hover:bg-accent',
                )}
                title="点击使用这个标题"
              >
                <span className="flex-1">{t}</span>
                {applied && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.5} className="mt-px shrink-0 text-success" />}
              </button>
            )
          })}
          <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={run}>
            <HugeiconsIcon icon={Refresh01Icon} strokeWidth={1.5} data-icon="inline-start" />
            换一批
          </Button>
        </div>
      )}
    </div>
  )
}
