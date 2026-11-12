import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'

/** Scroll coordinates keep the canvas bounded and keyboard/touch scrolling native. */
export function InteractiveMap({
  children,
  width,
  label,
}: {
  children: ReactNode
  width?: number
  label: string
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const zoomRef = useRef(1)
  const [viewportWidth, setViewportWidth] = useState(640)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{
    x: number
    y: number
    left: number
    top: number
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const anchor = useRef<{ left: number; top: number } | null>(null)
  const canvasWidth = width ?? viewportWidth
  const canvasHeight = 360

  const changeZoom = useCallback((value: number, x?: number, y?: number) => {
    const el = viewport.current
    if (!el) return
    const next = Math.max(1, Math.min(2, value))
    const previous = zoomRef.current
    if (next === previous) return
    const px = x ?? el.clientWidth / 2
    const py = y ?? el.clientHeight / 2
    anchor.current = {
      left: ((el.scrollLeft + px) * next) / previous - px,
      top: ((el.scrollTop + py) * next) / previous - py,
    }
    zoomRef.current = next
    setZoom(next)
  }, [])

  useLayoutEffect(() => {
    if (anchor.current && viewport.current) {
      viewport.current.scrollLeft = anchor.current.left
      viewport.current.scrollTop = anchor.current.top
      anchor.current = null
    }
  }, [zoom])

  useEffect(() => {
    const el = viewport.current!
    const measure = () => setViewportWidth(el.clientWidth || 640)
    measure()
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(el)
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? el.clientHeight
            : 1)
      changeZoom(
        zoomRef.current * Math.exp(-delta * 0.002),
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
    }
    const move = (event: MouseEvent) => {
      const start = drag.current
      if (!start) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (!start.moved && Math.hypot(dx, dy) < 6) return
      start.moved = true
      suppressClick.current = true
      setDragging(true)
      event.preventDefault()
      el.scrollLeft = start.left - dx
      el.scrollTop = start.top - dy
    }
    const end = () => {
      drag.current = null
      setDragging(false)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('blur', end)
    return () => {
      observer?.disconnect()
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('blur', end)
    }
  }, [changeZoom])

  return (
    <>
      <div
        ref={viewport}
        className={`map-viewport interactive-viewport ${dragging ? 'is-dragging' : ''}`}
        role="region"
        aria-label={label}
        tabIndex={0}
        onMouseDown={(event) => {
          if (event.button !== 0) return
          const el = event.currentTarget
          suppressClick.current = false
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: el.scrollLeft,
            top: el.scrollTop,
            moved: false,
          }
        }}
        onClickCapture={(event) => {
          // Keyboard activation remains available after a drag.
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault()
            event.stopPropagation()
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          className="map-canvas-space"
          style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
        >
          <div
            className="map-canvas"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${zoom})`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
      <div className="map-navigation">
        <p>Arrastra para mover · Usa la rueda para acercar o alejar</p>
        <div className="zoom-controls">
          <button
            aria-label="Alejar mapa"
            disabled={zoom <= 1}
            onClick={() => changeZoom(zoomRef.current - 0.25)}
          >
            <Minus size={15} />
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Acercar mapa"
            disabled={zoom >= 2}
            onClick={() => changeZoom(zoomRef.current + 0.25)}
          >
            <Plus size={15} />
          </button>
          <button
            aria-label="Restablecer vista"
            onClick={() => {
              anchor.current = null
              zoomRef.current = 1
              setZoom(1)
              if (viewport.current) {
                viewport.current.scrollLeft = 0
                viewport.current.scrollTop = 0
              }
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
