'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');

function getHealthStatus(companyId) {
  // Get latest open alerts count for this company
  const openAlerts = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'"
  ).get(companyId);

  const redAlerts = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open' AND flag_level = 'red'"
  ).get(companyId);

  if (redAlerts.cnt > 0) return 'critical';
  if (openAlerts.cnt > 0) return 'attention';
  return 'on_plan';
}

function getLatestMetrics(companyId) {
  return db.prepare(`
    SELECT * FROM metrics
    WHERE company_id = ?
    ORDER BY period DESC
    LIMIT 1
  `).get(companyId);
}

// GET /api/companies — list all companies with latest health status
router.get('/', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY name').all();
  const result = companies.map(company => {
    const latest = getLatestMetrics(company.id);
    const health = getHealthStatus(company.id);
    const openAlerts = db.prepare(
      "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'"
    ).get(company.id);
    return {
      ...company,
      latest_metrics: latest || null,
      health_status: health,
      open_alerts_count: openAlerts.cnt
    };
  });
  res.json(result);
});

// GET /api/companies/:id — company detail with metrics history (last 12 periods)
router.get('/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const metrics = db.prepare(`
    SELECT * FROM metrics
    WHERE company_id = ?
    ORDER BY period DESC
    LIMIT 12
  `).all(req.params.id);

  const health = getHealthStatus(company.id);
  const openAlerts = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'"
  ).get(company.id);

  res.json({
    ...company,
    health_status: health,
    open_alerts_count: openAlerts.cnt,
    metrics
  });
});

// POST /api/companies — add a company
router.post('/', (req, res) => {
  const { name, sector, investment_date, ownership_pct, cost_basis, current_valuation } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required' });

  const result = db.prepare(`
    INSERT INTO companies (name, sector, investment_date, ownership_pct, cost_basis, current_valuation)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, sector || null, investment_date || null, ownership_pct || null, cost_basis || null, current_valuation || null);

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(company);
});

// PUT /api/companies/:id — update company info
router.put('/:id', (req, res) => {
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const { name, sector, investment_date, ownership_pct, cost_basis, current_valuation } = req.body;
  db.prepare(`
    UPDATE companies
    SET name = ?, sector = ?, investment_date = ?, ownership_pct = ?, cost_basis = ?, current_valuation = ?
    WHERE id = ?
  `).run(
    name ?? company.name,
    sector ?? company.sector,
    investment_date ?? company.investment_date,
    ownership_pct ?? company.ownership_pct,
    cost_basis ?? company.cost_basis,
    current_valuation ?? company.current_valuation,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;