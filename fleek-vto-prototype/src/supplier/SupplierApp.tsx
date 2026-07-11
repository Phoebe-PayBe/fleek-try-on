import { useEffect, useRef, useState } from 'react'
import type { Garment } from './types'
import { DEFAULT_MODEL } from './types'
import type { Health } from './api'
import {
  detectHealth,
  getApiKey,
  listGarments,
  newId,
  persistGarment,
  removeGarment,
  setApiKey as storeApiKey,
} from './api'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'
import { GarmentWizard } from './components/GarmentWizard'
import { TryOnStudio } from './components/TryOnStudio'
import './supplier.css'

type View = { name: 'dashboard' } | { name: 'wizard'; id: string } | { name: 'studio'; id: string }

export default function SupplierApp() {
  const [health, setHealth] = useState<Health>({ mode: 'local', geminiOnServer: false })
  const [garments, setGarments] = useState<Garment[]>([])
  const [apiKey, setApiKey] = useState('')
  const [view, setView] = useState<View>({ name: 'dashboard' })
  const [ready, setReady] = useState(false)

  const debounces = useRef<Map<string, number>>(new Map())
  const healthRef = useRef(health)
  healthRef.current = health

  useEffect(() => {
    ;(async () => {
      const h = await detectHealth()
      setHealth(h)
      try {
        setGarments(await listGarments(h.mode))
      } catch {
        // backend up but DB unreachable — fall back to local
        const fallback: Health = { mode: 'local', geminiOnServer: false }
        setHealth(fallback)
        setGarments(await listGarments('local'))
      }
      setApiKey(await getApiKey())
      setReady(true)
    })()
  }, [])

  /** Optimistic update + debounced persist (wizard patches on every keystroke). */
  function save(g: Garment) {
    setGarments((cur) => {
      const i = cur.findIndex((x) => x.id === g.id)
      return i === -1 ? [g, ...cur] : cur.map((x) => (x.id === g.id ? g : x))
    })
    const prev = debounces.current.get(g.id)
    if (prev) window.clearTimeout(prev)
    debounces.current.set(
      g.id,
      window.setTimeout(() => {
        persistGarment(healthRef.current.mode, g)
          .then((stored) => {
            // swap any data-URL images for their stored URLs
            setGarments((cur) => cur.map((x) => (x.id === g.id ? { ...x, ...stored } : x)))
          })
          .catch((e) => console.warn('persist failed', e))
      }, 700),
    )
  }

  /** Persist immediately (before AI calls that read the DB). */
  async function persistNow(g: Garment): Promise<Garment> {
    const prev = debounces.current.get(g.id)
    if (prev) window.clearTimeout(prev)
    const stored = await persistGarment(healthRef.current.mode, g)
    setGarments((cur) => cur.map((x) => (x.id === g.id ? { ...x, ...stored } : x)))
    return stored
  }

  function createGarment(): Garment {
    const g: Garment = {
      id: newId(),
      name: '',
      category: 'Shirts',
      sizeRange: '',
      fabric: '',
      upcycledSource: '',
      wholesalePrice: '',
      quantity: '',
      templateImage: null,
      itemImage: null,
      tryOnImage: null,
      tryOnIsDemo: false,
      tryOnRenders: {},
      modelProfile: { ...DEFAULT_MODEL },
      summary: null,
      status: 'draft',
      createdAt: Date.now(),
    }
    save(g)
    return g
  }

  async function handleDelete(g: Garment) {
    if (!confirm(`Delete "${g.name || 'Untitled garment'}"?`)) return
    setGarments((cur) => cur.filter((x) => x.id !== g.id))
    await removeGarment(health.mode, g.id)
  }

  function handleApiKey(k: string) {
    setApiKey(k)
    storeApiKey(k).catch(() => {})
  }

  const current =
    view.name === 'dashboard' ? null : garments.find((g) => g.id === view.id) ?? null

  return (
    <div className="supplier-app">
      <Header onHome={() => setView({ name: 'dashboard' })} />
      {health.mode === 'local' && ready && (
        <div style={{ background: '#131313', color: '#ffd643', textAlign: 'center', padding: '8px 16px', fontSize: 12.5, fontWeight: 700 }}>
          ⚠ Backend not reachable — running in offline demo mode (data stays in this browser).
          Start it with: <code>cd backend && uvicorn main:app --port 8000</code>
        </div>
      )}
      {!ready ? (
        <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
          <div className="spin" />
        </div>
      ) : view.name === 'wizard' && current ? (
        <GarmentWizard
          key={current.id}
          garment={current}
          onSave={save}
          onDone={(g) => {
            save(g)
            setView({ name: 'studio', id: g.id })
          }}
          onCancel={() => setView({ name: 'dashboard' })}
        />
      ) : view.name === 'studio' && current ? (
        <TryOnStudio
          key={current.id}
          garment={current}
          health={health}
          apiKey={apiKey}
          onApiKey={handleApiKey}
          onSave={save}
          onPersist={persistNow}
          onBack={() => setView({ name: 'dashboard' })}
          onEdit={(g) => setView({ name: 'wizard', id: g.id })}
        />
      ) : (
        <Dashboard
          garments={garments}
          onNew={() => setView({ name: 'wizard', id: createGarment().id })}
          onEdit={(g) => setView({ name: 'wizard', id: g.id })}
          onStudio={(g) => setView({ name: 'studio', id: g.id })}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
