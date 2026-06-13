import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './store/app';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Traceability from './pages/Traceability';
import ListPage from './pages/ListPage';

function Protected({ children }: { children: React.ReactNode }) {
  const user = useApp((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { init, ready, user } = useApp();
  useEffect(() => { init(); }, [init]);

  if (!ready) return <div className="h-screen flex items-center justify-center text-ink-soft">Loading VentVerse…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route index element={<Dashboard />} />
          <Route path="traceability" element={<Traceability />} />
          {/* key forces remount per module so table/ref hooks stay stable */}
          <Route path="m/:key" element={<ListPageWrapper />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useParams } from 'react-router-dom';
function ListPageWrapper() {
  const { key } = useParams();
  return <ListPage key={key} />;
}
