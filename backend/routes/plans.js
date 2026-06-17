'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database');

// GET /api/companies/:id/plans — all plan values for a company
router.get('/', (req, res) => {
  const plans = db.prepare(
    'SELECT * FROM plans WHERE company_id = ? ORDER BY period DESC'
  ).all(req.params.id);
  res.json(plans);
});

// POST /api/companies/:id/plans — set plan for a period
router.post('/', (req, res) => {
  const companyId = parseInt(req.params.id);
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const { period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size } = req.body;
  if (!period) return res.status(400).json({ error: 'Period is required' });

  // Upsert (replace if exists)
  const existing = db.prepare('SELECT id FROM plans WHERE company_id = ? AND period = ?').get(companyId, period);
  if (existing) {
    db.prepare(`
      UPDATE plans
      SET arr = ?, arr_growth_pct = ?, nrr = ?, churn_pct = ?, burn = ?, runway_months = ?, gross_margin_pct = ?, team_size = ?
      WHERE company_id = ? AND period = ?
    `).run(arr ?? null, arr_growth_pct ?? null, nrr ?? null, churn_pct ?? null, burn ?? null, runway_months ?? null, gross_margin_pct ?? null, team_size ?? null, companyId, period);
    const updated = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, period);
    return res.json(updated);
  } else {
    const result = db.prepare(`
      INSERT INTO plans (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(companyId, period, arr ?? null, arr_growth_pct ?? null, nrr ?? null, churn_pct ?? null, burn ?? null, runway_months ?? null, gross_margin_pct ?? null, team_size ?? null);
    const inserted = db.prepare('SELECT * FROM plans WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(inserted);
  }
});

// PUT /api/companies/:id/plans/:period — update plan
router.put('/:period', (req, res) => {
  const companyId = parseInt(req.params.id);
  const period = req.params.period;

  const plan = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, period);
  if (!plan) return res.status(404).json({ error: 'Plan not found for this period' });

  const { arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size } = req.body;

  db.prepare(`
    UPDATE plans
    SET arr = ?, arr_growth_pct = ?, nrr = ?, churn_pct = ?, burn = ?, runway_months = ?, gross_margin_pct = ?, team_size = ?
    WHERE company_id = ? AND period = ?
  `).run(
    arr ?? plan.arr,
    arr_growth_pct ?? plan.arr_growth_pct,
    nrr ?? plan.nrr,
    churn_pct ?? plan.churn_pct,
    burn ?? plan.burn,
    runway_months ?? plan.runway_months,
    gross_margin_pct ?? plan.gross_margin_pct,
    team_size ?? plan.team_size,
    companyId, period
  );

  const updated = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, period);
  res.json(updated);
});

module.exports = router;