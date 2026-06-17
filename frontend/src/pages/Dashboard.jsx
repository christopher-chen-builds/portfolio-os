import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import HealthBadge from '../components/HealthBadge';

export default function Dashboard({ user, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboard = () => {
    api.getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  if (loading) return <div className="state-message loading">Loading...</div>;
  if (error) return <div className="state-message error">{error}</div>;

  const companies = data?.companies || [];
  const alerts = data?.alerts || [];

  const onPlan = companies.filter((c) => c.health_status === 'green').length;
  const attention = companies.filter((c) => c.health_status === 'yellow').length;
  const critical = companies.filter((c) => c.health_status === 'red').length;

  const openAlerts = alerts.filter((a) => a.state === 'open').length;

  return (
    <div>
      <header className="app-header">
        <div className="logo">PortfolioOS</div>
        <button className="btn btn-danger btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="container dashboard-page">
        <div className="page-header">
          <h1 className="page-title">Portfolio Overview</h1>
          <Link to="/companies/new" className="btn btn-primary">
            + Add Company
          </Link>
        </div>

        <div className="health-bar">
          <div className="health-bar-item">
            <span className="value">{companies.length}</span>
            <span className="label">companies</span>
          </div>
          <div className="health-bar-item">
            <span className="dot dot-green" />
            <span className="value">{onPlan}</span>
            <span className="label">on plan</span>
          </div>
          <div className="health-bar-item">
            <span className="dot dot-yellow" />
            <span className="value">{attention}</span>
            <span className="label">attention</span>
          </div>
          <div className="health-bar-item">
            <span className="dot dot-red" />
            <span className="value">{critical}</span>
            <span className="label">critical</span>
          </div>
          {openAlerts > 0 && (
            <div className="health-bar-item" style={{ marginLeft: 'auto' }}>
              <span className="value" style={{ color: 'var(--yellow)' }}>{openAlerts}</span>
              <span className="label">open alert{openAlerts !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {companies.length === 0 ? (
          <div className="state-message">No companies yet — add your first portfolio company</div>
        ) : (
          <div className="company-grid">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyCard({ company }) {
  const openAlertCount = company.open_alerts || 0;

  return (
    <div className="company-card">
      <div className="company-card-header">
        <div>
          <div className="company-card-name">{company.name}</div>
          <div className="company-card-sector">{company.sector}</div>
        </div>
        <HealthBadge status={company.health_status} />
      </div>

      <div className="company-card-metrics">
        <div className="company-card-metric">
          <span className="metric-label">ARR</span>
          <span className="metric-value font-mono">
            {company.latest_arr != null
              ? `$${Number(company.latest_arr).toLocaleString()}`
              : '—'}
          </span>
        </div>
        <div className="company-card-metric">
          <span className="metric-label">Plan ARR</span>
          <span className="metric-value font-mono text-muted">
            {company.plan_arr != null
              ? `$${Number(company.plan_arr).toLocaleString()}`
              : '—'}
          </span>
        </div>
      </div>

      <div className="company-card-footer">
        <div>
          {openAlertCount > 0 && (
            <span className="badge badge-yellow">
              {openAlertCount} open alert{openAlertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link to={`/companies/${company.id}`} className="btn btn-secondary btn-sm">
          View
        </Link>
      </div>
    </div>
  );
}