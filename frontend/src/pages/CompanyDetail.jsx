import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import HealthBadge from '../components/HealthBadge';
import MetricEntryModal from '../components/MetricEntryModal';
import AlertCard from '../components/AlertCard';
import PlanForm from '../components/PlanForm';
import MetricChart from '../components/MetricChart';

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [plans, setPlans] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('metrics');
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({});

  const fetchAll = () => {
    Promise.all([
      api.getCompany(id),
      api.getMetrics(id),
      api.getPlans(id),
      api.getAlerts(id),
    ])
      .then(([companyData, metricsData, plansData, alertsData]) => {
        setCompany(companyData);
        setMetrics(metricsData);
        setPlans(plansData);
        setAlerts(alertsData);
        setCompanyForm({
          name: companyData.name,
          sector: companyData.sector || '',
          investment_date: companyData.investment_date || '',
          ownership_pct: companyData.ownership_pct != null ? String(companyData.ownership_pct) : '',
          cost_basis: companyData.cost_basis != null ? String(companyData.cost_basis) : '',
          current_valuation: companyData.current_valuation != null ? String(companyData.current_valuation) : '',
        });
      })
      .catch(() => setError('Failed to load company'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const handleSaveCompany = async () => {
    try {
      await api.updateCompany(id, {
        name: companyForm.name,
        sector: companyForm.sector,
        investment_date: companyForm.investment_date,
        ownership_pct: companyForm.ownership_pct ? parseFloat(companyForm.ownership_pct) : null,
        cost_basis: companyForm.cost_basis ? parseFloat(companyForm.cost_basis) : null,
        current_valuation: companyForm.current_valuation ? parseFloat(companyForm.current_valuation) : null,
      });
      setEditingCompany(false);
      fetchAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMetricSubmit = async (metricData) => {
    await api.addMetric(id, metricData);
    setShowMetricModal(false);
    fetchAll();
  };

  const handleAcknowledge = async (alertId) => {
    await api.acknowledgeAlert(alertId);
    fetchAll();
  };

  const handleResolve = async (alertId, note) => {
    await api.resolveAlert(alertId, note);
    fetchAll();
  };

  const handlePlanSubmit = async (planData) => {
    await api.setPlan(id, planData);
    setShowPlanForm(false);
    fetchAll();
  };

  if (loading) return <div className="state-message loading">Loading...</div>;
  if (error) return <div className="state-message error">{error}</div>;
  if (!company) return null;

  const formatCurrency = (v) =>
    v != null ? `$${Number(v).toLocaleString()}` : '—';

  const formatPct = (v) =>
    v != null ? `${Number(v).toFixed(1)}%` : '—';

  const latestMetric = metrics[0];

  return (
    <div>
      <header className="app-header">
        <div className="logo">
          <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>PortfolioOS</Link>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
      </header>

      <div className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Company Header */}
        <div className="company-header">
          <div className="company-header-top">
            <div>
              {editingCompany ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    className="form-input"
                    style={{ fontSize: 20, fontWeight: 700, width: 300 }}
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))}
                  />
                  <input
                    className="form-input"
                    style={{ width: 240 }}
                    placeholder="Sector"
                    value={companyForm.sector}
                    onChange={(e) => setCompanyForm((p) => ({ ...p, sector: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div className="company-header-name">{company.name}</div>
                  <div className="company-header-sector">{company.sector || 'No sector'}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              {editingCompany ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingCompany(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveCompany}>
                    Save
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingCompany(true)}>
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="company-header-grid">
            <div className="company-header-stat">
              <span className="stat-label">Investment Date</span>
              {editingCompany ? (
                <input
                  type="date"
                  className="form-input"
                  style={{ marginTop: 4 }}
                  value={companyForm.investment_date}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, investment_date: e.target.value }))}
                />
              ) : (
                <span className="stat-value">{company.investment_date || '—'}</span>
              )}
            </div>
            <div className="company-header-stat">
              <span className="stat-label">Ownership</span>
              {editingCompany ? (
                <input
                  type="number"
                  className="form-input"
                  style={{ marginTop: 4 }}
                  placeholder="%"
                  step="0.01"
                  value={companyForm.ownership_pct}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, ownership_pct: e.target.value }))}
                />
              ) : (
                <span className="stat-value">{company.ownership_pct != null ? `${company.ownership_pct}%` : '—'}</span>
              )}
            </div>
            <div className="company-header-stat">
              <span className="stat-label">Cost Basis</span>
              {editingCompany ? (
                <input
                  type="number"
                  className="form-input"
                  style={{ marginTop: 4 }}
                  placeholder="$"
                  value={companyForm.cost_basis}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, cost_basis: e.target.value }))}
                />
              ) : (
                <span className="stat-value font-mono">{formatCurrency(company.cost_basis)}</span>
              )}
            </div>
            <div className="company-header-stat">
              <span className="stat-label">Valuation</span>
              {editingCompany ? (
                <input
                  type="number"
                  className="form-input"
                  style={{ marginTop: 4 }}
                  placeholder="$"
                  value={companyForm.current_valuation}
                  onChange={(e) => setCompanyForm((p) => ({ ...p, current_valuation: e.target.value }))}
                />
              ) : (
                <span className="stat-value font-mono">{formatCurrency(company.current_valuation)}</span>
              )}
            </div>
            <div className="company-header-stat">
              <span className="stat-label">Health</span>
              <div style={{ marginTop: 4 }}>
                <HealthBadge status={company.health_status} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
          <button
            className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
            onClick={() => setActiveTab('plans')}
          >
            Plans
          </button>
          <button
            className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts
            {alerts.filter((a) => a.state === 'open').length > 0 && (
              <span className="badge badge-yellow" style={{ marginLeft: 6 }}>
                {alerts.filter((a) => a.state === 'open').length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'metrics' && (
          <MetricsTab
            metrics={metrics}
            plans={plans}
            onEnterMetrics={() => setShowMetricModal(true)}
          />
        )}

        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            onSetPlan={() => setShowPlanForm(true)}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab
            alerts={alerts}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
          />
        )}
      </div>

      {showMetricModal && (
        <MetricEntryModal
          plans={plans}
          onClose={() => setShowMetricModal(false)}
          onSubmit={handleMetricSubmit}
        />
      )}

      {showPlanForm && (
        <PlanForm
          onClose={() => setShowPlanForm(false)}
          onSubmit={handlePlanSubmit}
        />
      )}
    </div>
  );
}

function MetricsTab({ metrics, plans, onEnterMetrics }) {
  const getVariance = (metric, plan, field) => {
    if (!metric || metric[field] == null || !plan || plan[field] == null || plan[field] === 0) return null;
    return ((metric[field] - plan[field]) / Math.abs(plan[field])) * 100;
  };

  const varianceClass = (v) => {
    if (v == null) return '';
    if (v > 0) return 'var-green';
    if (v < -15) return 'var-red';
    if (v <= -15 && v < -5) return 'var-yellow';
    return 'var-dim';
  };

  const formatVal = (v, prefix = '', suffix = '') => {
    if (v == null) return '—';
    return `${prefix}${Number(v).toLocaleString()}${suffix}`;
  };

  // Plan lookup by period
  const planByPeriod = {};
  plans.forEach((p) => { planByPeriod[p.period] = p; });

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <span className="card-title">Metrics History</span>
        <button className="btn btn-primary btn-sm" onClick={onEnterMetrics}>
          + Enter Metrics
        </button>
      </div>

      {metrics.length === 0 ? (
        <div className="state-message">No metrics entered yet</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>ARR</th>
                <th>ARR Gr%</th>
                <th>NRR</th>
                <th>Churn%</th>
                <th>Burn</th>
                <th>Runway</th>
                <th>GM%</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                const plan = planByPeriod[m.period];
                return (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.period}</td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'arr'))}`}>
                      {formatVal(m.arr, '$')}
                      {plan && m.arr != null && plan.arr != null && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block' }}>
                          {getVariance(m, plan, 'arr') != null ? `${getVariance(m, plan, 'arr') > 0 ? '+' : ''}${getVariance(m, plan, 'arr').toFixed(1)}%` : ''}
                        </span>
                      )}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'arr_growth_pct'))}`}>
                      {formatVal(m.arr_growth_pct, '', '%')}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'nrr'))}`}>
                      {formatVal(m.nrr, '', '%')}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'churn_pct'))}`}>
                      {formatVal(m.churn_pct, '', '%')}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'burn'))}`}>
                      {formatVal(m.burn, '$')}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'runway_months'))}`}>
                      {formatVal(m.runway_months, '', ' mo')}
                    </td>
                    <td className={`font-mono ${varianceClass(getVariance(m, plan, 'gross_margin_pct'))}`}>
                      {formatVal(m.gross_margin_pct, '', '%')}
                    </td>
                    <td className="font-mono">
                      {m.team_size != null ? m.team_size : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {metrics.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div className="card-title" style={{ marginBottom: 16 }}>Charts (last {Math.min(metrics.length, 8)} periods)</div>
          {['arr', 'nrr', 'churn_pct', 'burn', 'gross_margin_pct'].map((field) => (
            <div key={field} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {field.replace('_', ' ').replace('pct', '%')}
              </div>
              <MetricChart
                data={metrics
                  .slice(0, 8)
                  .reverse()
                  .map((m) => ({ period: m.period, value: m[field] }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlansTab({ plans, onSetPlan }) {
  return (
    <div>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <span className="card-title">Plans by Period</span>
        <button className="btn btn-primary btn-sm" onClick={onSetPlan}>
          + Set Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="state-message">No plans set yet</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>ARR</th>
                <th>ARR Gr%</th>
                <th>NRR</th>
                <th>Churn%</th>
                <th>Burn</th>
                <th>Runway</th>
                <th>GM%</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {[...plans].reverse().map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.period}</td>
                  <td className="font-mono">{p.arr != null ? `$${Number(p.arr).toLocaleString()}` : '—'}</td>
                  <td className="font-mono">{p.arr_growth_pct != null ? `${p.arr_growth_pct}%` : '—'}</td>
                  <td className="font-mono">{p.nrr != null ? `${p.nrr}%` : '—'}</td>
                  <td className="font-mono">{p.churn_pct != null ? `${p.churn_pct}%` : '—'}</td>
                  <td className="font-mono">{p.burn != null ? `$${Number(p.burn).toLocaleString()}` : '—'}</td>
                  <td className="font-mono">{p.runway_months != null ? `${p.runway_months} mo` : '—'}</td>
                  <td className="font-mono">{p.gross_margin_pct != null ? `${p.gross_margin_pct}%` : '—'}</td>
                  <td className="font-mono">{p.team_size != null ? p.team_size : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AlertsTab({ alerts, onAcknowledge, onResolve }) {
  const sorted = [...alerts].sort((a, b) => {
    const order = { open: 0, acknowledged: 1, resolved: 2 };
    return order[a.state] - order[b.state];
  });

  return (
    <div>
      {sorted.length === 0 ? (
        <div className="state-message">No alerts</div>
      ) : (
        sorted.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={() => onAcknowledge(alert.id)}
            onResolve={(note) => onResolve(alert.id, note)}
          />
        ))
      )}
    </div>
  );
}

