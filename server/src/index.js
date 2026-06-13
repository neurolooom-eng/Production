import express from 'express';
import cors from 'cors';
import { resources, publicMeta, resourceMap } from './registry/index.js';
import { makeRouter } from './crud.js';
import { authMiddleware, login, can } from './auth.js';
import { db } from './db/connection.js';
import { buildSchema } from './db/schema.js';

// Ensure schema exists (idempotent) before serving.
buildSchema(db());

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ---- Public ----
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: 'Invalid username or password' });
  res.json(result);
});

// ---- Authenticated below ----
app.use('/api', authMiddleware);

app.get('/api/me', (req, res) => res.json({ user: req.user }));

// Metadata that drives the entire frontend, filtered to what the role can read.
app.get('/api/meta', (req, res) => {
  const meta = publicMeta().map((m) => ({
    ...m,
    canRead: can(req.user, m.permissions.read),
    canWrite: !m.readOnly && can(req.user, m.permissions.write),
  }));
  res.json({ resources: meta, role: req.user.role });
});

// ---- KPI / Dashboard analytics ----
app.get('/api/analytics/summary', (req, res) => {
  const count = (t) => { try { return db().prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c; } catch { return 0; } };
  const countWhere = (t, w) => { try { return db().prepare(`SELECT COUNT(*) c FROM "${t}" WHERE ${w}`).get().c; } catch { return 0; } };

  const openNCR = countWhere('ncr', "status != 'Closed'");
  const openCAPA = countWhere('capa', "status != 'Closed'");
  const woActive = countWhere('work_orders', "status IN ('Released','In Progress')");
  const devReleased = countWhere('devices', "build_status = 'Released'");
  const overdueCal = countWhere('calibration', "status = 'Overdue' OR (next_cal IS NOT NULL AND next_cal < date('now'))");
  const inspections = db().prepare("SELECT result, COUNT(*) c FROM inspections GROUP BY result").all();
  const passed = inspections.find((i) => i.result === 'Pass')?.c || 0;
  const failed = inspections.find((i) => i.result === 'Fail')?.c || 0;
  const fpy = passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 100;

  res.json({
    kpis: {
      activeWorkOrders: woActive,
      devicesReleased: devReleased,
      openNCR, openCAPA,
      overdueCalibration: overdueCal,
      firstPassYield: fpy,
      openComplaints: countWhere('complaints', "status != 'Closed'"),
      suppliers: count('suppliers'),
    },
    counts: Object.fromEntries(resources.map((r) => [r.key, count(r.key)])),
  });
});

// NCR-by-source Pareto, CAPA status, WO status — for dashboard charts.
app.get('/api/analytics/charts', (req, res) => {
  const group = (t, col) => { try { return db().prepare(`SELECT "${col}" k, COUNT(*) v FROM "${t}" GROUP BY "${col}"`).all(); } catch { return []; } };
  res.json({
    ncrBySource: group('ncr', 'source'),
    ncrBySeverity: group('ncr', 'severity'),
    capaByStatus: group('capa', 'status'),
    woByStatus: group('work_orders', 'status'),
    devByStatus: group('devices', 'build_status'),
    inspectionByResult: group('inspections', 'result'),
  });
});

// Traceability spine — walk the chain for a device serial.
app.get('/api/trace/device/:serial', (req, res) => {
  const d = db().prepare('SELECT * FROM devices WHERE serial_number = ?').get(req.params.serial);
  if (!d) return res.status(404).json({ error: 'Serial not found' });
  const product = d.product_id ? db().prepare('SELECT * FROM products WHERE id = ?').get(d.product_id) : null;
  const wo = d.wo_number ? db().prepare('SELECT * FROM work_orders WHERE wo_number = ?').get(d.wo_number) : null;
  const inspections = db().prepare("SELECT * FROM inspections WHERE subject LIKE ? OR subject = ?").all(`%${d.serial_number}%`, d.wo_number || '');
  const ncrs = db().prepare('SELECT * FROM ncr WHERE subject LIKE ?').all(`%${d.serial_number}%`);
  const complaints = db().prepare('SELECT * FROM complaints WHERE serial_number = ?').all(d.serial_number);
  const udi = d.udi ? db().prepare('SELECT * FROM udi WHERE udi_di = ?').get(d.udi) : null;
  const materials = wo ? db().prepare(`SELECT m.* FROM materials m JOIN bom b ON b.material_id = m.id WHERE b.product_id = ?`).all(d.product_id) : [];
  res.json({ device: d, product, workOrder: wo, udi, inspections, ncrs, complaints, materials });
});

// ---- Auto-mount CRUD routers for every resource ----
for (const r of resources) {
  app.use(`/api/${r.key}`, makeRouter(r));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`VPMS API on http://localhost:${PORT}`));
