export function Header({ onHome }: { onHome: () => void }) {
  return (
    <header className="topbar">
      <div className="logo" style={{ cursor: 'pointer' }} onClick={onHome}>
        <span className="star" style={{ color: 'var(--yellow)' }}>✦</span> FLEEK
      </div>
      <span className="badge-supplier">Supplier Studio</span>
      <div className="spacer" />
      <span className="who">studio@reworkedlondon.co.uk · demo</span>
    </header>
  )
}
