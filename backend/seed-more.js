// Supplemental seed — adds 3 more portfolio companies to existing DB
// Also fixes: original seed was missing gross_margin_pct in plans INSERT (1 col short)
// Run: node seed-more.js
'use strict';

const db = require('./database');

const currentPeriod = '2026-W23';
const priorPeriod = '2026-W22';

// Helper: variance % (plan vs actual for metrics where lower actual = bad, e.g. burn, churn)
function pctVariance(actual, planVal) {
  if (planVal == null || planVal === 0) return null;
  return parseFloat((((actual - planVal) / Math.abs(planVal)) * 100).toFixed(1));
}

// Helper: check if value represents a flag
function getFlags(m, planArr, period) {
  const flags = [];
  const p = planArr;
  // arr_growth_pct: < 0 = yellow, < -10 = red
  if (m.arr_growth_pct !== null && p.arr_growth_pct !== null) {
    const v = pctVariance(m.arr_growth_pct, p.arr_growth_pct);
    if (m.arr_growth_pct < -10) flags.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'red' });
    else if (m.arr_growth_pct < 0) flags.push({ metric_name: 'arr_growth_pct', variance_pct: v, flag_level: 'yellow' });
  }
  // nrr: < 100 = yellow, < 85 = red
  if (m.nrr !== null && p.nrr !== null) {
    const v = pctVariance(m.nrr, p.nrr);
    if (m.nrr < 85) flags.push({ metric_name: 'nrr', variance_pct: v, flag_level: 'red' });
    else if (m.nrr < 100) flags.push({ metric_name: 'nrr', variance_pct: v, flag_level: 'yellow' });
  }
  // churn_pct: > 5 = yellow, > 10 = red
  if (m.churn_pct !== null && p.churn_pct !== null) {
    const v = pctVariance(m.churn_pct, p.churn_pct);
    if (m.churn_pct > 10) flags.push({ metric_name: 'churn_pct', variance_pct: v, flag_level: 'red' });
    else if (m.churn_pct > 5) flags.push({ metric_name: 'churn_pct', variance_pct: v, flag_level: 'yellow' });
  }
  // burn: > plan by >25% = red, >10% = yellow
  if (m.burn !== null && p.burn !== null) {
    const v = pctVariance(m.burn, p.burn);
    if (v > 25) flags.push({ metric_name: 'burn', variance_pct: v, flag_level: 'red' });
    else if (v > 10) flags.push({ metric_name: 'burn', variance_pct: v, flag_level: 'yellow' });
  }
  // runway: < 3 = red, < 6 = yellow
  if (m.runway_months !== null) {
    const v = pctVariance(m.runway_months, p.runway_months);
    if (m.runway_months < 3) flags.push({ metric_name: 'runway_months', variance_pct: v, flag_level: 'red' });
    else if (m.runway_months < 6) flags.push({ metric_name: 'runway_months', variance_pct: v, flag_level: 'yellow' });
  }
  // gross_margin_pct: < 50 = red, < plan by >5pp = yellow
  if (m.gross_margin_pct !== null && p.gross_margin_pct !== null) {
    const v = pctVariance(m.gross_margin_pct, p.gross_margin_pct);
    if (m.gross_margin_pct < 50) flags.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'red' });
    else if (v < -5) flags.push({ metric_name: 'gross_margin_pct', variance_pct: v, flag_level: 'yellow' });
  }
  return flags;
}

function seedCompany(name, sector, investmentDate, ownershipPct, costBasis, currentValuation, planPrior, planCurrent, metricsPrior, metricsCurrent) {
  const existing = db.prepare('SELECT id FROM companies WHERE name = ?').get(name);
  if (existing) {
    console.log(`  ${name} already exists, skipping`);
    return;
  }

  const r = db.prepare(`
    INSERT INTO companies (name, sector, investment_date, ownership_pct, cost_basis, current_valuation)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, sector, investmentDate, ownershipPct, costBasis, currentValuation);
  const cid = r.lastInsertRowid;
  console.log(`  Added: ${name} (id=${cid})`);

  // Plans — 10 columns: company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size
  db.prepare(`
    INSERT INTO plans (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, priorPeriod, ...planPrior);

  db.prepare(`
    INSERT INTO plans (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, currentPeriod, ...planCurrent);

  // Metrics — 10 metric columns + notes = 11 values total
  const priorMetrics = db.prepare(`
    INSERT INTO metrics (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, priorPeriod, ...metricsPrior);

  const currentMetrics = db.prepare(`
    INSERT INTO metrics (company_id, period, arr, arr_growth_pct, nrr, churn_pct, burn, runway_months, gross_margin_pct, team_size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cid, currentPeriod, ...metricsCurrent);

  // Compute flags for current period
  const p = {
    arr: planCurrent[0], arr_growth_pct: planCurrent[1], nrr: planCurrent[2],
    churn_pct: planCurrent[3], burn: planCurrent[4], runway_months: planCurrent[5],
    gross_margin_pct: planCurrent[6], team_size: planCurrent[7]
  };
  const m = {
    arr: metricsCurrent[0], arr_growth_pct: metricsCurrent[1], nrr: metricsCurrent[2],
    churn_pct: metricsCurrent[3], burn: metricsCurrent[4], runway_months: metricsCurrent[5],
    gross_margin_pct: metricsCurrent[6], team_size: metricsCurrent[7]
  };

  // Compute team size decrease flag
  if (metricsPrior[7] !== null && metricsCurrent[7] !== null && metricsCurrent[7] < metricsPrior[7]) {
    const teamDec = parseFloat(((-(metricsPrior[7] - metricsCurrent[7]) / metricsPrior[7]) * 100).toFixed(1));
    m.team_size = metricsCurrent[7]; // ensure numeric
  } else {
    m.team_size = metricsCurrent[7];
  }

  const flags = getFlags(m, p, currentPeriod);

  // Also flag team size decrease if applicable
  if (metricsPrior[7] !== null && metricsCurrent[7] !== null && metricsCurrent[7] < metricsPrior[7]) {
    const teamDec = parseFloat(((-(metricsPrior[7] - metricsCurrent[7]) / metricsPrior[7]) * 100).toFixed(1));
    flags.push({ metric_name: 'team_size', variance_pct: teamDec, flag_level: 'yellow' });
  }

  const alertInsert = db.prepare(`
    INSERT INTO alerts (company_id, metric_id, period, flag_level, metric_name, variance_pct, state)
    VALUES (?, ?, ?, ?, ?, ?, 'open')
  `);
  for (const a of flags) {
    alertInsert.run(cid, currentMetrics.lastInsertRowid, currentPeriod, a.flag_level, a.metric_name, a.variance_pct);
  }
  console.log(`    → ${flags.length} alert(s) created`);

  return cid;
}

console.log('\n=== PortfolioOS Supplemental Seed ===\n');

console.log('Adding portfolio companies...\n');

// Company 1: Meridian Health — green, on plan
seedCompany(
  'Meridian Health',
  'Healthcare SaaS',
  '2023-06-01',
  60.0,
  5000000,
  12000000,
  // plan prior: arr, arr_growth, nrr, churn, burn, runway, gm, team
  [8200000, 18, 118, 2.1, 380000, 14, 71, 62],
  [8500000, 17, 120, 2.0, 390000, 13, 72, 65],
  // metrics prior
  [8200000, 18, 118, 2.1, 380000, 14, 71, 62, 'Steady quarter. EHR integration on track.'],
  // metrics current
  [8500000, 3.7, 120, 2.0, 390000, 13, 72, 65, 'New hospital system signed. ARR recognized evenly through quarter.']
);

// Company 2: NovaCommerce — yellow flags, needs attention
seedCompany(
  'NovaCommerce',
  'E-commerce Infrastructure',
  '2024-03-15',
  45.0,
  3000000,
  4200000,
  [3100000, 22, 108, 4.2, 210000, 10, 60, 28],
  [3300000, 20, 106, 4.8, 245000, 7, 61, 26],
  [3100000, 22, 108, 4.2, 210000, 10, 60, 28, 'GM pressure from shipping cost increase.'],
  [3300000, 6, 106, 4.8, 245000, 7, 61, 26, 'Top-line growth slowing. Two enterprise clients evaluating downsize. Sales pipeline 40% below target.']
);

// Company 3: Stackline — red flags, critical
seedCompany(
  'Stackline',
  'Developer Tools',
  '2022-09-01',
  35.0,
  1500000,
  2800000,
  [1800000, 35, 130, 1.5, 160000, 18, 77, 22],
  [1900000, 32, 128, 1.8, 195000, 14, 78, 20],
  [1800000, 35, 130, 1.5, 160000, 18, 77, 22, 'ARR recon recognized late. One large customer payment deferred to Q3.'],
  [1900000, -8, 128, 1.8, 195000, 14, 78, 20, 'ARR Growth negative. Two key engineers left. Burn unexpectedly high due to infra overprovisioning.']
);

console.log('\n=== Seed complete! ===');
console.log('\nDemo login: chris@chrischen.com / portfolio2026');
console.log('Companies added:');
console.log('  • Meridian Health — green (on plan)');
console.log('  • NovaCommerce — yellow flags (growth slowdown)');
console.log('  • Stackline — red flags (burn, runway critical)');
console.log('\nNote: ExampleCo was seeded by database.js on first boot (1 company, some alerts).');