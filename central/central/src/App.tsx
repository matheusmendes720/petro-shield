import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CircuitBackground from './components/CircuitBackground'
import SystemStatusBar from './components/SystemStatusBar'
import Home from './pages/Home'

/**
 * Top-level routes for the PetroShield unified hub.
 *
 * In the unified-Netlify-build model, sub-apps live at their own sub-paths
 * (`/axe-guard/`, `/petroshield-finance/`, `/soc-sys/`) served by the same
 * Netlify site. The hub is just the landing page; the rest of the site is
 * each sub-app at its own path. No iframe, no redirect gate, no router
 * routes for the sub-apps — those are physical sub-folders in `dist/`.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <CircuitBackground />
        <main className="page-container">
          <SystemStatusBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <div className="scanline-sweep" />
      </div>
    </BrowserRouter>
  )
}

export default App
