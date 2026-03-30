export default function SparklineBars({ data, color }) {
  if (!data || data.length < 2) return null;
  const values = data.map(d => typeof d === 'object' ? d.value : d).filter(v => v != null && !isNaN(v));
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toH = (v) => Math.round(8 + ((v - min) / range) * 92);

  const bars = values.slice(-12);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px', width: '100%' }}>
      {bars.map((v, i) => {
        const isLast = i === bars.length - 1;
        return (
          <div key={i} style={{
            flex: 1,
            height: `${toH(v)}%`,
            borderRadius: '2px 2px 0 0',
            background: color,
            opacity: isLast ? 1 : 0.35 + (i / bars.length) * 0.45,
            transition: 'height 0.3s ease',
          }} />
        );
      })}
    </div>
  );
}
