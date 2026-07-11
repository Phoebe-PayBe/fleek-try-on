import type { Garment } from '../types'

const STATUS_LABEL: Record<Garment['status'], string> = {
  draft: 'Draft',
  preview: 'Try-on ready',
  published: 'Live on marketplace',
}

export function Dashboard({
  garments,
  onNew,
  onEdit,
  onStudio,
  onDelete,
}: {
  garments: Garment[]
  onNew: () => void
  onEdit: (g: Garment) => void
  onStudio: (g: Garment) => void
  onDelete: (g: Garment) => void
}) {
  const published = garments.filter((g) => g.status === 'published').length
  const drafts = garments.filter((g) => g.status !== 'published').length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Your upcycled inventory</h2>
          <p className="sub">Scan templates, preview on AI models, publish to the marketplace.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onNew}>+ New garment</button>
      </div>

      <div className="stat-row">
        <div className="stat"><div className="n">{garments.length}</div><div className="l">Garments</div></div>
        <div className="stat"><div className="n">{published}</div><div className="l">Live on marketplace</div></div>
        <div className="stat"><div className="n">{drafts}</div><div className="l">In progress</div></div>
      </div>

      <div className="garment-grid">
        <button className="new-card" onClick={onNew}>
          <div className="plus">+</div>
          Scan a new template
        </button>

        {garments.map((g) => (
          <div className="gcard" key={g.id}>
            <div className="thumb">
              {g.tryOnImage ? (
                <img src={g.tryOnImage} alt={g.name} />
              ) : g.itemImage ? (
                <img src={g.itemImage} alt={g.name} />
              ) : g.templateImage ? (
                <img src={g.templateImage} alt={g.name} style={{ objectFit: 'contain', padding: 8 }} />
              ) : (
                <span className="placeholder">✦</span>
              )}
              <span className={'chip chip-' + g.status}>{STATUS_LABEL[g.status]}</span>
            </div>
            <div className="body">
              <h3>{g.name || 'Untitled garment'}</h3>
              <div className="meta">
                {g.category} · {g.sizeRange || 'sizes TBC'} · {g.quantity || 'qty TBC'}
              </div>
              <div className="actions">
                <button className="btn btn-dark" onClick={() => onStudio(g)}>Try-on studio</button>
                <button className="btn btn-ghost" onClick={() => onEdit(g)}>Edit</button>
                <button className="btn btn-danger" title="Delete" onClick={() => onDelete(g)}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
