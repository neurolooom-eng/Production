// Google Sheets storage adapter. Each resource is a worksheet (tab); each
// record is a row; the first row is the header (column names). Uses a service
// account and a write-through in-memory cache so reads are instant and the
// Sheets API isn't hammered (it has strict per-minute quotas).
//
// Activated when STORAGE=sheets. Requires:
//   GOOGLE_SHEET_ID                 the target spreadsheet id
//   GOOGLE_SERVICE_ACCOUNT_JSON     service-account key (JSON string)  OR
//   GOOGLE_APPLICATION_CREDENTIALS  path to the key file
// The spreadsheet must be shared (Editor) with the service-account email.
import { google } from 'googleapis';
import { ALL_KEYS, columnNames, typeRow, colLetter } from './util.js';

export class SheetsStore {
  constructor() {
    this.kind = 'sheets';
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.cache = {};       // key -> array of typed row objects (sheet order)
    this.sheetIds = {};    // tab title -> numeric sheetId
    if (!this.spreadsheetId) throw new Error('GOOGLE_SHEET_ID is required when STORAGE=sheets');
  }

  _auth() {
    const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (raw) return new google.auth.GoogleAuth({ credentials: JSON.parse(raw), scopes });
    return new google.auth.GoogleAuth({ scopes }); // falls back to GOOGLE_APPLICATION_CREDENTIALS
  }

  async init() {
    const auth = await this._auth().getClient();
    this.api = google.sheets({ version: 'v4', auth });

    const meta = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    for (const s of meta.data.sheets || []) this.sheetIds[s.properties.title] = s.properties.sheetId;

    // Ensure a tab + header row exists for every resource.
    const addRequests = [];
    for (const key of ALL_KEYS) {
      if (!(key in this.sheetIds)) addRequests.push({ addSheet: { properties: { title: key } } });
    }
    if (addRequests.length) {
      const res = await this.api.spreadsheets.batchUpdate({ spreadsheetId: this.spreadsheetId, requestBody: { requests: addRequests } });
      for (const r of res.data.replies || []) {
        if (r.addSheet) this.sheetIds[r.addSheet.properties.title] = r.addSheet.properties.sheetId;
      }
    }

    // Load all tabs, writing missing headers.
    for (const key of ALL_KEYS) {
      const header = columnNames(key);
      const range = `'${key}'!A1:${colLetter(header.length - 1)}`;
      const resp = await this.api.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range });
      const rows = resp.data.values || [];
      if (rows.length === 0) {
        await this.api.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId, range: `'${key}'!A1`, valueInputOption: 'RAW',
          requestBody: { values: [header] },
        });
        this.cache[key] = [];
        continue;
      }
      const head = rows[0];
      this.cache[key] = rows.slice(1).map((arr) => {
        const obj = {};
        head.forEach((h, i) => { obj[h] = arr[i] ?? null; });
        return typeRow(key, obj);
      });
    }
    console.log(`Google Sheets store ready (${Object.keys(this.sheetIds).length} tabs).`);
  }

  async isEmpty(key) { return (this.cache[key] || []).length === 0; }
  async list(key) { return [...(this.cache[key] || [])].reverse(); } // newest-first like SQLite
  async get(key, id) { return (this.cache[key] || []).find((r) => r.id === id) || null; }

  _rowValues(key, row) {
    return columnNames(key).map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return '';
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
  }

  async insert(key, row) {
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId, range: `'${key}'!A1`,
      valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [this._rowValues(key, row)] },
    });
    const typed = typeRow(key, row);
    (this.cache[key] ||= []).push(typed);
    return typed;
  }

  async bulkInsert(key, rows) {
    if (!rows.length) return;
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId, range: `'${key}'!A1`,
      valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows.map((r) => this._rowValues(key, r)) },
    });
    (this.cache[key] ||= []).push(...rows.map((r) => typeRow(key, r)));
  }

  async update(key, id, patch) {
    const arr = this.cache[key] || [];
    const idx = arr.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    const merged = typeRow(key, { ...arr[idx], ...patch });
    arr[idx] = merged;
    const header = columnNames(key);
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `'${key}'!A${idx + 2}:${colLetter(header.length - 1)}${idx + 2}`,
      valueInputOption: 'RAW', requestBody: { values: [this._rowValues(key, merged)] },
    });
    return merged;
  }

  async remove(key, id) {
    const arr = this.cache[key] || [];
    const idx = arr.findIndex((r) => r.id === id);
    if (idx < 0) return;
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [{ deleteDimension: { range: {
        sheetId: this.sheetIds[key], dimension: 'ROWS', startIndex: idx + 1, endIndex: idx + 2,
      } } }] },
    });
    arr.splice(idx, 1);
  }

  async clearAll() {
    for (const key of ALL_KEYS) {
      const header = columnNames(key);
      await this.api.spreadsheets.values.clear({ spreadsheetId: this.spreadsheetId, range: `'${key}'` });
      await this.api.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId, range: `'${key}'!A1`, valueInputOption: 'RAW',
        requestBody: { values: [header] },
      });
      this.cache[key] = [];
    }
  }
}
