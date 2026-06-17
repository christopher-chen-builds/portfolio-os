'use strict';

const express = require('express');
const router = express.Router();
const db = require('../database');
const fetch = require('node-fetch');

function daysOpen(createdAt) {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

// POST /api/digest/send — trigger weekly digest email via n8n email webhook
router.post('/send', async (req, res) => {
  // Gather open alerts
  const openAlerts = db.prepare(`
    SELECT a.*, c.name as company_name
    FROM alerts a
    JOIN companies c ON a.company_id = c.id
    WHERE a.state = 'open'
    ORDER BY
      CASE a.flag_level WHEN 'red' THEN 0 ELSE 1 END,
      a.created_at DESC
  `).all();

  // Portfolio summary
  const companies = db.prepare('SELECT id FROM companies').all();
  const onPlan = companies.filter(c => {
    const red = db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open' AND flag_level = 'red'").get(c.id);
    return red.cnt === 0;
  }).length;
  const attention = companies.filter(c => {
    const red = db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open' AND flag_level = 'red'").get(c.id);
    const all = db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open'").get(c.id);
    return red.cnt === 0 && all.cnt > 0;
  }).length;
  const critical = companies.filter(c => {
    const red = db.prepare("SELECT COUNT(*) as cnt FROM alerts WHERE company_id = ? AND state = 'open' AND flag_level = 'red'").get(c.id);
    return red.cnt > 0;
  }).length;

  // Build plain text email
  const lines = [];
  lines.push('PortfolioOS Weekly Digest');
  lines.push('=========================');
  lines.push('');
  lines.push(`Portfolio Health: ${companies.length} companies`);
  lines.push(`  On Plan: ${onPlan}`);
  lines.push(`  Attention: ${attention}`);
  lines.push(`  Critical: ${critical}`);
  lines.push('');
  lines.push(`Open Alerts: ${openAlerts.length}`);
  lines.push('');

  if (openAlerts.length === 0) {
    lines.push('No open alerts. Portfolio is healthy.');
  } else {
    for (const alert of openAlerts) {
      lines.push(`[${alert.flag_level.toUpperCase()}] ${alert.company_name} — ${alert.metric_name}`);
      lines.push(`  Variance: ${alert.variance_pct != null ? alert.variance_pct.toFixed(1) + '%' : 'N/A'} from plan`);
      lines.push(`  Days open: ${daysOpen(alert.created_at)}`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('Sent by PortfolioOS');

  const emailBody = lines.join('\n');

  // Send via n8n email webhook
  const webhookUrl = process.env.OPENCLAW_EMAIL_WEBHOOK_URL;
  const webhookToken = process.env.OPENCLAW_EMAIL_WEBHOOK_TOKEN;

  if (webhookUrl && webhookUrl !== 'https://n8n.example.com/webhook/email') {
    try {
      const payload = {
        subject: `PortfolioOS Digest — ${new Date().toISOString().split('T')[0]}`,
        body: emailBody,
        to: 'chris@chrischen.com'
      };
      const headers = { 'Content-Type': 'application/json' };
      if (webhookToken) headers['Authorization'] = `Bearer ${webhookToken}`;
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.error('n8n webhook error:', response.status, await response.text());
      }
    } catch (err) {
      console.error('Failed to send digest email:', err.message);
    }
  } else {
    // Dev mode: just log the email body
    console.log('=== DIGEST EMAIL (dev mode, no webhook configured) ===');
    console.log(emailBody);
    console.log('=== END DIGEST ===');
  }

  res.json({
    ok: true,
    summary: {
      total_companies: companies.length,
      on_plan_count: onPlan,
      attention_count: attention,
      critical_count: critical,
      total_open_alerts: openAlerts.length
    },
    email_body: emailBody
  });
});

module.exports = router;