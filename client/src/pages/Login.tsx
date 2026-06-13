import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as L from 'lucide-react';
import { useApp } from '../store/app';

const DEMO = [
  ['admin', 'admin123', 'Admin — full access'],
  ['quality', 'quality123', 'Quality — QMS & compliance'],
  ['production', 'prod123', 'Production — manufacturing'],
  ['operator', 'oper123', 'Operator — shop floor'],
  ['viewer', 'view123', 'Viewer — read-only'],
];

export default function Login() {
  const login = useApp((s) => s.login);
  const nav = useNavigate();
  const [username, setU] = useState('admin');
  const [password, setP] = useState('admin123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await login(username, password); nav('/'); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-brand-600 text-white">
        <div className="flex items-center gap-2 text-xl font-bold"><L.Wind size={26} /> VentVerse</div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">ICU Ventilator<br />Production Management</h1>
          <p className="mt-4 text-white/80 max-w-md">A state-of-the-art manufacturing & quality platform engineered for full <b>ISO 13485</b> and <b>ISO 9001</b> compliance — from BOM to Device History Record, NCR to CAPA, with end-to-end traceability.</p>
          <div className="flex gap-2 mt-6">
            <span className="chip bg-white/15">ISO 13485</span>
            <span className="chip bg-white/15">ISO 9001</span>
            <span className="chip bg-white/15">ISO 14971</span>
            <span className="chip bg-white/15">21 CFR Part 11</span>
          </div>
        </div>
        <p className="text-white/60 text-sm">© 2026 VentVerse — Proof of Concept</p>
      </div>

      <div className="flex items-center justify-center p-6 bg-surface-2">
        <form onSubmit={submit} className="card p-6 w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 text-xl font-bold mb-4 text-brand-600"><L.Wind size={24} /> VentVerse</div>
          <h2 className="text-lg font-semibold mb-1">Sign in</h2>
          <p className="text-sm text-ink-soft mb-4">Password-protected, role-based access.</p>
          <label className="block text-xs font-medium text-ink-soft mb-1">Username</label>
          <input className="input mb-3" value={username} onChange={(e) => setU(e.target.value)} autoFocus />
          <label className="block text-xs font-medium text-ink-soft mb-1">Password</label>
          <input type="password" className="input mb-4" value={password} onChange={(e) => setP(e.target.value)} />
          {err && <p className="text-sm text-rose-500 mb-3">{err}</p>}
          <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>

          <div className="mt-5 border-t border-line pt-3">
            <p className="text-xs text-ink-soft mb-2">Demo accounts (click to fill):</p>
            <div className="space-y-1">
              {DEMO.map(([u, p, d]) => (
                <button type="button" key={u} onClick={() => { setU(u); setP(p); }}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-surface-3 flex justify-between">
                  <span className="font-medium">{u}</span><span className="text-ink-soft">{d}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
