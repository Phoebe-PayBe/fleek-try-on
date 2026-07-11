import { useState } from 'react'
import type { Garment, ModelProfile } from '../types'
import { ETHNICITIES, GENDERS, MODEL_SIZES, renderKey } from '../types'
import { modelPhotoFor } from '../models'
import type { Health } from '../api'
import { runSummary, runTryOn } from '../api'

export function TryOnStudio({
  garment,
  health,
  apiKey,
  onApiKey,
  onSave,
  onPersist,
  onBack,
  onEdit,
}: {
  garment: Garment
  health: Health
  apiKey: string
  onApiKey: (k: string) => void
  onSave: (g: Garment) => void
  onPersist: (g: Garment) => Promise<Garment>
  onBack: () => void
  onEdit: (g: Garment) => void
}) {
  const [g, setG] = useState<Garment>(garment)
  const [profile, setProfile] = useState<ModelProfile>(garment.modelProfile)
  const [generating, setGenerating] = useState(false)
  const [summarising, setSummarising] = useState(false)
  const [error, setError] = useState('')
  const [publishedNow, setPublishedNow] = useState(false)
  const [keyDraft, setKeyDraft] = useState(apiKey)

  async function handleTryOn() {
    setError('')
    setGenerating(true)
    try {
      // make sure the DB copy has the latest images before the server reads it
      const stored = await onPersist(g)
      setG((cur) => ({ ...cur, ...stored }))
      const result = await runTryOn(health, stored, profile, apiKey)
      const next = {
        ...stored,
        tryOnImage: result.image,
        tryOnIsDemo: result.isDemo,
        // keep every generated demographic + size so the product page can
        // toggle between them
        tryOnRenders: { ...stored.tryOnRenders, [renderKey(profile)]: result.image },
        modelProfile: profile,
        status: (stored.status === 'published' ? 'published' : 'preview') as Garment['status'],
      }
      setG(next)
      onSave(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function handleSummary() {
    setError('')
    setSummarising(true)
    try {
      const stored = await onPersist(g)
      setG((cur) => ({ ...cur, ...stored }))
      const summary = await runSummary(health, stored, apiKey)
      const next = { ...stored, summary }
      setG(next)
      onSave(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSummarising(false)
    }
  }

  async function publish() {
    const next = { ...g, status: 'published' as Garment['status'] }
    setG(next)
    setPublishedNow(true)
    onSave(next)
    // Write through immediately (not via the debounce) so the buyer product
    // page sees the published render right away, even on an instant tab switch.
    try {
      await onPersist(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const canPublish = Boolean(g.tryOnImage && g.summary)
  const aiEnabled = health.geminiOnServer || Boolean(apiKey)

  return (
    <div className="page" style={{ maxWidth: 1320 }}>
      <div className="page-head">
        <div>
          <h2>Try-on studio — {g.name || 'Untitled'}</h2>
          <p className="sub">
            Preview how the piece looks on different model demographics before publishing to buyers.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => onEdit(g)}>Edit garment</button>
          <button className="btn btn-ghost" onClick={onBack}>← Inventory</button>
        </div>
      </div>

      {health.geminiOnServer ? (
        <div className="keybar" style={{ background: '#e2f5e9', borderColor: '#bfe8cd', color: 'var(--green)' }}>
          ✓ Google AI try-on enabled on the backend — renders are generated server-side and stored in Supabase.
        </div>
      ) : (
        <div className="keybar">
          <span>🔑 Google Gemini API key (optional — without it the studio runs in demo mode):</span>
          <input
            type="password"
            placeholder="AIza…"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <button className="btn btn-dark" onClick={() => onApiKey(keyDraft.trim())}>
            {apiKey ? 'Update key' : 'Save key'}
          </button>
          {apiKey && <span style={{ color: 'var(--green)' }}>✓ AI try-on enabled (in-browser)</span>}
        </div>
      )}

      <div className="studio">
        {/* left: model controls */}
        <div className="panel">
          <h3>Model demographics</h3>
          <p className="hint">Buyers can retarget this on the marketplace — pick the default look.</p>

          <div className="field">
            <label>Ethnicity</label>
            <div className="seg">
              {ETHNICITIES.map((e) => (
                <button
                  key={e}
                  className={profile.ethnicity === e ? 'on' : ''}
                  onClick={() => setProfile({ ...profile, ethnicity: e })}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Model</label>
            <div className="seg">
              {GENDERS.map((e) => (
                <button
                  key={e}
                  className={profile.gender === e ? 'on' : ''}
                  onClick={() => setProfile({ ...profile, gender: e })}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Size</label>
            <div className="seg">
              {MODEL_SIZES.map((s) => (
                <button
                  key={s}
                  className={profile.size === s ? 'on' : ''}
                  onClick={() => setProfile({ ...profile, size: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="hint" style={{ marginTop: -4 }}>
            {modelPhotoFor(profile)
              ? `📸 Using the real ${profile.ethnicity} model photo (size ${profile.size}).`
              : `✎ No photo for ${profile.ethnicity} yet — using the drawn demo figure.`}
          </p>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleTryOn}
            disabled={generating || (!g.itemImage && !g.templateImage)}
          >
            {generating ? <span className="spin" /> : '✦'}
            {generating ? 'Generating…' : g.tryOnImage ? 'Regenerate try-on' : 'Generate try-on'}
          </button>
          {!aiEnabled && (
            <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>
              No Gemini key — previews use the built-in demo renderer.
            </p>
          )}
          {!g.itemImage && !g.templateImage && (
            <div className="error-note">Add a template scan or item photo first (Edit garment).</div>
          )}
        </div>

        {/* centre: canvas */}
        <div className="studio-canvas">
          <div className="frame">
            {g.tryOnImage ? (
              <>
                <img src={g.tryOnImage} alt="Try-on preview" />
                {g.tryOnIsDemo && <span className="chip chip-demo">Demo mode</span>}
              </>
            ) : (
              <div className="empty">
                Set the model demographics and hit <strong>Generate try-on</strong> to see{' '}
                {g.name || 'this piece'} on the AI model.
              </div>
            )}
          </div>
          {error && <div className="error-note">{error}</div>}
          {publishedNow || g.status === 'published' ? (
            <div className="ok-note" style={{ width: '100%', textAlign: 'center' }}>
              ✓ Published — buyers can now try this on in the marketplace
            </div>
          ) : (
            <button
              className="btn btn-dark btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={publish}
              disabled={!canPublish}
              title={canPublish ? '' : 'Generate a try-on and a buyer summary first'}
            >
              🚀 Publish to marketplace
            </button>
          )}
        </div>

        {/* right: AI summary */}
        <div className="panel">
          <h3>Buyer intelligence</h3>
          <p className="hint">AI summary shown to B2B buyers next to the try-on.</p>

          {g.summary ? (
            <>
              <div className="summary-block">
                <h4>How it feels</h4>
                <p>{g.summary.feel}</p>
              </div>
              <div className="summary-block">
                <h4>Style notes</h4>
                <p>{g.summary.styleNotes}</p>
              </div>
              <div className="summary-block">
                <h4>For the buyer</h4>
                <p>{g.summary.buyerNotes}</p>
              </div>
            </>
          ) : (
            <p className="hint" style={{ fontStyle: 'italic' }}>
              No summary yet — generate one from the garment details, fabric and photos.
            </p>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleSummary}
            disabled={summarising}
          >
            {summarising ? <span className="spin" /> : '✨'}
            {summarising ? 'Writing…' : g.summary ? 'Regenerate summary' : 'Generate AI summary'}
          </button>

          <div style={{ marginTop: 18, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
            <div style={{ marginBottom: 6 }}>Sources used:</div>
            <div>📐 Template scan: {g.templateImage ? '✓ attached' : '— none'}</div>
            <div>📸 Item photo: {g.itemImage ? '✓ attached' : '— none'}</div>
            <div>🧵 Fabric: {g.fabric || '— not set'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
