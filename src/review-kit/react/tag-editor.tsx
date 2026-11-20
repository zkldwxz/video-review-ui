import { useId, useState } from 'react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Input } from '@/components/ui/input'

/** 标签：回车添加，退格删除最后一个，点常用标签直接加；readOnly 时只展示 */
export function TagEditor({ tags, options = [], readOnly = false, onChange }: { tags: string[]; options?: string[]; readOnly?: boolean; onChange: (tags: string[]) => void }) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const add = (t: string) => {
    const v = t.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setDraft('')
  }
  const suggestions = options.filter((o) => !tags.includes(o) && o.includes(draft.trim()))

  if (readOnly) {
    return tags.length ? (
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="rounded-sm bg-accent px-1.5 py-0.5 text-caption text-accent-foreground">
            {t}
          </span>
        ))}
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">无</span>
    )
  }


  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-7 flex-wrap items-center gap-1 rounded-md border bg-input/20 p-1 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30">
        {tags.map((t) => (
          <span key={t} className="flex h-5 items-center gap-0.5 rounded-sm bg-accent pr-0.5 pl-1.5 text-caption text-accent-foreground">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="flex size-4 items-center justify-center rounded-sm hover:bg-foreground/10" aria-label={`删除标签 ${t}`}>
              <HugeiconsIcon icon={Cancel01Icon} size={10} strokeWidth={2} />
            </button>
          </span>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
            if (e.key === 'Backspace' && !draft && tags.length) onChange(tags.slice(0, -1))
          }}
          placeholder={tags.length ? '' : '输入标签，回车添加'}
          aria-label="添加标签"
          className="h-5 min-w-20 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => add(o)}
              className="h-5 rounded-sm border border-dashed px-1.5 text-caption text-muted-foreground transition-colors duration-120 ease-snap hover:border-solid hover:text-foreground"
            >
              + {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
