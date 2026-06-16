import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { resources, publicMeta } from './registry/index.js';
import { makeRouter } from './crud.js';
import { authMiddleware, login, can } from './auth.js';
import { store } from './store/index.js';
import { seed } from './db/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const st = store();
  await st.init();

  // Auto-seed on first boot (fresh DB or empty spreadsheet) so a new deploy
  // is immediately usable with demo data.
  try {
    if (await st.isEmpty('users')) { console.log('Empty backend — seeding demo data…'); await seed(); }
  } catch (e) { console.error('seed-on-boot skipped:', e.message); }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // ---- Public ----
  app.get('/api/health', (req, res) => res.json({ ok: true, store: st.kind, ts: new Date().toISOString() }));

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      const result = await login(username, password);
      if (!result) return res.status(401).json({ error: 'Invalid username or password' });
      res.json(result);
    } catch (e) { next(e); }
  });

  // ---- Authenticated below ----
  app.use('/api', authMiddleware);

  app.get('/api/me', (req, res) => res.json({ user: req.user }));

  app.get('/api/meta', (req, res) => {
    const meta = publicMeta().map((m) => ({
      ...m,
      canRead: can(req.user, m.permissions.read),
      canWrite: !m.readOnly && can(req.user, m.permissions.write),
    }));
    res.json({ resources: meta, role: req.user.role, store: st.kind });
  });

  const listAll = async () => {
    const out = {};
    for (const r of resources) out[r.key] = await st.list(r.key);
    return out;
  };

  // ---- KPI / Dashboard analytics ----
  app.get('/api/analytics/summary', async (req, res, next) => {
    try {
      const data = await listAll();
      const len = (k) => (data[k] || []).length;
      const where = (k, fn) => (data[k] || []).filter(fn).length;

      const passed = where('inspections', (i) => i.result === 'Pass');
      const failed = where('inspections', (i) => i.result === 'Fail');
      const fpy = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 100;
      const todayStr = new Date().toISOString().slice(0, 10);

      res.json({
        kpis: {
          activeWorkOrders: where('work_orders', (w) => ['Released', 'In Progress'].includes(w.status)),
          devicesReleased: where('devices', (d) => d.build_status === 'Released'),
          openNCR: where('ncr', (n) => n.status !== 'Closed'),
          openCAPA: where('capa', (c) => c.status !== 'Closed'),
          overdueCalibration: where('calibration', (c) => c.status === 'Overdue' || (c.next_cal && c.next_cal < todayStr)),
          firstPassYield: fpy,
          openComplaints: where('complaints', (c) => c.status !== 'Closed'),
          suppliers: len('suppliers'),
        },
        counts: Object.fromEntries(resources.map((r) => [r.key, len(r.key)])),
      });
    } catch (e) { next(e); }
  });

  app.get('/api/analytics/charts', async (req, res, next) => {
    try {
      const data = await listAll();
      const group = (k, col) => {
        const m = {};
        for (const row of data[k] || []) { const v = row[col] ?? '—'; m[v] = (m[v] || 0) + 1; }
        return Object.entries(m).map(([k2, v]) => ({ k: k2, v }));
      };
      res.json({
        ncrBySource: group('ncr', 'source'),
        ncrBySeverity: group('ncr', 'severity'),
        capaByStatus: group('capa', 'status'),
        woByStatus: group('work_orders', 'status'),
        devByStatus: group('devices', 'build_status'),
        inspectionByResult: group('inspections', 'result'),
      });
    } catch (e) { next(e); }
  });

  // ---- Traceability spine ----
  app.get('/api/trace/device/:serial', async (req, res, next) => {
    try {
      const serial = req.params.serial;
      const devices = await st.list('devices');
      const d = devices.find((x) => x.serial_number === serial);
      if (!d) return res.status(404).json({ error: 'Serial not found' });
      const [products, wos, inspections, ncrs, complaints, udis, bom, materials] = await Promise.all(
        ['products', 'work_orders', 'inspections', 'ncr', 'complaints', 'udi', 'bom', 'materials'].map((k) => st.list(k)));
      const product = products.find((p) => p.id === d.product_id) || null;
      const workOrder = wos.find((w) => w.wo_number === d.wo_number) || null;
      const udi = udis.find((u) => u.udi_di === d.udi) || null;
      const matIds = new Set(bom.filter((b) => b.product_id === d.product_id).map((b) => b.material_id));
      res.json({
        device: d, product, workOrder, udi,
        inspections: inspections.filter((i) => (i.subject || '').includes(serial) || i.subject === d.wo_number),
        ncrs: ncrs.filter((n) => (n.subject || '').includes(serial)),
        complaints: complaints.filter((c) => c.serial_number === serial),
        materials: materials.filter((m) => matIds.has(m.id)),
      });
    } catch (e) { next(e); }
  });

  // ---- Auto-mount CRUD routers for every resource ----
  for (const r of resources) app.use(`/api/${r.key}`, makeRouter(r));

  // Unknown API routes -> JSON 404 (so the SPA fallback never swallows them).
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // ---- Serve the built web app (single-service production mode) ----
  const clientDist = join(__dirname, '..', '..', 'client', 'dist');
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
    console.log('Serving web app from', clientDist);
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`VPMS running on http://localhost:${PORT} (store: ${st.kind})`));
}

bootstrap().catch((e) => { console.error('Failed to start:', e); process.exit(1); });
