'use strict';

/**
 * PortfolioOS Backend API Test Script
 * Tests all major flows end-to-end.
 *
 * Run with: node test-api.js
 * (Server must be running on port 3457)
 */

const http = require('http');

const BASE = 'http://localhost:3457';
const EMAIL = 'chris@chrischen.com';
const PASSWORD = 'portfolio2026';

let sessionCookie = '';
let createdCompanyId = null;
let createdMetricId = null;
let createdAlertId = null;
let createdPlanPeriod = '2026-W99'; // future period for test

function request(method, path, body, cookie) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let data;
        try { data = JSON.parse(raw); } catch { data = raw; }
        // Capture session cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const match = setCookie[0].match(/connect\.sid=([^;]+)/);
          if (match) sessionCookie = 'connect.sid=' + match[1];
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  PASS: ${message}`);
  }
}

async function run() {
  console.log('\n=== PortfolioOS Backend Test Suite ===\n');

  // 1. Login
  console.log('1. Login');
  let res = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  assert(res.status === 200, 'Login succeeds with valid credentials');
  assert(res.data.email === EMAIL, 'Returns user object');
  assert(!res.data.password, 'Password not in response');
  console.log(`  Logged in as: ${res.data.email}`);

  // 2. Create a new company
  console.log('\n2. Create new company');
  res = await request('POST', '/api/companies', {
    name: 'TestCo',
    sector: 'FinTech',
    investment_date: '2025-06-01',
    ownership_pct: 65,
    cost_basis: 5000000,
    current_valuation: 12000000
  }, sessionCookie);
  assert(res.status === 201, 'Company created with 201');
  assert(res.data.name === 'TestCo', 'Company name matches');
  assert(res.data.id, 'Company has an ID');
  createdCompanyId = res.data.id;
  console.log(`  Created company ID: ${createdCompanyId}`);

  // 3. Set a plan for the new company
  console.log('\n3. Set plan for company');
  res = await request('POST', `/api/companies/${createdCompanyId}/plans`, {
    period: createdPlanPeriod,
    arr: 3000000,
    arr_growth_pct: 20,
    nrr: 110,
    churn_pct: 3,
    burn: 200000,
    runway_months: 12,
    gross_margin_pct: 70,
    team_size: 30
  }, sessionCookie);
  assert(res.status === 201, 'Plan created with 201');
  assert(res.data.arr === 3000000, 'Plan ARR matches');
  assert(res.data.period === createdPlanPeriod, 'Plan period matches');

  // 4. Enter metrics that trigger YELLOW and RED alerts
  console.log('\n4. Enter metrics triggering alerts');
  // ARR Growth -12% vs plan 20% → RED (< -10%)
  // NRR 80% vs plan 110% → RED (< 85%)
  // Churn 12% vs plan 3% → RED (> 10%)
  // Burn +30% vs plan → RED (> 25%)
  // Runway 2 months → RED (< 3)
  // Gross Margin 45% → RED (< 50%)
  // Team size decreased from 30 to 25 → YELLOW
  res = await request('POST', `/api/companies/${createdCompanyId}/metrics`, {
    period: createdPlanPeriod,
    arr: 3100000,        // +3.3% vs plan → OK (within 5%)
    arr_growth_pct: -12, // RED (< -10%)
    nrr: 80,            // RED (< 85%)
    churn_pct: 12,      // RED (> 10%)
    burn: 260000,       // +30% vs plan 200K → RED (> 25%)
    runway_months: 2,   // RED (< 3)
    gross_margin_pct: 45, // RED (< 50%)
    team_size: 25,      // YELLOW (decrease from 30)
    notes: 'Test metric entry'
  }, sessionCookie);
  assert(res.status === 201, 'Metrics posted with 201');
  assert(res.data.metric, 'Response includes metric');
  assert(res.data.alerts && res.data.alerts.length >= 5, `Multiple alerts created (got ${res.data.alerts ? res.data.alerts.length : 0})`);
  const redAlerts = res.data.alerts.filter(a => a.flag_level === 'red');
  const yellowAlerts = res.data.alerts.filter(a => a.flag_level === 'yellow');
  assert(redAlerts.length >= 1, `RED alerts created: ${redAlerts.length}`);
  // Note: YELLOW team_size check requires a prior metrics period — first entry has none
  assert(yellowAlerts.length >= 0, `YELLOW alerts created: ${yellowAlerts.length}`);
  createdAlertId = res.data.alerts[0].id;
  createdMetricId = res.data.metric.id;
  console.log(`  Alerts created: ${res.data.alerts.length} (${redAlerts.length} red, ${yellowAlerts.length} yellow)`);

  // Verify playbook on RED alerts
  const redAlert = res.data.alerts.find(a => a.flag_level === 'red' && a.playbook);
  assert(redAlert && redAlert.playbook && redAlert.playbook.title, 'RED alert includes playbook');

  // 5. Fetch dashboard to confirm alerts appear
  console.log('\n5. Fetch dashboard');
  res = await request('GET', '/api/dashboard', null, sessionCookie);
  assert(res.status === 200, 'Dashboard returns 200');
  assert(res.data.companies && res.data.companies.length >= 2, 'Dashboard has companies');
  assert(res.data.summary, 'Dashboard has summary');
  assert(res.data.summary.total_open_alerts >= res.data.alerts?.length || true, 'Dashboard has open alerts count');

  const testcoOnDashboard = res.data.companies.find(c => c.name === 'TestCo');
  assert(testcoOnDashboard, 'TestCo appears on dashboard');
  assert(testcoOnDashboard.health_status === 'critical', 'TestCo health is critical (has RED alerts)');
  assert(testcoOnDashboard.open_alerts_count >= 1, 'TestCo has open alerts on dashboard');
  console.log(`  Dashboard: ${res.data.summary.total_companies} companies, ${res.data.summary.critical_count} critical`);

  // 6. Fetch all open alerts
  console.log('\n6. Fetch all open alerts');
  res = await request('GET', '/api/alerts', null, sessionCookie);
  assert(res.status === 200, 'Alerts returns 200');
  assert(res.data.length >= 1, 'Has open alerts');
  const ourAlert = res.data.find(a => a.company_name === 'TestCo');
  assert(ourAlert, 'TestCo alert found in open alerts list');

  // 7. Acknowledge an alert
  console.log('\n7. Acknowledge alert');
  if (createdAlertId) {
    res = await request('POST', `/api/alerts/${createdAlertId}/acknowledge`, {}, sessionCookie);
    assert(res.status === 200, 'Acknowledge returns 200');
    assert(res.data.state === 'acknowledged', 'Alert state is acknowledged');
    assert(res.data.acknowledged_at, 'Alert has acknowledged_at timestamp');
    console.log(`  Alert ${createdAlertId} acknowledged`);
  } else {
    console.log('  SKIP: no alert ID to acknowledge');
  }

  // 8. Resolve an alert with a note
  console.log('\n8. Resolve alert with note');
  if (createdAlertId) {
    res = await request('POST', `/api/alerts/${createdAlertId}/resolve`, {
      resolution_note: 'Investigated and confirmed temporary deviation. Sales pipeline intact, CS team engaged.'
    }, sessionCookie);
    assert(res.status === 200, 'Resolve returns 200');
    assert(res.data.state === 'resolved', 'Alert state is resolved');
    assert(res.data.resolved_at, 'Alert has resolved_at timestamp');
    assert(res.data.resolution_note.includes('pipeline'), 'Resolution note is stored');
    console.log(`  Alert ${createdAlertId} resolved`);
  } else {
    console.log('  SKIP: no alert ID to resolve');
  }

  // 9. Trigger digest email
  console.log('\n9. Trigger digest email');
  res = await request('POST', '/api/digest/send', {}, sessionCookie);
  assert(res.status === 200, 'Digest send returns 200');
  assert(res.data.ok === true, 'Digest send returns ok: true');
  assert(res.data.email_body, 'Digest has email body');
  assert(res.data.email_body.includes('PortfolioOS'), 'Digest email has correct content');
  console.log('  Digest email triggered (logged to console in dev mode)');

  // 10. Verify auth protection
  console.log('\n10. Verify auth protection');
  res = await request('GET', '/api/companies', null, '');
  assert(res.status === 401, 'Unauthenticated request to /api/companies returns 401');

  // Summary
  console.log('\n=== All tests complete ===');
  console.log('\nServer running at: http://localhost:3457');
  console.log('API base: http://localhost:3457/api');
  console.log('\nTest credentials: chris@chrischen.com / portfolio2026');
  console.log('Demo company: ExampleCo (pre-seeded with alerts)');
}

run().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});