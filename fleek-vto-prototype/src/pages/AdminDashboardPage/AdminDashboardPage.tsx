/**
 * Admin Dashboard — Supplier Studio.
 *
 * Supplier / Admin view: scan paper clothing templates, upload photos of the
 * finished piece, preview it on an AI model (demographics are adjustable),
 * generate the AI buyer summary, then publish to the marketplace.
 *
 * Catalogue + images live in Supabase via the FastAPI backend in /backend
 * (falls back to a browser-local demo mode when the backend is down).
 */
import SupplierApp from '../../supplier/SupplierApp'

export default function AdminDashboardPage() {
  return <SupplierApp />
}
