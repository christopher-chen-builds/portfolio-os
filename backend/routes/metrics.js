'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../database');

// Playbook definitions
const PLAYBOOKS = {
  churn_pct: {
    title: 'Customer Health Playbook',
    questions: [
      'What is the concentration risk? Top 5 customers make up what % of ARR?',
      'Is churn concentrated in a specific cohort or segment?',
      'Are there open support tickets for at-risk accounts?',
      'Has the CS team conducted cancellation interviews?',
      'What does the NRR trend look like over the last 4 quarters?'
    ],
    actions: [
      'Schedule 1:1 with head of CS to review at-risk accounts',
      'Pull cohort analysis by customer segment',
      'Review recent NPS scores and CSAT data'
    ],
    escalation: 'If churn is concentrated in enterprise segment or current quarter, escalate to deal team immediately'
  },
  runway_months: {
    title: 'Cash Conservation Playbook',
    questions: [
      'What is the month-by-month cash flow projection at current burn?',
      'What are the top 3 COGS drivers and are any discretionary?',
      'Is there a sales pipeline that could close within 60 days?',
      'What is the minimum viable team size for current product roadmap?'
    ],
    actions: [
      'Freeze all non-essential hiring immediately',
      'Review and reduce COGS line items with management',
      'Model 3 scenarios: current plan, -20% burn, -40% burn'
    ],
    escalation: 'If runway drops below 2 months without a credible financing path, escalate to board within 48 hours'
  },
  arr_growth_pct: {
    title: 'Revenue Rescue Playbook',
    questions: [
      'What is the current pipeline coverage (pipeline / quota)?',
      'Has average deal size changed? Are we seeing compression?',
      'Are any top prospects in extended eval?',
      'Has competitor activity increased in our core segments?'
    ],
    actions: [
      'Pull full pipeline report with stage history',
      'Interview top 3 AEs on blockers',
      'Review win/loss data for last 2 quarters — any patterns?'
    ],
    escalation: 'If pipeline coverage is below 2x quota with no expected closes in 30 days, escalate to CRO'
  },
  nrr: {
    title: 'Retention Playbook',
    questions: [
      'What is the expansion vs. contraction breakdown?',
      'Are there cancellations in the last 30 days we can still save?',
      'What cohorts are underperforming (industry, segment, plan size)?',
      'Are customers citing specific product gaps?'
    ],
    actions: [
      'Run cohort analysis by customer segment and ACV tier',
      'Pull cancellation interview notes from last 90 days',
      'Identify top 5 accounts by ARR with NRR < 80% for immediate attention'
    ],
    escalation: 'If NRR drops below 80%, schedule emergency exec review of retention strategy'
  }
};

const DEFAULT_PLAYBOOK = {
  title: 'Operational Review Playbook',
  questions: [
    'What changed vs. the prior period?',
    'Is this a one-time event or a trend?',
    'Who on the portfolio company team is closest to this metric?'
  ],
  actions: [
    'Schedule a portfolio company check-in call within 5 business days',
    'Request updated forecast for this metric for the next 2 periods'
  ],
  escalation: 'If the metric does not recover within 2 periods, escalate to full portfolio review'
};

function getPlaybook(metricName, flagLevel) {
  if (flagLevel !== 'red') return null;
  return PLAYBOOKS[metricName] || DEFAULT_PLAYBOOK;
}

function computeVariance(actual, planVal) {
  if (actual == null || planVal == null || planVal === 0) return null;
  return ((actual - planVal) / Math.abs(planVal)) * 100;
}

function checkAlerts(metricsRow, planRow, companyId, metricId, period) {
  const alerts = [];

  // ARR: > plan by >5% yellow, > 15% red
  if (metricsRow.arr != null && planRow.arr != null) {
    const v = computeVariance(metricsRow.arr, planRow.arr);
    if (v > 15) alerts.push({ metric_name: 'arr', variance_pct: v, flag_level: 'red' });
    else if (v > 5) alerts.push({ metric_name: 'arr', variance_pct: v, flag_level: 'yellow' });
  }

  // ARR Growth %: < 0% yellow, < -10% red
  if (metricsRow.arr_growth_pct != null && planRow.arr_growth_pct != null) {
    const v = computeVariance(metricsRow.arr_growth_pct, planRow.arr_growth_pct);
    if (metricsRow.arr_growth_pct < -10) alerts.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'red' });
    else if (metricsRow.arr_growth_pct < 0) alerts.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'yellow' });
  }

  // NRR: < 100% yellow, < 85% red
  if (metricsRow.nrr != null && planRow.nrr != null) {
    const v = computeVariance(metricsRow.nrr, planRow.nrr);
    if (metricsRow.nrr < 85) alerts.push({ metric_name: 'nrr', variance_pct: v, flag_level: 'red' });
    else if (metricsRow.nrr < 100) alerts.push({ metric_name: 'nrr', variance_pct: v, flag_level: 'yellow' });
  }

  // Churn %: > 5% yellow, > 10% red
  if (metricsRow.churn_pct != null && planRow.churn_pct != null) {
    const v = computeVariance(metricsRow.churn_pct, planRow.churn_pct);
    if (metricsRow.churn_pct > 10) alerts.push({ metric_name: 'churn_pct', variance_pct: v, flag_level: 'red' });
    else if (metricsRow.churn_pct > 5) alerts.push({ metric_name: 'churn_pct', variance_pct: v, flag_level: 'yellow' });
  }

  // Burn: > plan by > 10% yellow, > 25% red
  if (metricsRow.burn != null && planRow.burn != null) {
    const v = computeVariance(metricsRow.burn, planRow.burn);
    if (v > 25) alerts.push({ metric_name: 'burn', variance_pct: v, flag_level: 'red' });
    else if (v > 10) alerts.push({ metric_name: 'burn', variance_pct: v, flag_level: 'yellow' });
  }

  // Runway: < 6 months yellow, < 3 months red
  if (metricsRow.runway_months != null) {
    if (metricsRow.runway_months < 3) {
      alerts.push({ metric_name: 'runway_months', variance_pct: computeVariance(metricsRow.runway_months, planRow.runway_months), flag_level: 'red' });
    } else if (metricsRow.runway_months < 6) {
      alerts.push({ metric_name: 'runway_months', variance_pct: computeVariance(metricsRow.runway_months, planRow.runway_months), flag_level: 'yellow' });
    }
  }

  // Gross Margin %: < plan by > 5pp yellow, < 50% red
  if (metricsRow.gross_margin_pct != null && planRow.gross_margin_pct != null) {
    const v = computeVariance(metricsRow.gross_margin_pct, planRow.gross_margin_pct);
    if (metricsRow.gross_margin_pct < 50) alerts.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'red' });
    else if (v < -5) alerts.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'yellow' });
  }

  // Team Size: any decrease from prior period → yellow
  const priorMetrics = db.prepare(
    'SELECT team_size FROM metrics WHERE company_id = ? AND period < ? ORDER BY period DESC LIMIT 1'
  ).get(companyId, period);
  if (priorMetrics && metricsRow.team_size != null && priorMetrics.team_size != null &&
      metricsRow.team_size < priorMetrics.team_size) {
    alerts.push({
      metric_name: 'team_size',
      variance_pct: -((priorMetrics.team_size - metricsRow.team_size) / priorMetrics.team_size * 100),
      flag_level: 'yellow'
    });
  }

  return alerts;
}

// GET /api/companies/:id/metrics — all metrics for a company
router.get('/', (req, res) => {
  const metrics = db.prepare(
    'SELECT * FROM metrics WHERE company_id = ? ORDER BY period DESC'
  ).all(req.params.id);
  res.json(metrics);
});

// GET /api/companies/:id/metrics/:period — single period
router.get('/:period', (req, res) => {
  const metric = db.prepare(
    'SELECT * FROM metrics WHERE company_id = ? AND period = ?'
  ).get(req.params.id, req.params.period);
  if (!metric) return res.status(404).json({ error: 'Metric not found' });

  const plan = db.prepare(
    'SELECT * FROM plans WHERE company_id = ? AND period = ?'
  ).get(req.params.id, req.params.period);

  // Get associated alerts
  const alerts = db.prepare(
    "SELECT * FROM alerts WHERE company_id = ? AND period = ? AND state != 'resolved' ORDER BY created_at DESC"
  ).all(req.params.id, req.params.period);

  // Add playbooks to red alerts
  const alertsWithPlaybook = alerts.map(a => ({
    ...a,
    playbook: getPlaybook(a.metric_name, a.flag_level)
  }));

  res.json({ ...metric, plan: plan || null, alerts: alertsWithPlaybook });
});

// POST /api/companies/:id/metrics — enter new metric period (triggers alerting)
router.post('/', (req, res) => {
  const companyId = parseInt(req.params.id);
  const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(companyId);
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const { period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes } = req.body;
  if (!period) return res.status(400).json({ error: 'Period is required' });

  // Insert metric
  const result = db.prepare(`
    INSERT INTO metrics (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, period, arr ?? null, arr_growth_pct ?? null, nrr ?? null, churn_pct ?? null, burn ?? null, runway_months ?? null, gross_margin_pct ?? null, team_size ?? null, notes ?? null);

  const metricsRow = db.prepare('SELECT * FROM metrics WHERE id = ?').get(result.lastInsertRowid);

  // Check for plan and generate alerts
  const plan = db.prepare('SELECT * FROM plans WHERE company_id = ? AND period = ?').get(companyId, period);
  const createdAlerts = [];

  if (plan) {
    const alerts = checkAlerts(metricsRow, plan, companyId, metricsRow.id, period);
    const alertInsert = db.prepare(`
      INSERT INTO alerts (company_id, metric_id, period, flag_level, metric_name, variance_pct, state)
      VALUES (?, ?, ?, ?, ?, ?, 'open')
    `);
    for (const a of alerts) {
      const r = alertInsert.run(companyId, metricsRow.id, period, a.flag_level, a.metric_name, a.variance_pct);
      const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(r.lastInsertRowid);
      createdAlerts.push({
        ...alert,
        playbook: getPlaybook(alert.metric_name, alert.flag_level)
      });
    }
  }

  res.status(201).json({ metric: metricsRow, alerts: createdAlerts });
});

module.exports = router;