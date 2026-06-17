# PortfolioOS — Product Requirements Document

## 1. Overview

**Product name:** PortfolioOS
**Type:** Internal SaaS tool for PE operating partners and micro-fund GPs
**Core function:** Track portfolio company metrics against plan, surface metric drift automatically, and suggest intervention playbooks when things go wrong.
**Target user:** PE operating partners, micro-fund GPs, and fund operations leads managing 3–15 portfolio companies
**Alpha goal:** Fully functional internal tool, testable by Chris, not publicly launched

---

## 2. Problem Statement

PE firms and micro-funds managing portfolio companies currently run on:
- Weekly spreadsheet updates from portfolio company CFOs (rarely on time, never standardized)
- Ad hoc check-ins that produce no searchable history
- Junior analysts aggregating data into PowerPoint decks that are obsolete the moment they're made
- No automated flagging — someone has to notice a metric is bad before anyone acts

PortfolioOS replaces all of that with a structured, disciplined system where metrics are entered consistently, plan vs. actual is always visible, and drift is surfaced automatically before it becomes a crisis.

---

## 3. User Personas

### Primary: The Operating Partner
- Manages 5–12 portfolio companies
- Has a full-time job outside this — needs information fast, not beautiful dashboards
- Wants to see "what do I need to pay attention to right now" in under 30 seconds
- Needs to act on flags quickly — suggested playbooks are a feature, not a nice-to-have

### Secondary: The Fund GP / Principal
- Has final accountability for portfolio performance
- Wants a portfolio-level view: which companies are on plan, which are not
- May only log in weekly before partner meetings
- Needs exportable summaries for LP updates

### Tertiary: Portfolio Company CFO / Finance Lead
- Enters weekly metrics into the system
- Wants a clean, fast interface — not a40-field form
- Wants to see their own plan vs. actual history
- Wants to know when they're about to be flagged

---

## 4. Core Features

### 4.1 Portfolio Overview Dashboard
- List of all portfolio companies with current status (on plan / attention / critical)
- Color-coded health indicators: green (on plan), yellow (1+ metric drifting), red (2+ critical)
- Overall portfolio health score (weighted average of company scores)
- One-click drill into any company

### 4.2 Company Detail View
- Company name, sector, investment date, ownership %, cost basis, current valuation
- All metrics for the company in a table: current period, prior period, plan, variance, trend
- Metric-level flag indicators on any drifting row
- Historical chart for each metric (last 12 periods)
- Notes / commentary field per metric period

### 4.3 Metric Entry
- Clean form per company: enter metrics for the current week/month
- Pre-populated with plan values for reference
- Required fields: ARR, NRR, churn %, burn, gross margin %, team size
- Optional fields: ARR growth %, net new ARR, COGS, net revenue, runway months
- Once submitted, metrics are locked (no editing past periods without a reason flag)

### 4.4 Plan vs. Actual Tracking
- When entering a metric, compare against the plan for that period
- Show variance: absolute ($) and relative (%)
- Flag thresholds:
  - YELLOW: variance > 5% and < 15% from plan
  - RED: variance > 15% from plan, OR any metric that crosses a critical floor (e.g., churn > 10%, runway< 3 months)
- Plan values are set per company per metric per period (editable by the operating partner)

### 4.5 Alerting System
- When a metric is flagged YELLOW or RED, an alert is created
- Alerts appear on the portfolio overview and on the company detail view
- Alert states: open, acknowledged, resolved
- Acknowledging an alert: "I'm aware, watching" — does not resolve it
- Resolving an alert: requires a resolution note (what was done or why it's fine)
- Alert history is preserved — this is a record of fund-level risk management

### 4.6 Intervention Playbooks
- When a metric goes RED, suggest a playbook based on the metric type:
  - Churn > 15%: "Customer Health Playbook" — check for concentration risk, NRR trend, support ticket backlog
  - Burn / Runway < 3 months: "Cash Conservation Playbook" — freeze hiring, review COGS, model scenario
  - ARR negative growth: "Revenue Rescue Playbook" — pipeline review, sales cycle analysis, pricing pressure check
  - NRR < 100%: "Retention Playbook" — cohort analysis, expansion opportunity map, cancellation interviews
- Playbooks are structured guides: 5–7 questions to investigate, 2–3 suggested actions, 1 escalation trigger
- Playbooks are shown inline when an alert fires — not a separate screen

### 4.7 Weekly Digest Email
- Every Sunday at 8 AM ET: email to the operating partner with:
  - Portfolio health summary (N companies on plan, N attention, N critical)
  - List of all open alerts with company + metric
  - Any new flags from this week's metric entry
- Email is plain text, not HTML — fast, readable on mobile

### 4.8 Data Import
- CSV import for metrics (for companies that already track in spreadsheets)
- Import format: company name, metric name, period, value
- Validation on import: flag malformed rows, show preview before confirming

---

## 5. Metrics Definition

All metrics are company-level unless noted.

| Metric | Definition | Unit | Flag thresholds |
|--------|-----------|------|-----------------|
| ARR | Annual Recurring Revenue | $ |< plan by > 5% → yellow; > 15% → red |
| ARR Growth % | Period-over-period ARR growth | % | < 0% → yellow; < -10% → red |
| NRR | Net Revenue Retention | % | < 100% → yellow; < 85% → red |
| Churn % | Logo churn (lost customers / start-of-period) | % | > 5% → yellow; > 10% → red |
| Burn | Monthly cash burn (negative = profitable) | $ | > plan by > 10% → yellow; > 25% → red |
| Runway | Months of cash remaining at current burn | months | < 6 → yellow; < 3 → red |
| Gross Margin % | (Revenue - COGS) / Revenue | % | < plan by > 5pp → yellow; < 50% → red |
| Team Size | Full-time employees at end of period | headcount | Any decrease → yellow flag |

---

## 6. Database Schema

### companies
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| name | TEXT | |
| sector | TEXT | |
| investment_date | TEXT | ISO date |
| ownership_pct | REAL | |
| cost_basis | REAL | $ |
| current_valuation | REAL | $ |
| created_at | TEXT | |

### metrics
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| company_id | INTEGER FK | |
| period | TEXT | "2026-W24" (ISO week) or "2026-Q1" |
| arr | REAL | |
| arr_growth_pct | REAL | |
| nrr | REAL | |
| churn_pct | REAL | |
| burn | REAL | |
| runway_months | REAL | |
| gross_margin_pct | REAL | |
| team_size | INTEGER | |
| notes | TEXT | |
| created_at | TEXT | |

### plans
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| company_id | INTEGER FK | |
| period | TEXT | |
| arr | REAL | |
| arr_growth_pct | REAL | |
| nrr | REAL | |
| churn_pct | REAL | |
| burn | REAL | |
| runway_months | REAL | |
| gross_margin_pct | REAL | |
| team_size | INTEGER | |

### alerts
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | |
| company_id | INTEGER FK | |
| metric_id | INTEGER FK | |
| period | TEXT | |
| flag_level | TEXT | "yellow" or "red" |
| metric_name | TEXT | |
| variance_pct | REAL | |
| state | TEXT | "open", "acknowledged", "resolved" |
| acknowledged_at | TEXT | nullable |
| resolved_at | TEXT | nullable |
| resolution_note | TEXT | nullable |
| created_at | TEXT | |

### companies_plan_view (SQL view)
Pre-computed view joining companies + latest metrics + plans for the current period, computing variances and flag levels.

---

## 7. API Design

### Companies
- `GET /api/companies` — list all companies with latest health status
- `GET /api/companies/:id` — company detail with metrics history
- `POST /api/companies` — add a company
- `PUT /api/companies/:id` — update company info

### Metrics
- `GET /api/companies/:id/metrics` — all metrics for a company
- `POST /api/companies/:id/metrics` — enter new metric period
- `GET /api/companies/:id/metrics/:period` — single period

### Plans
- `GET /api/companies/:id/plans` — all plan values for a company
- `POST /api/companies/:id/plans` — set plan for a period
- `PUT /api/companies/:id/plans/:period` — update plan

### Alerts
- `GET /api/alerts` — all open alerts across portfolio
- `GET /api/companies/:id/alerts` — alerts for one company
- `POST /api/alerts/:id/acknowledge` — acknowledge an alert
- `POST /api/alerts/:id/resolve` — resolve with note

### Dashboard
- `GET /api/dashboard` — portfolio overview (all companies, open alerts count, health summary)

### Digest
- `POST /api/digest/send` — trigger weekly digest email (also runs on cron)

---

## 8. Technology Stack

**Frontend:** React + Vite, plain CSS (no Tailwind for v1 — keeps it simple), React Router
**Backend:** Node.js + Express
**Database:** SQLite (file-based, zero setup, perfect for internal tool)
**Email:** n8n workflow (same email infrastructure as other crons)
**Hosting:** Mac Mini bare metal, port 3457 (next to CRM at 3456)
**Auth:** Simple session-based — operating partner email + password (no OAuth for v1)

---

## 9. Out of Scope for v1

- Multi-user with role permissions (v1: single user, Chris only)
- LP portal
- Portfolio company self-service portal
- Automated data feeds from portfolio companies (manual entry only)
- Deal pipeline / ownership tracking (metrics only)
- Mobile app

---

## 10. Success Criteria for v1

1. Chris can add a portfolio company in under 2 minutes
2. Metric entry for a company takes under 3 minutes per period
3. Portfolio overview loads in under 1 second and shows all companies
4. A RED flag metric creates an alert and shows a playbook within 5 seconds of metric submission
5. Weekly digest email sends every Sunday at 8 AM ET with correct content
6. CSV import of12 months of metrics for a company works without errors
7. All code is reviewed and logic is verified before "shipping" to test
