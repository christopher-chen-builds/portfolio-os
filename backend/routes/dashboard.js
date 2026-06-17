'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');

function getHealthStatus(companyId) {
  const redAlerts = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open' AND flag_level = 'red'"
  ).get(companyId);
  const openAlerts = db.prepare(
    "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'"
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

// GET /api/dashboard — portfolio overview
router.get('/', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY name').all();

  const portfolioSummary = {
    total_companies: companies.length,
    on_plan_count: 0,
    attention_count: 0,
    critical_count: 0,
    total_open_alerts: 0
  };

  const companyViews = companies.map(company => {
    const health = getHealthStatus(company.id);
    const latestMetrics = getLatestMetrics(company.id);
    const openAlerts = db.prepare(
      "SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'"
    ).get(company.id);

    if (health === 'on_plan') portfolioSummary.on_plan_count++;
    else if (health === 'attention') portfolioSummary.attention_count++;
    else if (health === 'critical') portfolioSummary.critical_count++;

    portfolioSummary.total_open_alerts += openAlerts.cnt;

    return {
      id: company.id,
      name: company.name,
      sector: company.sector,
      latest_metrics: latestMetrics || null,
      health_status: health,
      open_alerts_count: openAlerts.cnt
    };
  });

  res.json({
    companies: companyViews,
    summary: portfolioSummary
  });
});

module.exports = router;