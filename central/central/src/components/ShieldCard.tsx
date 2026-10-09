import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { AppConfig } from '../config/apps'
import { getAppUrl } from '../config/apps'

interface ShieldCardProps {
  app: AppConfig
}

const SPRING = { stiffness: 220, damping: 24, mass: 0.9 }

/**
 * ShieldCard — 3D-depth reactive relic card.
 *
 * Cursor tracking drives three layers of motion:
 *   1. Chassis tilt       — rotateX ±12° / rotateY ±18°   (whole card)
 *   2. Chassis slide      — slideX ±14px / slideY ±14px   (parallax drift)
 *   3. Image parallax     — assetX ±12px / assetY ±12px   (inner image,
 *                                                         splits depth from chassis)
 *
 * On hover, the card lifts (translateZ: -60 toward the camera) and rises
 * -10px on Y, so the depth story reads as "the shield emerges from the
 * page" rather than "the page tilts." Combined with the depth-shadow in
 * .shield-card:hover (offset + blur), the cursor-tracking parallax sells
 * the 3D illusion.
 *
 * No clip-path. No shield-shaped backing. No VFX particles. Just depth.
 */
export default function ShieldCard({ app }: ShieldCardProps) {
  const accent = app.accentColor

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, SPRING)
  const sy = useSpring(my, SPRING)

  // Chassis tilt + slide (whole card reacts to cursor)
  const rotateX = useTransform(sy, [-0.5, 0.5], ['12deg', '-12deg'])
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-18deg', '18deg'])
  const slideX  = useTransform(sx, [-0.5, 0.5], ['-14px', '14px'])
  const slideY  = useTransform(sy, [-0.5, 0.5], ['-14px', '14px'])

  // Inner image moves MORE than the chassis — creates the depth split
  // (image "floats" above the chassis as the card tilts).
  const assetX  = useTransform(sx, [-0.5, 0.5], ['18px', '-18px'])
  const assetY  = useTransform(sy, [-0.5, 0.5], ['18px', '-18px'])

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <motion.a
      href={getAppUrl(app)}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      className="shield-card"
      whileHover={{
        y: -10,
        // Negative translateZ pulls the card toward the camera (forward
        // in 3D space) — strongest single contributor to "the shield
        // emerges" depth read.
        translateZ: -60,
        transition: { type: 'spring', ...SPRING },
      }}
      style={{
        // Fluid width driven by the .relic-grid column (minmax 260px → 1fr).
        // Fixed aspect ratio (300 / 460 ≈ 0.652) preserves card proportions.
        width: '100%',
        maxWidth: 300,
        aspectRatio: '300 / 460',
        perspective: 1200,
        rotateX,
        rotateY,
        x: slideX,
        y: slideY,
        ['--accent' as string]: accent,
      }}
    >
      <motion.div
        className="shield-card-image-wrap"
        style={{
          // Inner image gets its own parallax on top of the chassis motion —
          // the chassis and image drift in the same direction but the image
          // moves ~30% farther, exaggerating the tilt.
          x: assetX,
          y: assetY,
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          src={app.imagePath}
          alt={app.name}
          className="shield-card-image"
          draggable={false}
        />
      </motion.div>
      <div className="shield-card-footer">
        <div className="shield-card-name">{app.shortName}</div>
        <div className="shield-card-status">
          <span className="shield-card-dot" />
          ONLINE
        </div>
      </div>
    </motion.a>
  )
}
