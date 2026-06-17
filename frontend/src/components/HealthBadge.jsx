export default function HealthBadge({ status }) {
  const map = {
    green: { label: 'On Plan', cls: 'badge-green' },
    yellow: { label: 'Attention', cls: 'badge-yellow' },
    red: { label: 'Critical', cls: 'badge-red' },
  };

  const info = map[status] || { label: 'Unknown', cls: 'badge-yellow' };

  return <span className={`badge ${info.cls}`}>{info.label}</span>;
}