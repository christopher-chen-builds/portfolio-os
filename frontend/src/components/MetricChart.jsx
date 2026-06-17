export default function MetricChart({ data }) {
  if (!data || data.length === 0) {
    return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12 }}>No data</div>;
  }

  const values = data.map((d) => d.value).filter((v) => v != null);
  if (values.length === 0) {
    return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 12 }}>No data</div>;
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 100;
  const height = 70;
  const padding = { top: 4, right: 4, bottom: 20, left: 4 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
    value: d.value,
    period: d.period,
  }));

  // Only draw line if we have at least 2 points with values
  const validPoints = points.filter((p) => p.value != null);

  let pathD = '';
  if (validPoints.length >= 2) {
    pathD = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="metric-chart" preserveAspectRatio="none">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padding.top + chartH * (1 - t);
        return (
          <line
            key={t}
            x1={padding.left}
            x2={padding.left + chartW}
            y1={y}
            y2={y}
            className="grid-line"
          />
        );
      })}

      {/* Line */}
      {pathD && (
        <path d={pathD} className="line" />
      )}

      {/* Dots + labels */}
      {validPoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} className="dot" />
          {i === 0 || i === validPoints.length - 1 ? (
            <text
              x={p.x}
              y={height - 2}
              textAnchor={i === 0 ? 'start' : 'end'}
              className="axis-label"
              fontSize={7}
            >
              {p.period}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}