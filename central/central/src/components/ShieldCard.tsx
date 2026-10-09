import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { AppConfig } from '../config/apps'
import { getAppUrl } from '../config/apps'

interface ShieldCardProps {
  app: AppConfig
}

const SPRING = { stiffness: 200, damping: 26, mass: 1 }

/**
 * ShieldCard — unified container card.
 *
 * One chassis for all 3 apps: rectangle, border, padding, footer.
 * The shield image is the hero. Subtle 3D tilt on mouse move.
 * Hover: border color shifts to accent + soft glow + slight lift.
 *
 * No clip-path. No shield-shaped backing. No VFX. Just clean.
 */
export default function ShieldCard({ app }: ShieldCardProps) {
  const accent = app.accentColor

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, SPRING)
  const sy = useSpring(my, SPRING)
  const rotateX = useTransform(sy, [-0.5, 0.5], ['6deg', '-6deg'])
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-10deg', '10deg'])

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
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', ...SPRING }}
      style={{
        width: 300,
        height: 460,
        perspective: 1000,
        rotateX,
        rotateY,
        ['--accent' as string]: accent,
      }}
    >
      <div className="shield-card-image-wrap">
        <img
          src={app.imagePath}
          alt={app.name}
          className="shield-card-image"
          draggable={false}
        />
      </div>
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
