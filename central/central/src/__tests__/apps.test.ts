import { describe, it, expect } from 'vitest'
import {
  APPS,
  APPS_BY_ID,
  getAppUrl,
  getAppHealthUrl,
  HUB_MODE,
  rgba,
} from '../config/apps'

/**
 * Hub smoke tests.
 *
 * These run via `npm run test` / `bun run test` in CI on every PR. They
 * catch obvious breakage in the app registry (duplicate ports, missing
 * fields, broken URL builders) without booting a dev server.
 */

describe('Hub app registry', () => {
  it('exports 3 apps', () => {
    expect(APPS).toHaveLength(3)
  })

  it('each app has a unique localPort', () => {
    const ports = APPS.map((a) => a.localPort)
    expect(new Set(ports).size).toBe(ports.length)
  })

  it('each app has a unique id', () => {
    const ids = APPS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('APPS_BY_ID is keyed by app id and round-trips', () => {
    for (const app of APPS) {
      expect(APPS_BY_ID[app.id]).toBe(app)
    }
  })

  it('every app has a /elements/<file>.png imagePath', () => {
    for (const app of APPS) {
      expect(app.imagePath).toMatch(/^\/elements\/[\w-]+\.png$/)
    }
  })
})

describe('HUB_MODE', () => {
  it('is "local" or "prod"', () => {
    expect(['local', 'prod']).toContain(HUB_MODE)
  })
})

describe('getAppUrl', () => {
  it('returns the localhost dev URL in local mode, the sub-path in prod', () => {
    const app = APPS[0]
    const url = getAppUrl(app)
    if (HUB_MODE === 'local') {
      expect(url).toBe(`http://localhost:${app.localPort}/`)
    } else {
      expect(url).toBe(app.path)
    }
  })

  it('every app has a path starting with /', () => {
    for (const app of APPS) {
      expect(app.path.startsWith('/')).toBe(true)
      expect(app.path.endsWith('/')).toBe(true)
    }
  })
})

describe('getAppHealthUrl', () => {
  it('returns a URL ending in /api/health', () => {
    for (const app of APPS) {
      const url = getAppHealthUrl(app)
      expect(url.endsWith('/api/health')).toBe(true)
    }
  })

  it('uses the configured localPort in local mode', () => {
    if (HUB_MODE !== 'local') return
    for (const app of APPS) {
      const url = getAppHealthUrl(app)
      expect(url).toContain(`:${app.localPort}`)
    }
  })
})

describe('rgba helper', () => {
  it('builds an rgba() string from a #RRGGBB hex + alpha', () => {
    expect(rgba('#00FF41', 0.6)).toBe('rgba(0,255,65,0.6)')
    expect(rgba('#000000', 1)).toBe('rgba(0,0,0,1)')
  })
})
