/**
 * Admin Dashboard — placeholder.
 *
 * Owned by a teammate who will implement matching of factory measurements with
 * actual images (Google Vision API). Intentionally left blank for this scope;
 * only the /admin route + shell are wired up here.
 */
export default function AdminDashboardPage() {
  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '60px 22px' }}>
      <h1 style={{ marginTop: 0 }}>Admin Dashboard</h1>
      <p style={{ color: '#6b6b73', maxWidth: 560 }}>
        Placeholder. This screen will host the measurement-to-image matching workflow
        (Google Vision API), built by the backend/admin teammate.
      </p>
      <div
        style={{
          marginTop: 24,
          border: '1px dashed #d9d9de',
          borderRadius: 14,
          height: 260,
          display: 'grid',
          placeItems: 'center',
          color: '#9a9aa2',
          fontSize: 14,
        }}
      >
        Admin content goes here
      </div>
    </div>
  );
}
