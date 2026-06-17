import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CompanyNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    sector: '',
    investment_date: '',
    ownership_pct: '',
    cost_basis: '',
    current_valuation: '',
  });

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      name: form.name,
      sector: form.sector,
      investment_date: form.investment_date,
      ownership_pct: form.ownership_pct ? parseFloat(form.ownership_pct) : null,
      cost_basis: form.cost_basis ? parseFloat(form.cost_basis) : null,
      current_valuation: form.current_valuation ? parseFloat(form.current_valuation) : null,
    };

    try {
      await api.createCompany(payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="app-header">
        <div className="logo">PortfolioOS</div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
          Cancel
        </button>
      </header>

      <div className="container" style={{ paddingTop: 32, maxWidth: 600 }}>
        <h1 className="page-title" style={{ marginBottom: 24 }}>Add Company</h1>

        {error && <div className="state-message error" style={{ marginBottom: 16, textAlign: 'left' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Acme Corp"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sector</label>
              <input
                type="text"
                className="form-input"
                placeholder="SaaS, FinTech, Healthcare..."
                value={form.sector}
                onChange={(e) => setField('sector', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Investment Date</label>
              <input
                type="date"
                className="form-input"
                value={form.investment_date}
                onChange={(e) => setField('investment_date', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ownership %</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="100"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.ownership_pct}
                  onChange={(e) => setField('ownership_pct', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cost Basis ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10000000"
                  step="1"
                  min="0"
                  value={form.cost_basis}
                  onChange={(e) => setField('cost_basis', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Valuation ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="15000000"
                step="1"
                min="0"
                value={form.current_valuation}
                onChange={(e) => setField('current_valuation', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Company'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}