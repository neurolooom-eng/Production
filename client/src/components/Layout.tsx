import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import * as L from 'lucide-react';
import { useApp } from '../store/app';
import { useMeta } from '../lib/meta';
import { Icon } from '../lib/icon';
import { ACCENTS, type Mode } from '../theme/themes';

const GROUP_ORDER = ['Overview', 'Production', 'Quality', 'Supply Chain', 'Administration'];
const GROUP_ICON: Record<string, string> = {
  Overview: 'LayoutDashboard', Production: 'Factory', Quality: 'ShieldCheck',
  'Supply Chain': 'Truck', Administration: 'Settings',
};

export function Layout() {
  const { user, logout, theme, setMode, setAccent } = useApp();
  const { data: meta } = useMeta();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const groups: Record<string, any[]> = { Overview: [] };
  for (const r of meta?.resources || []) {
    if (!r.canRead) continue;
    (groups[r.group] ||= []).push(r);
  }

  const modes: { m: Mode; icon: string; label: string }[] = [
    { m: 'light', icon: 'Sun', label: 'Light' },
    { m: 'dark', icon: 'Moon', label: 'Dark' },
    { m: 'contrast', icon: 'Contrast', label: 'High Contrast' },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} shrink-0 bg-surface border-r border-line flex flex-col transition-all`}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-line text-brand-600 font-bold">
          <L.Wind size={22} />{!collapsed && <span>VentVerse</span>}
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <NavItem to="/" icon="LayoutDashboard" label="Dashboard" collapsed={collapsed} end />
          <NavItem to="/traceability" icon="GitBranch" label="Traceability" collapsed={collapsed} />
          {GROUP_ORDER.filter((g) => g !== 'Overview').map((g) => (groups[g]?.length ? (
            <div key={g} className="mt-3">
              {!collapsed && <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1"><Icon name={GROUP_ICON[g]} size={12} /> {g}</div>}
              {groups[g].map((r) => (
                <NavItem key={r.key} to={`/m/${r.key}`} icon={r.icon} label={r.plural} collapsed={collapsed} />
              ))}
            </div>
          ) : null))}
        </nav>
        <button className="p-3 text-ink-soft hover:bg-surface-3 border-t border-line flex items-center gap-2" onClick={() => setCollapsed((c) => !c)}>
          {collapsed ? <L.ChevronRight size={18} /> : <><L.ChevronLeft size={18} /> Collapse</>}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-line bg-surface">
          <div className="font-semibold">ICU Ventilator Production Management</div>
          <span className="chip bg-brand-100 text-brand-700">{meta?.role}</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Theme switcher */}
            <div className="relative">
              <button className="btn-ghost" onClick={() => { setThemeOpen((o) => !o); setUserOpen(false); }}>
                <L.Palette size={18} />
              </button>
              {themeOpen && (
                <div className="absolute right-0 mt-1 w-60 card p-3 shadow-xl z-40">
                  <div className="text-xs font-semibold text-ink-soft mb-2">Mode</div>
                  <div className="flex gap-1 mb-3">
                    {modes.map((m) => (
                      <button key={m.m} onClick={() => setMode(m.m)}
                        className={`flex-1 btn ${theme.mode === m.m ? 'bg-brand-600 text-white' : 'btn-outline'}`} title={m.label}>
                        <Icon name={m.icon} size={15} />
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-ink-soft mb-2">Accent</div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {ACCENTS.map((a) => (
                      <button key={a.key} title={a.name} onClick={() => setAccent(a.key)}
                        className={`h-7 w-7 rounded-full border-2 ${theme.accent === a.key ? 'border-ink' : 'border-transparent'}`}
                        style={{ background: a.swatch }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* User menu */}
            <div className="relative">
              <button className="btn-ghost" onClick={() => { setUserOpen((o) => !o); setThemeOpen(false); }}>
                <span className="h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                  {(user?.full_name || user?.username || '?').slice(0, 1).toUpperCase()}
                </span>
                {!collapsed && <span className="text-sm">{user?.full_name || user?.username}</span>}
                <L.ChevronDown size={14} />
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-1 w-52 card p-2 shadow-xl z-40">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-medium">{user?.full_name}</div>
                    <div className="text-xs text-ink-soft">{user?.email}</div>
                    <div className="text-xs text-ink-soft">{(user as any)?.department} · {user?.role}</div>
                  </div>
                  <button className="btn-ghost w-full justify-start" onClick={() => { logout(); nav('/login'); }}>
                    <L.LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, collapsed, end }: { to: string; icon: string; label: string; collapsed: boolean; end?: boolean }) {
  return (
    <NavLink to={to} end={end} title={label}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${isActive ? 'bg-brand-100 text-brand-700 font-medium border-r-2 border-brand-600' : 'text-ink-soft hover:bg-surface-3 hover:text-ink'}`}>
      <Icon name={icon} size={17} />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}
