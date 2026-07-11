import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { ROUTES } from './routes';
import ProductDetailsPage from './pages/ProductDetailsPage/ProductDetailsPage';
import AdminDashboardPage from './pages/AdminDashboardPage/AdminDashboardPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to={ROUTES.product} className="app-logo">
          Fleek<span>VTO</span>
        </Link>
        <nav className="app-nav">
          <Link to={ROUTES.product}>Product</Link>
          <Link to={ROUTES.admin}>Admin</Link>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path={ROUTES.product} element={<ProductDetailsPage />} />
          <Route path={ROUTES.admin} element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to={ROUTES.product} replace />} />
        </Routes>
      </main>
    </div>
  );
}
