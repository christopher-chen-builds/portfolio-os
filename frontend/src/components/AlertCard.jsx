import { useState } from 'react';

const PLAYBOOKS = {
  churn_pct: {
    title: 'Customer Health Playbook',
    content: `When churn exceeds 10%, investigate the following:

**Check for concentration risk**
- What % of revenue comes from the top 5 customers?
- Any single customer >20% of ARR?

**Review NRR trend**
- Is churn accelerating or stable?
- Which cohorts are churning most?

**Support ticket backlog**
- Any recent escalations?
- NPS or CSAT scores declining?

**Suggested actions:**
1. Schedule calls with top 3 at-risk accounts this week
2. Pull cohort retention report for past 4 quarters
3. Review recent product releases for any that may have caused friction

**Escalation trigger:** If churn >15% in any single month, escalate to GP within 48 hours.`,
  },
  runway_months: {
    title: 'Cash Conservation Playbook',
    content: `When runway falls below 3 months:

**Immediate actions:**
1. Freeze all non-critical hiring immediately
2. Review COGS line by line — identify the top 3 reduction opportunities
3. Model 3 scenarios: 50% revenue drop, current trajectory, bridge round needed

**Cash runway check:**
- What are the top 3 burn line items? Can any be cut 50%+ in 2 weeks?
- Are there any large disbursements coming in next 60 days that improve position?
- Any AR that can be accelerated?

**Suggested actions:**
1. Build 13-week cash flow model today
2. Identify the minimum team needed to service existing customers
3. Prepare a bridge round term sheet as a backup

**Escalation trigger:** If runway <2 months and no signed term sheet for next raise, escalate to GP immediately.`,
  },
  arr: {
    title: 'Revenue Rescue Playbook',
    content: `When ARR is tracking >15% below plan:

**Pipeline review:**
- How many deals are in late stage (>70% probability)?
- What is the average sales cycle length right now?
- Any large deals that slipped from last month?

**Sales cycle analysis:**
- Are cycles longer than last quarter?
- What objections are surfacing repeatedly?
- Any pricing pressure from prospects?

**Suggested actions:**
1. Run a full pipeline review with sales leadership this week
2. Identify the top 5 deals that could close in 30 days
3. Look for any expansion opportunities in existing accounts

**Escalation trigger:** If ARR growth is negative (declining absolute ARR), schedule emergency call with GP within 1 week.`,
  },
  nrr: {
    title: 'Retention Playbook',
    content: `When NRR falls below 100%:

**Cohort analysis:**
- Which customer cohorts are contracting or churning?
- Is it a specific segment, company size, or product line?
- Any pattern in when customers cancel (time since signup)?

**Expansion opportunity map:**
- Who are the candidates for expansion within existing accounts?
- What's the average expansion rate this quarter vs. last?
- Are upsells converting at expected rates?

**Cancellation interviews:**
- Are you running exit interviews on every churned customer?
- What's the #1 reason given for cancellation?

**Suggested actions:**
1. Pull cohort retention by segment for the past 6 months
2. Identify top 5 expansion candidates in existing accounts
3. Review all cancellation data — look for patterns

**Escalation trigger:** If NRR <85% for 2 consecutive periods, escalate to GP and request a customer health review.`,
  },
};

export default function AlertCard({ alert, onAcknowledge, onResolve }) {
  const [showPlaybook, setShowPlaybook] = useState(alert.flag_level === 'red');
  const [resolveNote, setResolveNote] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);

  const stateClass = {
    open: 'alert-open',
    acknowledged: 'alert-acknowledged',
    resolved: 'alert-resolved',
  }[alert.state] || 'alert-open';

  const flagClass = {
    yellow: 'badge-yellow',
    red: 'badge-red',
  }[alert.flag_level] || 'badge-yellow';

  const playbook = PLAYBOOKS[alert.metric_name];

  const handleResolve = () => {
    if (resolveNote.trim()) {
      onResolve(resolveNote);
      setShowResolveForm(false);
      setResolveNote('');
    }
  };

  return (
    <div className={`alert-card alert-${stateClass}`}>
      <div className="alert-card-header">
        <div>
          <span className="alert-card-metric">{formatMetricName(alert.metric_name)}</span>
          <span style={{ marginLeft: 8 }}>
            <span className={`badge ${flagClass}`}>{alert.flag_level.toUpperCase()}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="alert-card-meta">
            {alert.variance_pct != null
              ? `${alert.variance_pct > 0 ? '+' : ''}${alert.variance_pct.toFixed(1)}% vs plan`
              : ''}
            {' · '}
            {alert.period}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
        Created {new Date(alert.created_at).toLocaleDateString()}
        {alert.state === 'acknowledged' && alert.acknowledged_at && (
          <span> · Acknowledged {new Date(alert.acknowledged_at).toLocaleDateString()}</span>
        )}
        {alert.state === 'resolved' && alert.resolved_at && (
          <span> · Resolved {new Date(alert.resolved_at).toLocaleDateString()}</span>
        )}
      </div>

      {alert.state === 'open' && (
        <div className="alert-card-actions">
          <button className="btn btn-secondary btn-sm" onClick={onAcknowledge}>
            Acknowledge
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowResolveForm(!showResolveForm)}>
            Resolve
          </button>
        </div>
      )}

      {alert.state === 'acknowledged' && (
        <div className="alert-card-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowResolveForm(!showResolveForm)}>
            Resolve
          </button>
        </div>
      )}

      {showResolveForm && (
        <div style={{ marginTop: 12 }}>
          <textarea
            className="form-input"
            placeholder="Resolution note (required)..."
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            style={{ minHeight: 60 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleResolve} disabled={!resolveNote.trim()}>
              Confirm Resolve
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowResolveForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {alert.state === 'resolved' && alert.resolution_note && (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Resolution: {alert.resolution_note}
        </div>
      )}

      {playbook && alert.flag_level === 'red' && (
        <div className="playbook">
          <div className="playbook-header" onClick={() => setShowPlaybook(!showPlaybook)}>
            <span className="playbook-title">📋 {playbook.title}</span>
            <button className="playbook-toggle" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)' }}>
              {showPlaybook ? '▲' : '▼'}
            </button>
          </div>
          {showPlaybook && (
            <div className="playbook-body">
              {playbook.content.split('\n').map((line, i) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <strong key={i}>{line.replace(/\*\*/g, '')}</strong>;
                }
                if (line.startsWith('- ') || line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
                  return <li key={i}>{line.replace(/^[-0-9. ]+/, '')}</li>;
                }
                if (line.trim() === '') return <br key={i} />;
                return <span key={i}>{line}</span>;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMetricName(name) {
  const map = {
    arr: 'ARR',
    arr_growth_pct: 'ARR Growth %',
    nrr: 'NRR',
    churn_pct: 'Churn %',
    burn: 'Burn',
    runway_months: 'Runway',
    gross_margin_pct: 'Gross Margin %',
    team_size: 'Team Size',
  };
  return map[name] || name;
}