import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { UnifiedTodo } from '@/shared/types'

/**
 * useSprintDrag
 * -------------
 * Drag-to-reorder logic for the sprint task list.
 * Handles pointer capture, visual displacement of siblings, and committing the new order.
 *
 * @param visibleItems - the currently visible (paginated) task list
 * @param reorderTasks - store action that persists the new id order
 */
export function useSprintDrag(
  visibleItems: UnifiedTodo[],
  reorderTasks: (ids: string[]) => void,
) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const dragStartYRef = useRef(0)
  const dragDeltaYRef = useRef(0)
  const listRef       = useRef<HTMLUListElement>(null)

  // Keep a ref so pointer-up callback never closes over a stale visibleItems array
  const visibleItemsRef = useRef(visibleItems)
  visibleItemsRef.current = visibleItems

  const applyDragStyles = useCallback((from: number, over: number, deltaY: number) => {
    const el = listRef.current
    if (!el) return
    const children = Array.from(el.children) as HTMLElement[]
    const itemH = children[from]?.offsetHeight ?? 64

    children.forEach((child, i) => {
      if (i === from) {
        child.style.transform  = `translateY(${deltaY}px) scale(1.03)`
        child.style.zIndex     = '20'
        child.style.position   = 'relative'
        child.style.transition = 'box-shadow 0.15s ease'
        child.removeAttribute('data-drop-above')
      } else {
        child.style.zIndex     = ''
        child.style.position   = ''
        child.style.transition = 'transform 0.18s ease'
        if (over > from && i > from && i <= over) {
          child.style.transform = `translateY(-${itemH}px)`
        } else if (over < from && i >= over && i < from) {
          child.style.transform = `translateY(${itemH}px)`
        } else {
          child.style.transform = ''
        }
        if (i === over) child.setAttribute('data-drop-above', 'true')
        else            child.removeAttribute('data-drop-above')
      }
    })
  }, [])

  const resetDragStyles = useCallback(() => {
    const el = listRef.current
    if (!el) return
    Array.from(el.children as HTMLCollectionOf<HTMLElement>).forEach(child => {
      child.style.transform  = ''
      child.style.zIndex     = ''
      child.style.position   = ''
      child.style.transition = ''
      child.removeAttribute('data-drop-above')
    })
  }, [])

  const handleDragHandlePointerDown = useCallback((index: number, e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY
    dragDeltaYRef.current = 0
    setDragFromIndex(index)
    setDragOverIndex(index)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handleDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragFromIndex === null || !listRef.current) return
    const deltaY = e.clientY - dragStartYRef.current
    dragDeltaYRef.current = deltaY

    const children = Array.from(listRef.current.children) as HTMLElement[]
    const y = e.clientY
    let newIndex = dragFromIndex
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (y < rect.top + rect.height / 2) { newIndex = i; break }
      newIndex = i
    }

    applyDragStyles(dragFromIndex, newIndex, deltaY)
    if (newIndex !== dragOverIndex) setDragOverIndex(newIndex)
  }, [dragFromIndex, dragOverIndex, applyDragStyles])

  const handleDragPointerUp = useCallback(() => {
    resetDragStyles()
    if (dragFromIndex === null || dragOverIndex === null || dragFromIndex === dragOverIndex) {
      setDragFromIndex(null)
      setDragOverIndex(null)
      return
    }
    const reordered = [...visibleItemsRef.current]
    const [moved] = reordered.splice(dragFromIndex, 1)
    reordered.splice(dragOverIndex, 0, moved)
    reorderTasks(reordered.map(t => t.id))
    setDragFromIndex(null)
    setDragOverIndex(null)
  }, [dragFromIndex, dragOverIndex, reorderTasks, resetDragStyles])

  // Restore transforms after React re-render triggered by dragOverIndex state change
  useLayoutEffect(() => {
    if (dragFromIndex === null) return
    applyDragStyles(dragFromIndex, dragOverIndex ?? dragFromIndex, dragDeltaYRef.current)
  }, [dragFromIndex, dragOverIndex, applyDragStyles])

  return {
    dragFromIndex,
    dragOverIndex,
    listRef,
    handleDragHandlePointerDown,
    handleDragPointerMove,
    handleDragPointerUp,
  }
}
