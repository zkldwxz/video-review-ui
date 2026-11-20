import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { applyEdit, createHistory, pushHistory, redo as redoHistory, undo as undoHistory, type EditAction, type History } from '../core/edits'
import type { ReviewEdits, ReviewVideo } from '../core/types'

export type Selection = { kind: 'crop' } | { kind: 'delogo'; id: string } | { kind: 'segment'; index: number } | null

type Histories = Record<string, History<ReviewEdits>>

/** 每条视频一份撤销栈。宿主后来追加的视频，第一次编辑时再建栈。 */
export function useReviewerState(videos: ReviewVideo[], opts: { initialVideoId?: string; onChange?: (videoId: string, edits: ReviewEdits) => void }) {
  const [histories, setHistories] = useState<Histories>({})
  const [activeId, setActiveIdState] = useState(opts.initialVideoId ?? videos[0]?.id)
  const [selection, setSelection] = useState<Selection>(null)
  const [savedAt, setSavedAt] = useState<Record<string, number>>({})

  const videosRef = useRef(videos)
  useLayoutEffect(() => {
    videosRef.current = videos
  })

  const baseOf = useCallback((prev: Histories, id: string) => {
    const video = videosRef.current.find((v) => v.id === id)
    if (!video) throw new Error(`找不到视频 ${id}`)
    return prev[id] ?? createHistory(video.edits)
  }, [])

  const editsOf = useCallback((id: string) => histories[id]?.present ?? videos.find((v) => v.id === id)?.edits, [histories, videos])

  const dispatch = useCallback(
    (action: EditAction, coalesceKey?: string, videoId = activeId) => {
      if (!videoId) return
      setHistories((prev) => {
        const base = baseOf(prev, videoId)
        return { ...prev, [videoId]: pushHistory(base, applyEdit(base.present, action), coalesceKey) }
      })
    },
    [activeId, baseOf],
  )

  const undo = useCallback(() => {
    if (activeId) setHistories((prev) => ({ ...prev, [activeId]: undoHistory(baseOf(prev, activeId)) }))
  }, [activeId, baseOf])

  const redo = useCallback(() => {
    if (activeId) setHistories((prev) => ({ ...prev, [activeId]: redoHistory(baseOf(prev, activeId)) }))
  }, [activeId, baseOf])

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id)
    setSelection(null)
  }, [])

  const markSaved = useCallback((id: string) => setSavedAt((s) => ({ ...s, [id]: Date.now() })), [])

  // 通知宿主：只报真正变化的视频
  const reported = useRef<Record<string, ReviewEdits>>({})
  const onChange = opts.onChange
  useEffect(() => {
    for (const [id, h] of Object.entries(histories)) {
      if (reported.current[id] !== h.present) {
        if (reported.current[id] !== undefined || h.past.length > 0 || h.future.length > 0) onChange?.(id, h.present)
        reported.current[id] = h.present
      }
    }
  }, [histories, onChange])

  const history = activeId ? histories[activeId] : undefined

  return {
    activeId,
    setActiveId,
    editsOf,
    dispatch,
    undo,
    redo,
    canUndo: (history?.past.length ?? 0) > 0,
    canRedo: (history?.future.length ?? 0) > 0,
    /** 撤销 / 重做后会变成什么，用来生成提示 */
    undoPreview: history?.past.length ? { from: history.present, to: history.past[history.past.length - 1] } : undefined,
    redoPreview: history?.future.length ? { from: history.present, to: history.future[0] } : undefined,
    selection,
    setSelection,
    savedAt,
    markSaved,
  }
}

export type ReviewerState = ReturnType<typeof useReviewerState>
