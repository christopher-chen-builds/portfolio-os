'use strict';

const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'portfolio.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sector TEXT,
    investment_date TEXT,
    ownership_pct REAL,
    cost_basis REAL,
    current_valuation REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    period TEXT NOT NULL,
    arr REAL,
    arr_growth_pct REAL,
    nrr REAL,
    churn_pct REAL,
    burn REAL,
    runway_months REAL,
    gross_margin_pct REAL,
    team_size INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    period TEXT NOT NULL,
    arr REAL,
    arr_growth_pct REAL,
    nrr REAL,
    churn_pct REAL,
    burn REAL,
    runway_months REAL,
    gross_margin_pct REAL,
    team_size INTEGER,
    UNIQUE(company_id, period),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    metric_id INTEGER,
    period TEXT NOT NULL,
    flag_level TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    variance_pct REAL,
    state TEXT DEFAULT 'open',
    acknowledged_at TEXT,
    resolved_at TEXT,
    resolution_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (metric_id) REFERENCES metrics(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed data — check if already seeded
const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('chris@chrischen.com');
if (!existingUser) {
  // Seed user
  const hashedPassword = bcrypt.hashSync('portfolio2026', 10);
  db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(
    'chris@chrischen.com',
    hashedPassword,
    'Chris Chen'
  );

  // Seed demo company: ExampleCo
  const companyInsert = db.prepare(`
    INSERT INTO companies (name, sector, investment_date, ownership_pct, cost_basis, current_valuation)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = companyInsert.run(
    'ExampleCo',
    'B2B SaaS',
    '2024-01-15',
    75.0,
    2000000,
    8000000
  );
  const companyId = result.lastInsertRowid;

  // Current period = ISO week of June 6, 2026
  // June 2026: Jan 1 is Thursday → week 1 starts Dec 29, 2025
  // June 6 is a Saturday → it's in week 23
  const currentPeriod = '2026-W23';

  // Seed plan for current period (values to hit)
  const planInsert = db.prepare(`
    INSERT INTO plans (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  planInsert.run(companyId, currentPeriod, 5200000, 15, 115, 3.5, 480000, 8, 68, 45);

  // Also seed plan for prior period (2026-W22)
  const priorPeriod = '2026-W22';
  db.prepare(`
    INSERT INTO plans (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, priorPeriod, 5000000, 14, 112, 3.0, 460000, 9, 67, 43);

  // Seed metrics for prior period (2026-W22) — slightly off plan to show yellow flags
  // ARR $5.1M vs plan $5.0M → +2% (below 5% yellow, OK)
  // ARR Growth -2% vs plan 14% → YELLOW
  // NRR 98% vs plan 112% → YELLOW (below 100%)
  // Churn 6% vs plan 3% → YELLOW (> 5%)
  // Burn $495K vs plan $460K → +7.6% (below 10%, OK)
  // Runway 5 months vs plan 9 → YELLOW (< 6)
  // GM 63% vs plan 67% → -4pp (below 5pp, OK)
  // Team 40 vs plan 43 → YELLOW (decrease)
  db.prepare(`
    INSERT INTO metrics (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, priorPeriod, 5100000, -2, 98, 6, 495000, 5, 63, 40,
    'Q1 close slower than expected. Sales cycle elongation in mid-market segment.');

  // Seed current period metrics (2026-W23) — more misses to trigger RED alerts
  // ARR $5.2M vs plan $5.2M → OK
  // ARR Growth -5% vs plan 15% → RED (< -10%? No, -5% is > -10%, so YELLOW)
  // NRR 92% vs plan 115% → YELLOW (below 100%)
  // Churn 7% vs plan 3.5% → YELLOW (> 5%)
  // Burn $570K vs plan $480K → +18.75% → RED (> 15% is yellow, > 25% is red... 18.75% is YELLOW)
  // Runway 2.5 months vs plan 8 → RED (< 3)
  // GM 58% vs plan 68% → -10pp → YELLOW (below 5pp yellow, below 50% red... 58% is YELLOW)
  // Team 38 vs prior 40 → YELLOW (decrease)
  // The RED flags for current period:
  // - ARR Growth -15% vs plan 15% → RED (< -10%)
  // - Runway 2.5 months → RED (< 3)
  db.prepare(`
    INSERT INTO metrics (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, currentPeriod, 5200000, -5, 92, 7, 570000, 2.5, 58, 38,
    'Two large customers in jeopardy. Burn elevated due to delayed receipts. Accelerating collections.');

  // Now create alerts for the prior period metrics (W22) — yellows
  const priorMetrics = db.prepare('SELECT id FROM metrics WHERE company_id = ? AND period = ?').get(companyId, priorPeriod);
  const plan22 = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, priorPeriod);
  const metrics22 = db.prepare('SELECT * FROM metrics WHERE company_id = ? AND period = ?').get(companyId, priorPeriod);

  function pct(actual, planVal) {
    if (planVal == null || planVal === 0) return null;
    return ((actual - planVal) / Math.abs(planVal)) * 100;
  }

  const yellowAlerts22 = [];
  if (metrics22.arr_growth_pct !== null && plan22.arr_growth_pct !== null && metrics22.arr_growth_pct < 0) {
    yellowAlerts22.push({ metric_name: 'arr_growth_pct', variance_pct: pct(metrics22.arr_growth_pct, plan22.arr_growth_pct), flag_level: 'yellow' });
  }
  if (metrics22.nrr !== null && plan22.nrr !== null && metrics22.nrr < 100) {
    yellowAlerts22.push({ metric_name: 'nrr', variance_pct: pct(metrics22.nrr, plan22.nrr), flag_level: 'yellow' });
  }
  if (metrics22.churn_pct !== null && plan22.churn_pct !== null && metrics22.churn_pct > 5) {
    yellowAlerts22.push({ metric_name: 'churn_pct', variance_pct: pct(metrics22.churn_pct, plan22.churn_pct), flag_level: 'yellow' });
  }
  if (metrics22.runway_months !== null && plan22.runway_months !== null && metrics22.runway_months < 6) {
    yellowAlerts22.push({ metric_name: 'runway_months', variance_pct: pct(metrics22.runway_months, plan22.runway_months), flag_level: 'yellow' });
  }
  // Team size decrease from prior period
  const priorPriorMetrics = db.prepare('SELECT team_size FROM metrics WHERE company_id = ? AND period < ? ORDER BY period DESC LIMIT 1').get(companyId, priorPeriod);
  if (priorPriorMetrics && metrics22.team_size != null && priorPriorMetrics.team_size != null && metrics22.team_size < priorPriorMetrics.team_size) {
    yellowAlerts22.push({ metric_name: 'team_size', variance_pct: -((priorPriorMetrics.team_size - metrics22.team_size) / priorPriorMetrics.team_size * 100), flag_level: 'yellow' });
  }

  const alertInsert = db.prepare(`
    INSERT INTO alerts (company_id, metric_id, period, flag_level, metric_name, variance_pct, state)
    VALUES (?, ?, ?, ?, ?, ?, 'open')
  `);
  for (const a of yellowAlerts22) {
    alertInsert.run(companyId, priorMetrics.id, priorPeriod, a.flag_level, a.metric_name, a.variance_pct);
  }

  // Create alerts for current period (W23) — mix of YELLOW and RED
  const currentMetrics = db.prepare('SELECT id FROM metrics WHERE company_id = ? AND period = ?').get(companyId, currentPeriod);
  const plan23 = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, currentPeriod);
  const metrics23 = db.prepare('SELECT * FROM metrics WHERE company_id = ? AND period = ?').get(companyId, currentPeriod);

  const alerts23 = [];
  if (metrics23.arr_growth_pct !== null && plan23.arr_growth_pct !== null) {
    const v = pct(metrics23.arr_growth_pct, plan23.arr_growth_pct);
    if (metrics23.arr_growth_pct < -10) {
      alerts23.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'red' });
    } else if (metrics23.arr_growth_pct < 0) {
      alerts23.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'yellow' });
    }
  }
  if (metrics23.nrr !== null && plan23.nrr !== null && metrics23.nrr < 100) {
    const v = pct(metrics23.nrr, plan23.nrr);
    alerts23.push({ metric_name: 'nrr', variance_pct: v, flag_level: metrics23.nrr < 85 ? 'red' : 'yellow' });
  }
  if (metrics23.churn_pct !== null && plan23.churn_pct !== null && metrics23.churn_pct > 5) {
    const v = pct(metrics23.churn_pct, plan23.churn_pct);
    alerts23.push({ metric_name: 'churn_pct', variance_pct: v, flag_level: metrics23.churn_pct > 10 ? 'red' : 'yellow' });
  }
  if (metrics23.burn !== null && plan23.burn !== null) {
    const v = pct(metrics23.burn, plan23.burn);
    if (v > 25) alerts23.push({ metric_name: 'burn', variance_pct: v, flag_level: 'red' });
    else if (v > 10) alerts23.push({ metric_name: 'burn', variance_pct: v, flag_level: 'yellow' });
  }
  if (metrics23.runway_months !== null && metrics23.runway_months < 3) {
    alerts23.push({ metric_name: 'runway_months', variance_pct: pct(metrics23.runway_months, plan23.runway_months), flag_level: 'red' });
  } else if (metrics23.runway_months !== null && metrics23.runway_months < 6) {
    alerts23.push({ metric_name: 'runway_months', variance_pct: pct(metrics23.runway_months, plan23.runway_months), flag_level: 'yellow' });
  }
  if (metrics23.gross_margin_pct !== null && plan23.gross_margin_pct !== null) {
    const v = pct(metrics23.gross_margin_pct, plan23.gross_margin_pct);
    if (metrics23.gross_margin_pct < 50) {
      alerts23.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'red' });
    } else if (v < -5) {
      alerts23.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'yellow' });
    }
  }
  if (metrics23.team_size != null && metrics22.team_size != null && metrics23.team_size < metrics22.team_size) {
    alerts23.push({ metric_name: 'team_size', variance_pct: -((metrics22.team_size - metrics23.team_size) / metrics22.team_size * 100), flag_level: 'yellow' });
  }

  for (const a of alerts23) {
    alertInsert.run(companyId, currentMetrics.id, currentPeriod, a.flag_level, a.metric_name, a.variance_pct);
  }
}

module.exports = db;