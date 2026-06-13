// Seeds a realistic ICU ventilator manufacturer dataset with full referential
// integrity along the traceability spine.
import { nanoid } from 'nanoid';
import { db as getDb } from './connection.js';
import { columnsFor } from './schema.js';
import { resourceMap } from '../registry/index.js';
import { hashPassword } from '../auth.js';

const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const now = () => new Date().toISOString();

export function seed() {
  const db = getDb();

  function insert(key, obj) {
    const resource = resourceMap[key];
    const cols = columnsFor(resource).map((f) => f.name);
    if (key === 'users') cols.push('password_hash');
    const id = obj.id || nanoid(12);
    const all = ['id', ...cols, 'created_at', 'updated_at', 'created_by', 'updated_by'];
    const data = { id, created_at: now(), updated_at: now(), created_by: 'seed', updated_by: 'seed' };
    for (const c of cols) {
      let v = obj[c];
      if (v === undefined) {
        const f = resource.fields.find((x) => x.name === c);
        v = f?.default ?? null;
      }
      if (typeof v === 'boolean') v = v ? 1 : 0;
      data[c] = v ?? null;
    }
    db.prepare(
      `INSERT INTO "${key}" (${all.map((c) => `"${c}"`).join(',')}) VALUES (${all.map((c) => `@${c}`).join(',')})`
    ).run(data);
    return id;
  }

  // ---- Users ----
  const users = [
    { username: 'admin', full_name: 'Alice Admin', email: 'admin@ventec.example', role: 'Admin', department: 'IT', password: 'admin123' },
    { username: 'quality', full_name: 'Quentin Quality', email: 'quality@ventec.example', role: 'Quality', department: 'Quality Assurance', password: 'quality123' },
    { username: 'production', full_name: 'Pat Production', email: 'production@ventec.example', role: 'Production', department: 'Manufacturing', password: 'prod123' },
    { username: 'operator', full_name: 'Olin Operator', email: 'operator@ventec.example', role: 'Operator', department: 'Assembly', password: 'oper123' },
    { username: 'viewer', full_name: 'Vera Viewer', email: 'viewer@ventec.example', role: 'Viewer', department: 'Audit', password: 'view123' },
  ];
  for (const u of users) insert('users', { ...u, active: true, password_hash: hashPassword(u.password) });

  // ---- Products ----
  const prodAcute = insert('products', { code: 'VX-900', name: 'AcuraVent X900 ICU Ventilator', class: 'Class IIb', type: 'Invasive ICU', status: 'Active', intended_use: 'Continuous mechanical ventilation for critically ill adult and pediatric patients in the ICU.' });
  const prodNIV = insert('products', { code: 'NV-300', name: 'AcuraVent N300 NIV', class: 'Class IIa', type: 'Non-Invasive (NIV)', status: 'Active', intended_use: 'Non-invasive ventilatory support for respiratory insufficiency.' });
  const prodNeo = insert('products', { code: 'NE-100', name: 'AcuraVent Neo100 Neonatal', class: 'Class IIb', type: 'Neonatal', status: 'Design', intended_use: 'Ventilation support for neonatal and infant patients.' });

  // ---- Suppliers ----
  const supTurbine = insert('suppliers', { code: 'SUP-001', name: 'AeroFlow Turbines GmbH', category: 'Critical', approved: true, score: 94, last_audit: daysFromNow(-120), status: 'Approved', contact: 'orders@aeroflow.example' });
  const supSensor = insert('suppliers', { code: 'SUP-002', name: 'PrecisionSense Inc.', category: 'Critical', approved: true, score: 88, last_audit: daysFromNow(-60), status: 'Approved', contact: 'sales@precisionsense.example' });
  const supValve = insert('suppliers', { code: 'SUP-003', name: 'PneumaValve Co.', category: 'Major', approved: true, score: 79, last_audit: daysFromNow(-200), status: 'Conditional', contact: 'support@pneumavalve.example' });
  const supPCB = insert('suppliers', { code: 'SUP-004', name: 'CircuitWorks Ltd.', category: 'Major', approved: false, score: 62, last_audit: daysFromNow(-30), status: 'Probation', contact: 'qa@circuitworks.example' });

  // ---- Materials ----
  const matTurbine = insert('materials', { part_number: 'PN-TURB-01', name: 'Brushless Blower Turbine', category: 'Pneumatic', supplier_id: supTurbine, lot_number: 'LOT-TB-2401', qty_on_hand: 120, uom: 'ea', min_qty: 20, location: 'WH-A1', status: 'Available' });
  const matFlow = insert('materials', { part_number: 'PN-FLOW-02', name: 'Hot-Wire Flow Sensor', category: 'Sensor', supplier_id: supSensor, lot_number: 'LOT-FS-2402', qty_on_hand: 14, uom: 'ea', min_qty: 25, location: 'WH-A2', status: 'Available' });
  const matO2 = insert('materials', { part_number: 'PN-O2S-03', name: 'O2 Concentration Sensor', category: 'Sensor', supplier_id: supSensor, lot_number: 'LOT-O2-2403', qty_on_hand: 60, uom: 'ea', min_qty: 15, location: 'WH-A2', status: 'Available' });
  const matValve = insert('materials', { part_number: 'PN-EXV-04', name: 'Proportional Exhalation Valve', category: 'Pneumatic', supplier_id: supValve, lot_number: 'LOT-EV-2404', qty_on_hand: 8, uom: 'ea', min_qty: 20, location: 'WH-B1', status: 'Quarantine' });
  const matPCB = insert('materials', { part_number: 'PN-PCB-05', name: 'Main Control PCBA', category: 'Electronic', supplier_id: supPCB, lot_number: 'LOT-PCB-2405', qty_on_hand: 40, uom: 'ea', min_qty: 10, location: 'WH-C1', status: 'Available' });
  const matFilter = insert('materials', { part_number: 'PN-FLT-06', name: 'Bacterial/Viral Filter (Sterile)', category: 'Sterile', supplier_id: supTurbine, lot_number: 'LOT-FLT-2406', qty_on_hand: 500, uom: 'ea', min_qty: 100, location: 'WH-Sterile', status: 'Available', expiry: daysFromNow(540) });

  // ---- BOM for X900 ----
  const bomLines = [
    { component: 'Blower Turbine Assembly', part_number: 'PN-TURB-01', material_id: matTurbine, qty: 1, critical: true },
    { component: 'Flow Sensor Module', part_number: 'PN-FLOW-02', material_id: matFlow, qty: 2, critical: true },
    { component: 'O2 Sensor', part_number: 'PN-O2S-03', material_id: matO2, qty: 1, critical: true },
    { component: 'Exhalation Valve', part_number: 'PN-EXV-04', material_id: matValve, qty: 1, critical: true },
    { component: 'Main Control Board', part_number: 'PN-PCB-05', material_id: matPCB, qty: 1, critical: true },
    { component: 'Patient Circuit Filter', part_number: 'PN-FLT-06', material_id: matFilter, qty: 2, critical: false },
  ];
  bomLines.forEach((b, i) => insert('bom', { product_id: prodAcute, level: 1, revision: 'C', uom: 'ea', ...b }));

  insert('dmr', { product_id: prodAcute, title: 'DMR — AcuraVent X900', revision: 'C', status: 'Approved', specifications: 'Tidal volume 20–2000 mL; PEEP 0–35 cmH2O; FiO2 21–100%; modes A/C, SIMV, PSV.', process_refs: 'Routing RT-X900; WI-ASSY-01..09; Final Test FT-X900.', approved_by: 'Quentin Quality', signature: 'Q.Quality / 2026-05-01' });

  // ---- UDI ----
  const udi900 = insert('udi', { udi_di: '08901234567890', product_id: prodAcute, issuing_agency: 'GS1', gmdn: '36009', package_level: 'Unit', status: 'Active' });
  insert('udi', { udi_di: '08901234567906', product_id: prodNIV, issuing_agency: 'GS1', gmdn: '34841', package_level: 'Unit', status: 'Active' });

  // ---- Routing for X900 ----
  const routing = [
    { seq: 10, operation: 'Mechanical sub-assembly', station: 'Line 1 / ST-10', std_time_min: 45 },
    { seq: 20, operation: 'Pneumatic block assembly', station: 'Line 1 / ST-20', std_time_min: 60, inspection_required: true },
    { seq: 30, operation: 'PCBA integration & wiring', station: 'Line 1 / ST-30', std_time_min: 40 },
    { seq: 40, operation: 'Software flashing & config', station: 'Line 1 / ST-40', std_time_min: 25 },
    { seq: 50, operation: 'Functional & safety test', station: 'Test Bench', std_time_min: 90, inspection_required: true },
    { seq: 60, operation: 'Final inspection & release', station: 'QA Release', std_time_min: 30, inspection_required: true },
  ];
  routing.forEach((s) => insert('routings', { product_id: prodAcute, instructions: `Refer to WI for ${s.operation}. Follow ESD & cleanliness controls.`, ...s }));

  // ---- Work Orders ----
  const wo1 = insert('work_orders', { wo_number: 'WO-2601', product_id: prodAcute, qty: 25, priority: 'High', status: 'In Progress', planned_start: daysFromNow(-10), planned_end: daysFromNow(5), line: 'Line 1', notes: 'Q2 ICU order — Hospital Group A.' });
  const wo2 = insert('work_orders', { wo_number: 'WO-2602', product_id: prodNIV, qty: 40, priority: 'Normal', status: 'Released', planned_start: daysFromNow(-2), planned_end: daysFromNow(12), line: 'Line 2' });
  const wo3 = insert('work_orders', { wo_number: 'WO-2603', product_id: prodAcute, qty: 10, priority: 'Rush', status: 'Planned', planned_start: daysFromNow(3), planned_end: daysFromNow(14), line: 'Clean Room A' });

  // ---- Schedule ----
  insert('schedule', { title: 'WO-2601 X900 build', wo_number: 'WO-2601', resource: 'Line 1', start: daysFromNow(-10), end: daysFromNow(5), capacity_pct: 90 });
  insert('schedule', { title: 'WO-2602 N300 build', wo_number: 'WO-2602', resource: 'Line 2', start: daysFromNow(-2), end: daysFromNow(12), capacity_pct: 75 });
  insert('schedule', { title: 'WO-2603 X900 rush', wo_number: 'WO-2603', resource: 'Clean Room A', start: daysFromNow(3), end: daysFromNow(14), capacity_pct: 100 });

  // ---- Devices (DHR) ----
  const serials = ['X900-260001', 'X900-260002', 'X900-260003'];
  const dev1 = insert('devices', { serial_number: serials[0], product_id: prodAcute, wo_number: 'WO-2601', lot_number: 'LOT-X900-2601', build_status: 'Released', udi: '08901234567890', built_on: daysFromNow(-6), released_on: daysFromNow(-4), release_signature: 'Q.Quality / 2026-06-09', genealogy: 'Turbine LOT-TB-2401; Flow LOT-FS-2402; PCBA LOT-PCB-2405; Filter LOT-FLT-2406.' });
  insert('devices', { serial_number: serials[1], product_id: prodAcute, wo_number: 'WO-2601', lot_number: 'LOT-X900-2601', build_status: 'In Test', udi: '08901234567890', built_on: daysFromNow(-3), genealogy: 'Turbine LOT-TB-2401; Flow LOT-FS-2402; PCBA LOT-PCB-2405.' });
  insert('devices', { serial_number: serials[2], product_id: prodAcute, wo_number: 'WO-2601', lot_number: 'LOT-X900-2601', build_status: 'Quarantined', udi: '08901234567890', built_on: daysFromNow(-2), genealogy: 'Exhalation valve from quarantined LOT-EV-2404 — pending NCR disposition.' });

  // ---- Shop floor ----
  insert('shopfloor', { wo_number: 'WO-2601', station: 'Line 1 / ST-20', operator: 'Olin Operator', operation: 'Pneumatic block assembly', status: 'Completed', start_ts: now(), end_ts: now(), qty_good: 24, qty_scrap: 1 });
  insert('shopfloor', { wo_number: 'WO-2601', station: 'Test Bench', operator: 'Olin Operator', operation: 'Functional & safety test', status: 'Started', start_ts: now(), qty_good: 0, qty_scrap: 0 });

  // ---- Inspections ----
  insert('inspections', { ref: 'INC-2601', stage: 'Incoming', subject: 'LOT-EV-2404', product_id: prodAcute, inspector: 'Quentin Quality', sample_size: 8, defects: 2, result: 'Fail', date: daysFromNow(-8), signature: 'Q.Quality', notes: 'Valve seat leakage exceeds spec on 2/8 units. Lot quarantined.' });
  insert('inspections', { ref: 'IP-2601', stage: 'In-Process', subject: 'WO-2601', product_id: prodAcute, inspector: 'Quentin Quality', sample_size: 25, defects: 1, result: 'Pass', date: daysFromNow(-5), signature: 'Q.Quality' });
  insert('inspections', { ref: 'FIN-2601', stage: 'Final', subject: 'X900-260001', product_id: prodAcute, inspector: 'Quentin Quality', sample_size: 1, defects: 0, result: 'Pass', date: daysFromNow(-4), signature: 'Q.Quality', notes: 'All functional & safety tests passed. Released.' });

  // ---- CAPA + NCR (linked) ----
  const capa1 = insert('capa', { capa_number: 'CAPA-2601', type: 'Corrective', source: 'NCR', title: 'Exhalation valve seat leakage from PneumaValve', problem_statement: 'Incoming lot LOT-EV-2404 failed leak test (2/8).', root_cause: 'Supplier process drift in valve seat molding; insufficient incoming acceptance sampling.', action_plan: '1) Quarantine & RTV lot. 2) Tighten AQL. 3) Supplier corrective action + re-audit PneumaValve.', owner: 'Quentin Quality', due_date: daysFromNow(20), status: 'Action', signature: 'Q.Quality' });
  insert('ncr', { ncr_number: 'NCR-2601', date: daysFromNow(-8), source: 'Incoming', product_id: prodAcute, subject: 'LOT-EV-2404 / X900-260003', qty: 8, severity: 'Major', description: 'Proportional exhalation valve seat leakage beyond specification on incoming inspection.', disposition: 'Return to Supplier', capa_id: 'CAPA-2601', status: 'Dispositioned', signature: 'Q.Quality' });
  insert('ncr', { ncr_number: 'NCR-2602', date: daysFromNow(-5), source: 'In-Process', product_id: prodAcute, subject: 'WO-2601', qty: 1, severity: 'Minor', description: 'Cosmetic enclosure scratch found during assembly.', disposition: 'Rework', status: 'Closed' });

  // ---- Complaints + Adverse events ----
  insert('complaints', { complaint_number: 'CMP-2601', date_received: daysFromNow(-15), customer: 'Hospital Group A', product_id: prodAcute, serial_number: serials[0], description: 'Intermittent low-pressure alarm reported during transport mode.', reportable: false, investigation: 'Unable to reproduce; suspected circuit disconnection at bedside. Advised user training.', status: 'Closed' });
  insert('adverse_events', { event_number: 'AE-2601', date: daysFromNow(-40), product_id: prodAcute, serial_number: serials[0], event_type: 'Malfunction', description: 'Device entered safe-state during power transient; no patient harm.', authority: 'Not Reportable', status: 'Closed' });

  // ---- Risk / FMEA ----
  insert('risks', { product_id: prodAcute, item: 'Loss of ventilation (turbine stall)', cause: 'Turbine bearing failure', effect: 'Hypoxia / patient harm', severity: 5, occurrence: 2, detection: 2, mitigation: 'Redundant pressure monitoring + audible alarm + battery backup.', residual: 'Acceptable' });
  insert('risks', { product_id: prodAcute, item: 'Incorrect FiO2 delivery', cause: 'O2 sensor drift', effect: 'Hyperoxia / hypoxia', severity: 4, occurrence: 2, detection: 3, mitigation: 'Two-point calibration on startup; drift alarm.', residual: 'ALARP' });
  insert('risks', { product_id: prodAcute, item: 'Exhalation valve leak', cause: 'Valve seat defect', effect: 'Loss of PEEP', severity: 4, occurrence: 3, detection: 2, mitigation: 'Incoming leak test + in-line pressure feedback.', residual: 'ALARP' });

  // ---- Validation ----
  insert('validations', { protocol: 'PV-X900-OQ', process: 'Functional Test Bench FT-X900', phase: 'OQ', acceptance: 'All measured parameters within ±2% across operating range over 30 runs.', result: 'Pass', executed_by: 'Quentin Quality', date: daysFromNow(-90), signature: 'Q.Quality' });
  insert('validations', { protocol: 'PV-CR-PQ', process: 'Clean Room A particle count', phase: 'PQ', acceptance: 'ISO 8 cleanliness sustained over 3 consecutive days.', result: 'In Progress', executed_by: 'Pat Production', date: daysFromNow(-5) });

  // ---- Calibration ----
  insert('calibration', { equipment: 'Flow Analyzer FA-2000', asset_id: 'CAL-001', last_cal: daysFromNow(-300), next_cal: daysFromNow(65), interval_days: 365, result: 'Pass', performed_by: 'External Lab', status: 'In Service' });
  insert('calibration', { equipment: 'Pressure Calibrator PC-50', asset_id: 'CAL-002', last_cal: daysFromNow(-400), next_cal: daysFromNow(-35), interval_days: 365, result: 'Pass', performed_by: 'External Lab', status: 'Overdue' });
  insert('calibration', { equipment: 'O2 Gas Reference Cell', asset_id: 'CAL-003', last_cal: daysFromNow(-180), next_cal: daysFromNow(185), interval_days: 365, result: 'Pass', performed_by: 'In-house Metrology', status: 'In Service' });

  // ---- Maintenance ----
  insert('maintenance', { equipment: 'Test Bench Compressor', asset_id: 'EQ-101', task: 'Filter & seal inspection', frequency: 'Monthly', last_done: daysFromNow(-20), next_due: daysFromNow(10), status: 'Scheduled', technician: 'Pat Production' });
  insert('maintenance', { equipment: 'Clean Room HVAC', asset_id: 'EQ-102', task: 'HEPA filter check', frequency: 'Quarterly', last_done: daysFromNow(-100), next_due: daysFromNow(-10), status: 'Overdue', technician: 'Facilities' });

  // ---- Audits / Mgmt review / Training ----
  insert('audits', { audit_number: 'IA-2601', scope: 'Production & Process Controls (§7.5)', standard: 'ISO 13485', auditor: 'Quentin Quality', date: daysFromNow(-45), findings: '1 minor: routing rev not signed. 0 major.', nc_count: 1, status: 'Closed' });
  insert('audits', { audit_number: 'IA-2602', scope: 'Purchasing & Supplier Controls (§7.4)', standard: 'Both', auditor: 'External', date: daysFromNow(7), findings: '', nc_count: 0, status: 'Planned' });
  insert('management_review', { title: 'Q1 2026 Management Review', date: daysFromNow(-30), attendees: 'CEO, QA Mgr, Prod Mgr, RA', inputs: 'Audit results, CAPA status, complaints, supplier performance.', outputs: 'Approve PneumaValve corrective action; invest in second flow-sensor source.', actions: 'Dual-source flow sensor by Q3; close CAPA-2601.', signature: 'A.Admin' });
  insert('training', { employee: 'Olin Operator', department: 'Assembly', course: 'WI-ASSY-01 Pneumatic Assembly', doc_id: 'SOP-001', completed_on: daysFromNow(-60), expires_on: daysFromNow(305), result: 'Competent', trainer: 'Pat Production' });
  insert('training', { employee: 'Pat Production', department: 'Manufacturing', course: 'ISO 13485 Awareness', completed_on: daysFromNow(-200), expires_on: daysFromNow(-10), result: 'Competent', trainer: 'Quentin Quality' });

  // ---- SPC ----
  const spcBase = [24.8, 25.1, 24.9, 25.3, 25.0, 24.7, 25.2, 24.95, 25.05, 24.85];
  spcBase.forEach((v, i) => insert('spc', { characteristic: 'PEEP accuracy (cmH2O @ 25 set)', product_id: prodAcute, subgroup: i + 1, value: v, lsl: 24, usl: 26, date: daysFromNow(-10 + i), operator: 'Olin Operator' }));

  // ---- Documents ----
  insert('documents', { doc_number: 'QM-001', title: 'Quality Manual', type: 'Quality Manual', revision: 'D', status: 'Released', owner: 'Quentin Quality', effective_date: daysFromNow(-200), review_date: daysFromNow(165), signature: 'A.Admin' });
  insert('documents', { doc_number: 'SOP-001', title: 'Control of Production & Process', type: 'SOP', revision: 'B', status: 'Released', owner: 'Pat Production', effective_date: daysFromNow(-150), review_date: daysFromNow(215) });
  insert('documents', { doc_number: 'SOP-014', title: 'CAPA Procedure', type: 'SOP', revision: 'A', status: 'In Review', owner: 'Quentin Quality', effective_date: daysFromNow(-5), review_date: daysFromNow(360) });

  // ---- Purchase orders + receiving ----
  const po1 = insert('purchase_orders', { po_number: 'PO-2601', supplier_id: supSensor, material_id: matFlow, qty: 50, unit_price: 42.5, order_date: daysFromNow(-12), due_date: daysFromNow(3), status: 'Sent' });
  insert('purchase_orders', { po_number: 'PO-2602', supplier_id: supValve, material_id: matValve, qty: 30, unit_price: 88.0, order_date: daysFromNow(-9), due_date: daysFromNow(6), status: 'Approved' });
  insert('receiving', { grn_number: 'GRN-2601', po_number: 'PO-2602', supplier_id: supValve, material_id: matValve, lot_number: 'LOT-EV-2404', qty_received: 30, received_on: daysFromNow(-8), inspection_ref: 'INC-2601', status: 'Rejected' });

  // ---- Templates (placeholders) ----
  insert('templates', { name: 'Device History Record', category: 'Form', module: 'devices', version: '1.0', status: 'Placeholder', body: '— Placeholder DHR template. Replace with your controlled DHR form. —', notes: 'Update with company-controlled template.' });
  insert('templates', { name: 'Certificate of Conformance', category: 'Certificate', module: 'devices', version: '1.0', status: 'Placeholder', body: '— Placeholder CoC. Replace with controlled certificate. —' });
  insert('templates', { name: 'CAPA Report', category: 'Report', module: 'capa', version: '1.0', status: 'Placeholder', body: '— Placeholder CAPA report template. —' });
  insert('templates', { name: 'UDI Label', category: 'Label', module: 'udi', version: '1.0', status: 'Placeholder', body: '— Placeholder UDI label (GS1). —' });

  // ---- Notifications / tasks ----
  insert('notifications', { title: 'CAPA-2601 action due', kind: 'Task', assignee: 'Quentin Quality', due_date: daysFromNow(20), priority: 'High', status: 'Open', link: 'capa/CAPA-2601' });
  insert('notifications', { title: 'Pressure Calibrator PC-50 OVERDUE', kind: 'Alert', assignee: 'Pat Production', due_date: daysFromNow(-35), priority: 'Critical', status: 'Open', link: 'calibration/CAL-002' });
  insert('notifications', { title: 'Flow sensor stock below minimum', kind: 'Alert', assignee: 'Pat Production', due_date: today(), priority: 'High', status: 'Open', link: 'materials/PN-FLOW-02' });
  insert('notifications', { title: 'SOP-014 awaiting approval', kind: 'Approval', assignee: 'Alice Admin', due_date: daysFromNow(2), priority: 'Medium', status: 'Open', link: 'documents/SOP-014' });

  console.log('Seed complete.');
}
