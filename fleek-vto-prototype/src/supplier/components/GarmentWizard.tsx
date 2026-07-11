import { useRef, useState } from 'react'
import type { Garment } from '../types'
import { CATEGORIES } from '../types'
import { enhanceScan, fileToDataUrl } from '../imageUtils'

function Dropzone({
  image,
  onImage,
  icon,
  title,
  hint,
  capture,
}: {
  image: string | null
  onImage: (dataUrl: string) => void
  icon: string
  title: string
  hint: string
  capture?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleFile(file?: File | null) {
    if (!file) return
    setBusy(true)
    try {
      onImage(await fileToDataUrl(file))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={'dropzone' + (drag ? ' drag' : '')}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]) }}
      onClick={() => inputRef.current?.click()}
      role="button"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {busy ? (
        <div className="spin" />
      ) : image ? (
        <img className="preview" src={image} alt={title} />
      ) : (
        <>
          <div className="icon">{icon}</div>
          <strong>{title}</strong>
          <span>{hint}</span>
        </>
      )}
    </div>
  )
}

export function GarmentWizard({
  garment,
  onSave,
  onDone,
  onCancel,
}: {
  garment: Garment
  onSave: (g: Garment) => void
  onDone: (g: Garment) => void
  onCancel: () => void
}) {
  const [g, setG] = useState<Garment>(garment)
  const [step, setStep] = useState(0)
  const [enhancing, setEnhancing] = useState(false)

  function patch(p: Partial<Garment>) {
    setG((cur) => {
      const next = { ...cur, ...p }
      onSave(next)
      return next
    })
  }

  async function runEnhance() {
    if (!g.templateImage) return
    setEnhancing(true)
    try {
      patch({ templateImage: await enhanceScan(g.templateImage) })
    } finally {
      setEnhancing(false)
    }
  }

  const steps = ['Scan template', 'Photograph item', 'Details']

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>{g.name || 'New garment'}</h2>
          <p className="sub">Get the piece ready for the try-on studio.</p>
        </div>
        <button className="btn btn-ghost" onClick={onCancel}>← Back to inventory</button>
      </div>

      <div className="steps">
        {steps.map((label, i) => (
          <button
            key={label}
            className={'step' + (i === step ? ' active' : i < step ? ' done' : '')}
            onClick={() => setStep(i)}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <span className="dot">{i < step ? '✓' : i + 1}</span> {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="panel">
          <h3>Scan the clothing template</h3>
          <p className="hint">
            Templates are usually on very large paper — photograph them section by section or in full with your
            phone. The scanner flattens lighting and sharpens pattern lines automatically.
          </p>
          <Dropzone
            image={g.templateImage}
            onImage={(img) => patch({ templateImage: img })}
            icon="📐"
            title="Scan or upload the paper template"
            hint="Tap to open camera / choose a file, or drag & drop the photo here"
            capture
          />
          <div className="scan-tools">
            {g.templateImage && (
              <>
                <button className="btn btn-dark" onClick={runEnhance} disabled={enhancing}>
                  {enhancing ? <span className="spin" /> : '✨'} Enhance scan
                </button>
                <button className="btn btn-ghost" onClick={() => patch({ templateImage: null })}>
                  Remove
                </button>
              </>
            )}
          </div>
          <div className="wizard-nav">
            <span />
            <button className="btn btn-primary" onClick={() => setStep(1)}>
              Next: photograph the item →
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="panel">
          <h3>Photograph the actual item</h3>
          <p className="hint">
            A flat-lay or hanger shot of the finished piece. This is what the AI drapes onto the model, so good
            light and a plain background help.
          </p>
          <Dropzone
            image={g.itemImage}
            onImage={(img) => patch({ itemImage: img })}
            icon="📸"
            title="Upload a photo of the garment"
            hint="Flat-lay works best — tap to choose or drag & drop"
            capture
          />
          {g.itemImage && (
            <div className="scan-tools">
              <button className="btn btn-ghost" onClick={() => patch({ itemImage: null })}>Remove</button>
            </div>
          )}
          <div className="wizard-nav">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Template</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Next: details →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          <h3>Garment details</h3>
          <p className="hint">These feed the AI style summary that buyers see next to the try-on.</p>
          <div className="two-col">
            <div>
              <div className="field">
                <label>Name</label>
                <input value={g.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Patchwork Denim Chore Jacket" />
              </div>
              <div className="field">
                <label>Category</label>
                <select value={g.category} onChange={(e) => patch({ category: e.target.value as Garment['category'] })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Size range</label>
                <input value={g.sizeRange} onChange={(e) => patch({ sizeRange: e.target.value })} placeholder="e.g. S – XL" />
              </div>
              <div className="field">
                <label>Fabric composition</label>
                <input value={g.fabric} onChange={(e) => patch({ fabric: e.target.value })} placeholder="e.g. 80% reclaimed denim, 20% cotton twill" />
              </div>
            </div>
            <div>
              <div className="field">
                <label>Upcycled source (the story)</label>
                <textarea
                  value={g.upcycledSource}
                  onChange={(e) => patch({ upcycledSource: e.target.value })}
                  placeholder="Where the fabric was saved from — e.g. factory off-cuts, damaged vintage jeans, deadstock rolls"
                />
              </div>
              <div className="field">
                <label>Wholesale price</label>
                <input value={g.wholesalePrice} onChange={(e) => patch({ wholesalePrice: e.target.value })} placeholder="e.g. £12.00 / unit" />
              </div>
              <div className="field">
                <label>Quantity available</label>
                <input value={g.quantity} onChange={(e) => patch({ quantity: e.target.value })} placeholder="e.g. 25 units" />
              </div>
            </div>
          </div>
          <div className="wizard-nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Item photo</button>
            <button className="btn btn-dark btn-lg" onClick={() => onDone(g)}>
              Open try-on studio ✦
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
