import { useEffect, useRef } from 'react'

/* CircuitBackground — slim ambient canvas.
   Drifting nodes + sparse L-connections + mild mouse parallax.
   One canvas pass per frame, ~30 nodes max. */

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

const NODE_COUNT = 30
const LINK_DISTANCE = 140
const COLORS = { node: '#00FF41', nodeNear: '#00FFFF', link: '#00FF41', linkNear: '#00FFFF' }

function distSq(a: Node, b: Node) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

export default function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ w: 0, h: 0, dpr: 1, mouseX: 0.5, mouseY: 0.5, nodes: [] as Node[] })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const s = stateRef.current
      s.w = window.innerWidth
      s.h = window.innerHeight
      s.dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = s.w * s.dpr
      canvas.height = s.h * s.dpr
      canvas.style.width = `${s.w}px`
      canvas.style.height = `${s.h}px`
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)
      s.nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * s.w,
        y: Math.random() * s.h,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: 1.2 + Math.random() * 1.6,
      }))
    }

    const onMouse = (e: MouseEvent) => {
      const s = stateRef.current
      s.mouseX = e.clientX / s.w
      s.mouseY = e.clientY / s.h
    }

    const onResize = () => resize()
    resize()
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouse)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      // Render one frame and stop.
      drawFrame(ctx, stateRef.current)
      return () => {
        window.removeEventListener('resize', onResize)
        window.removeEventListener('mousemove', onMouse)
      }
    }

    let raf = 0
    const tick = () => {
      drawFrame(ctx, stateRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: '#050505',
      }}
    />
  )
}

function drawFrame(ctx: CanvasRenderingContext2D, s: { w: number; h: number; mouseX: number; mouseY: number; nodes: Node[] }) {
  const { w, h, mouseX, mouseY, nodes } = s
  const mx = mouseX * w
  const my = mouseY * h
  const px = (mouseX - 0.5) * 18
  const py = (mouseY - 0.5) * 14

  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    n.x += n.vx
    n.y += n.vy
    if (n.x < -20) n.x = w + 20
    if (n.x > w + 20) n.x = -20
    if (n.y < -20) n.y = h + 20
    if (n.y > h + 20) n.y = -20

    const nx = n.x + px
    const ny = n.y + py
    const dxm = nx - mx
    const dym = ny - my
    const dmSq = dxm * dxm + dym * dym
    const near = dmSq < 220 * 220

    ctx.fillStyle = near ? COLORS.nodeNear : COLORS.node
    ctx.beginPath()
    ctx.arc(nx, ny, n.r, 0, Math.PI * 2)
    ctx.fill()

    for (let j = i + 1; j < nodes.length; j += 3) {
      const o = nodes[j]
      const ox = o.x + px
      const ooy = o.y + py
      const dSq = distSq({ x: nx, y: ny, vx: 0, vy: 0, r: 0 }, { x: ox, y: ooy, vx: 0, vy: 0, r: 0 })
      if (dSq < LINK_DISTANCE * LINK_DISTANCE) {
        const a = (1 - Math.sqrt(dSq) / LINK_DISTANCE) * 0.18
        ctx.strokeStyle = near ? COLORS.linkNear : COLORS.link
        ctx.globalAlpha = a
        ctx.lineWidth = 0.6
        ctx.beginPath()
        if (Math.abs(nx - ox) > Math.abs(ny - ooy)) {
          ctx.moveTo(nx, ny)
          ctx.lineTo(ox, ny)
          ctx.lineTo(ox, ooy)
        } else {
          ctx.moveTo(nx, ny)
          ctx.lineTo(nx, ooy)
          ctx.lineTo(ox, ooy)
        }
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
  }
}
