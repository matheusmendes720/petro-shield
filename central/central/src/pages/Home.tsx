import { motion } from 'framer-motion'
import { APPS } from '../config/apps'
import TopBanner from '../components/TopBanner'
import ShieldCard from '../components/ShieldCard'

/**
 * Home — the unified hub landing.
 *
 * Top: minimal banner (BR / 3D title / GitHub).
 * Middle: 3 unified shield cards in a clean grid.
 * Bottom: minimal footer line.
 *
 * No sub-header, no section dividers, no hover tooltips, no fancy chrome.
 */
export default function Home() {
  return (
    <div className="home-content">
      <TopBanner />

      <div className="relic-section">
        <div className="relic-section-header">
          <span className="relic-section-label">RELIC SHIELDS</span>
          <span className="relic-section-rule" />
        </div>

        <div className="relic-grid">
          {APPS.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <ShieldCard app={app} />
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="home-footer">
        AXEGUARD_UNIFIED_HUB v2.0 // SENAI GRAND PRIX 2026
      </footer>
    </div>
  )
}
