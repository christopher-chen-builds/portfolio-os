import { useState } from 'react';

function getCurrentISOWeek() {
  const now = new Date();
  const thursday = new Date(now.setDate(now.getDate() + 4 - (now.getDay() || 7)));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  return `${thursday.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default function PlanForm({ onClose, onSubmit }) {
  const currentPeriod = getCurrentISOWeek();

  const [form, setForm] = useState({
    period: currentPeriod,
    arr: '',
    arr_growth_pct: '',
    nrr: '',
    churn_pct: '',
    burn: '',
    runway_months: '',
    gross_margin_pct: '',
    team_size: '',
  });

  const [loading, setLoading] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        period: form.period,
        arr: form.arr !== '' ? parseFloat(form.arr) : null,
        arr_growth_pct: form.arr_growth_pct !== '' ? parseFloat(form.arr_growth_pct) : null,
        nrr: form.nrr !== '' ? parseFloat(form.nrr) : null,
        churn_pct: form.churn_pct !== '' ? parseFloat(form.churn_pct) : null,
        burn: form.burn !== '' ? parseFloat(form.burn) : null,
        runway_months: form.runway_months !== '' ? parseFloat(form.runway_months) : null,
        gross_margin_pct: form.gross_margin_pct !== '' ? parseFloat(form.gross_margin_pct) : null,
        team_size: form.team_size !== '' ? parseInt(form.team_size, 10) : null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Set Plan</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Period</label>
              <input
                type="text"
                className="form-input"
                placeholder="2026-W24"
                value={form.period}
                onChange={(e) => setField('period', e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ARR ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="5000000"
                  step="1"
                  value={form.arr}
                  onChange={(e) => setField('arr', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ARR Growth %</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="15"
                  step="0.1"
                  value={form.arr_growth_pct}
                  onChange={(e) => setField('arr_growth_pct', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">NRR %</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="110"
                  step="0.1"
                  value={form.nrr}
                  onChange={(e) => setField('nrr', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Churn %</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="3"
                  step="0.1"
                  value={form.churn_pct}
                  onChange={(e) => setField('churn_pct', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Burn ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="-200000"
                  step="1"
                  value={form.burn}
                  onChange={(e) => setField('burn', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Runway (months)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="18"
                  step="0.5"
                  value={form.runway_months}
                  onChange={(e) => setField('runway_months', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gross Margin %</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="75"
                  step="0.1"
                  value={form.gross_margin_pct}
                  onChange={(e) => setField('gross_margin_pct', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Team Size</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="45"
                  step="1"
                  min="0"
                  value={form.team_size}
                  onChange={(e) => setField('team_size', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Set Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}