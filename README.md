# VentVerse — ICU Ventilator Production Management System

A state-of-the-art production & quality management platform for an **ICU
ventilator manufacturing** company, engineered for full **ISO 13485** and
**ISO 9001** compliance (with ISO 14971 risk management and 21 CFR Part 11
style electronic records & signatures).

> **Status: Proof of Concept.** The architecture is production-grade and
> metadata-driven; templates are placeholders ready for your controlled
> documents, and the database is a local SQLite file seeded with realistic
> demo data.

---

## Quick start

```bash
npm install        # install client + server (workspaces)
npm run db:reset   # build schema + seed demo data (creates server/data.sqlite)
npm run dev        # starts API (:4000) and web app (:5173) together
```

Then open **http://localhost:5173** and sign in with a demo account.

### Demo accounts (password-protected, role-based)

| Username     | Password     | Role       | Sees                                   |
|--------------|--------------|------------|----------------------------------------|
| `admin`      | `admin123`   | Admin      | Everything incl. user management       |
| `quality`    | `quality123` | Quality    | All QMS / compliance modules           |
| `production` | `prod123`    | Production | Production, supply chain, read quality |
| `operator`   | `oper123`    | Operator   | Shop floor + read access               |
| `viewer`     | `view123`    | Viewer     | Read-only across permitted modules     |

---

## Architecture

A **metadata-driven** monorepo: every module is declared once as a *resource*
schema, and that single declaration drives the database table, the REST API,
and the entire UI (tables, forms, permissions, ISO clause tagging).

```
/server   Express + better-sqlite3 — auth (JWT/bcrypt), RBAC, audit trail,
          generic CRUD engine, analytics & traceability endpoints
          src/registry/*  <- the single source of truth (all modules)
/client   React + TypeScript + Vite + Tailwind — shared design system + pages
```

### Foundation design system (built once, reused everywhere)

- **DataTable** — text-wrap per cell, per-column resize, drag-to-reorder,
  show/hide columns, column pinning, sticky header, configurable
  *rows-before-scroll*, adjustable table width (fit/full), sort, global +
  per-column search, density toggle, CSV export, and **per-user saved views**
  (persisted in `localStorage`).
- **Form system** — schema-driven inputs, validation, reference pickers,
  and **electronic signatures**.
- **KPI cards & Dashboard** — RAG KPIs plus bar / Pareto / pie / SPC control
  charts (Recharts).
- **Security** — user management, password login, **RBAC** with per-role read
  & write scoping enforced on the API.
- **Themes** — light / dark / high-contrast modes x 7 accent palettes,
  persisted per user.
- **Audit trail & e-signatures** — every create/update/delete is logged
  immutably (ISO 13485 §4.2.5 / 21 CFR Part 11).
- **Templates** — placeholder registry; an *"Update Template"* surface so your
  real controlled templates plug in later.

### Modules

- **Production** — Product Models, BOM, Device Master Record (DMR), Work
  Orders, Routing & Work Instructions, Shop Floor Control, Device History
  Record (DHR), UDI Registry, Production Schedule.
- **Quality & Compliance** — Document Control, Inspections
  (Incoming/In-Process/Final/Release), NCR, CAPA, Complaints, Adverse Events
  (MDR/Vigilance), Risk/FMEA (ISO 14971), Process Validation (IQ/OQ/PQ),
  Calibration, Preventive Maintenance, Internal Audits, Management Review,
  Training & Competence, SPC.
- **Supply Chain** — Suppliers (ASL + scorecards), Inventory/Materials,
  Purchase Orders, Goods Receiving.
- **Administration** — Users, Audit Trail, Templates, Notifications & Tasks.

### Traceability spine (ISO 13485 §7.5.9)

Supplier → Material Lot → Goods Receipt → Incoming Inspection → Work Order →
**DHR (serial)** → Final Release → UDI. The **Traceability** screen walks the
full chain for any serial number (try `X900-260001`).

---

## Useful scripts

| Command                | Description                                   |
|------------------------|-----------------------------------------------|
| `npm run dev`          | Run API + web app together                    |
| `npm run dev:server`   | API only (http://localhost:4000)              |
| `npm run dev:client`   | Web app only (http://localhost:5173)          |
| `npm run db:reset`     | Drop, rebuild and reseed the database         |
| `npm run build`        | Production build of the web app               |

## Notes & next steps

- Templates are intentionally **placeholders** — upload your controlled forms,
  certificates and labels via the Templates module.
- SQLite keeps the POC zero-config; the data layer is isolated so a swap to
  PostgreSQL is straightforward.
- Roadmap hooks already scoped: barcode/QR scanning, PWA/offline, AI-assisted
  NCR triage, multi-site & multi-language.
