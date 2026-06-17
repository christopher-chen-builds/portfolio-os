'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');

// Playbook definitions (same as metrics.js)
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

// GET /api/alerts — all open alerts across portfolio
router.get('/', (req, res) => {
  const alerts = db.prepare(`
    SELECT a.*, c.name as company_name
    FROM alerts a
    JOIN companies c ON a.company_id = c.id
    WHERE a.state = 'open'
    ORDER BY
      CASE a.flag_level WHEN 'red' THEN 0 ELSE 1 END,
      a.created_at DESC
  `).all();

  res.json(alerts.map(a => ({
    ...a,
    playbook: getPlaybook(a.metric_name, a.flag_level)
  })));
});

// GET /api/companies/:id/alerts — alerts for one company
router.get('/company/:companyId', (req, res) => {
  const alerts = db.prepare(`
    SELECT * FROM alerts
    WHERE company_id = ?
    ORDER BY created_at DESC
  `).all(req.params.companyId);

  res.json(alerts.map(a => ({
    ...a,
    playbook: getPlaybook(a.metric_name, a.flag_level)
  })));
});

// POST /api/alerts/:id/acknowledge — acknowledge an alert
router.post('/:id/acknowledge', (req, res) => {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  db.prepare(`
    UPDATE alerts
    SET state = 'acknowledged', acknowledged_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  res.json({
    ...updated,
    playbook: getPlaybook(updated.metric_name, updated.flag_level)
  });
});

// POST /api/alerts/:id/resolve — resolve with note
router.post('/:id/resolve', (req, res) => {
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  const { resolution_note } = req.body;
  if (!resolution_note) return res.status(400).json({ error: 'resolution_note is required' });

  db.prepare(`
    UPDATE alerts
    SET state = 'resolved', resolved_at = datetime('now'), resolution_note = ?
    WHERE id = ?
  `).run(resolution_note, req.params.id);

  const updated = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;