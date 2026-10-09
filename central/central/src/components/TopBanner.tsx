import { motion } from 'framer-motion'

/**
 * TopBanner — minimal header.
 * Three images (BR badge, 3D letter title, GitHub badge) in a simple
 * flex row. No chassis, no rivets, no fire borders, no LED.
 * Just a clean hero with the brand mark.
 *
 * Choreography: title anchors first (largest element, longest blur
 * settle), then BR + GitHub settle symmetrically from either flank.
 * All three share the same CSS hover halo (no framer whileHover cross-talk).
 */
export default function TopBanner() {
  return (
    <header className="top-banner">
      <motion.img
        src="/elements/br.png"
        alt="BR"
        className="top-banner-badge"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.img
        src="/elements/3d_letter_title.png"
        alt="PetroShield"
        className="top-banner-title"
        initial={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      />

      <motion.a
        href="https://github.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="PetroShield on GitHub (opens in new tab)"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-block' }}
      >
        <img
          src="/elements/github.png"
          alt=""
          className="top-banner-badge"
        />
      </motion.a>
    </header>
  )
}
