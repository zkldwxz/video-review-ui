import { useState, type ReactNode } from 'react'
import { Comment01Icon, Copy01Icon, FavouriteIcon, LinkSquare02Icon, PlayCircleIcon, Share08Icon, Tick02Icon, Bookmark01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCount, formatShort } from '../core/timecode'
import type { VideoStats } from '../core/types'
import { useReviewer } from './context'
import { AiTitle } from './ai-title'
import { Field } from './fields'
import { TagEditor } from './tag-editor'

const statItems: { key: keyof VideoStats; label: string; icon: IconSvgElement }[] = [
  { key: 'plays', label: '播放', icon: PlayCircleIcon },
  { key: 'likes', label: '点赞', icon: FavouriteIcon },
  { key: 'comments', label: '评论', icon: Comment01Icon },
  { key: 'shares', label: '分享', icon: Share08Icon },
  { key: 'favorites', label: '收藏', icon: Bookmark01Icon },
]

export function InfoPanel() {
  const { video, edits, media, dispatch, tagOptions } = useReviewer()
  const src = video.source
  const stats = statItems.filter((s) => src?.stats?.[s.key] !== undefined)

  return (
    <div className="flex flex-col gap-4">
      <Field label="标题">
        <Input
          key={edits.title}
          defaultValue={edits.title}
          aria-label="标题"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim()
            if (v && v !== edits.title) dispatch({ type: 'rename', title: v })
            else e.currentTarget.value = edits.title
          }}
        />
        <span className="truncate text-[11px] text-muted-foreground" title={video.fileName}>
          原文件 {video.fileName}
        </span>
      </Field>

      <AiTitle key={video.id} />

      <Field label="标签">
        <TagEditor tags={edits.tags} options={tagOptions} onChange={(tags) => dispatch({ type: 'setTags', tags })} />
      </Field>

      {stats.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {stats.map((s) => (
            <div key={s.key} className="flex flex-col gap-0.5 rounded-md bg-muted/60 px-2 py-1.5">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <HugeiconsIcon icon={s.icon} size={12} strokeWidth={1.5} />
                {s.label}
              </span>
              <span className="text-[13px] font-medium tabular-nums">{formatCount(src!.stats![s.key]!)}</span>
            </div>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 text-xs">
        {src?.externalId && (
          <Row label="视频 ID">
            <CopyText text={src.externalId} />
          </Row>
        )}
        {src?.platform && <Row label="来源">{src.platform}</Row>}
        {src?.author && (
          <Row label="作者">
            {src.author}
            {src.authorId && <span className="ml-1.5 text-muted-foreground">{src.authorId}</span>}
          </Row>
        )}
        {src?.publishedAt && <Row label="发布时间">{src.publishedAt}</Row>}
        {src?.project && <Row label="项目">{src.project}</Row>}
        {src?.category && <Row label="分类">{src.category}</Row>}
        <Row label="分辨率">
          <span className="tabular-nums">
            {media.width}×{media.height}
          </span>
        </Row>
        <Row label="时长">
          <span className="tabular-nums">{formatShort(media.duration)}</span>
        </Row>
        <Row label="帧率">
          <span className="tabular-nums">{media.fps} fps</span>
        </Row>
        {Object.entries(src?.extra ?? {}).map(([k, v]) => (
          <Row key={k} label={k}>
            {typeof v === 'number' ? <span className="tabular-nums">{v.toLocaleString('zh-CN')}</span> : v}
          </Row>
        ))}
      </dl>

      {src?.url && (
        <Button variant="outline" asChild className="justify-start">
          <a href={src.url} target="_blank" rel="noopener noreferrer">
            <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={1.5} data-icon="inline-start" />
            打开原视频页面
          </a>
        </Button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="truncate text-muted-foreground" title={label}>
        {label}
      </dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </>
  )
}

function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="group/copy flex max-w-full items-center gap-1 rounded-sm text-left tabular-nums outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1200)
      }}
      title="复制"
    >
      <span className="truncate">{text}</span>
      <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} strokeWidth={1.5} className={copied ? 'text-success' : 'text-muted-foreground'} />
      <span className="sr-only">{copied ? '已复制' : '复制'}</span>
    </button>
  )
}
