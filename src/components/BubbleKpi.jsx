import { useState } from 'react';
import SparklineBars from './SparklineBars';

export default function BubbleKpi({ label, value, status, darkMode, tooltip, sparklineData, invertTrend = false, alerte = false, note = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let trend = 'stable';
  if (sparklineData && sparklineData.length >= 2) {
    const vals = sparklineData.filter(v => v != null && !isNaN(v));
    if (vals.length >= 2) {
      const last = vals[vals.length - 1];
      const prev = vals[vals.length - 2];
      if (last > prev) trend = invertTrend ? 'down' : 'up';
      else if (last < prev) trend = invertTrend ? 'up' : 'down';
    }
  }

  const palette = {
    good:    { accent: '#22c55e', badgeBg: '#dcfce7', badgeText: '#15803d', bar: '#22c55e' },
    neutral: { accent: '#3b82f6', badgeBg: '#dbeafe', badgeText: '#1d4ed8', bar: '#3b82f6' },
    warning: { accent: '#f97316', badgeBg: '#ffedd5', badgeText: '#c2410c', bar: '#f97316' },
    bad:     { accent: '#ef4444', badgeBg: '#fee2e2', badgeText: '#b91c1c', bar: '#ef4444' },
  };
  const p = alerte ? { accent: '#ef4444', badgeBg: '#fee2e2', badgeText: '#b91c1c', bar: '#ef4444' } : (palette[status] || palette.neutral);

  const trendLabel = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—';
  const trendBg    = trend === 'up' ? '#dcfce7' : trend === 'down' ? '#fee2e2' : darkMode ? '#374151' : '#f3f4f6';
  const trendText  = trend === 'up' ? '#15803d' : trend === 'down' ? '#b91c1c' : darkMode ? '#9ca3af' : '#6b7280';

  return (
    <div
      className={alerte ? 'carte-alerte' : ''}
      style={{
        background: darkMode ? '#1f2937' : '#ffffff',
        border: `0.5px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
        borderLeft: `3px solid ${p.accent}`,
        borderRadius: '12px',
        padding: '10px 12px 8px',
        position: 'relative',
        cursor: 'help',
        transition: 'transform 0.15s, box-shadow 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; setShowTooltip(true); }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; setShowTooltip(false); }}
    >
      {alerte && (
        <span style={{
          position: 'absolute', top: '6px', right: '8px',
          fontSize: '9px', fontWeight: 700,
          background: '#ef4444', color: '#fff',
          padding: '1px 5px', borderRadius: '99px',
          letterSpacing: '0.04em',
        }}>⚠ SEUIL</span>
      )}

      <span style={{ fontSize: '11px', color: darkMode ? '#9ca3af' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: alerte ? '50px' : '0' }}>
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '20px', fontWeight: 600, color: alerte ? '#ef4444' : darkMode ? '#f9fafb' : '#111827', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 5px', borderRadius: '99px', background: trendBg, color: trendText, flexShrink: 0 }}>
          {trendLabel}
        </span>
      </div>

      {note && (
        <span style={{
          fontSize: '10px', color: darkMode ? '#6b7280' : '#9ca3af',
          fontStyle: 'italic', lineHeight: 1.4,
          borderTop: `0.5px solid ${darkMode ? '#374151' : '#f3f4f6'}`,
          paddingTop: '4px', marginTop: '2px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          📝 {note}
        </span>
      )}

      {sparklineData && sparklineData.length >= 2 && (
        <div style={{ marginTop: '2px' }}>
          <SparklineBars data={sparklineData} color={p.bar} />
        </div>
      )}

      {showTooltip && tooltip && (
        <div style={{
          position: 'absolute', zIndex: 50, bottom: 'calc(100% + 6px)',
          left: '50%', transform: 'translateX(-50%)',
          background: darkMode ? '#374151' : '#1f2937', color: '#f9fafb',
          fontSize: '11px', padding: '6px 10px', borderRadius: '8px',
          whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          {tooltip}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '4px', borderStyle: 'solid',
            borderColor: `${darkMode ? '#374151' : '#1f2937'} transparent transparent transparent`,
          }} />
        </div>
      )}
    </div>
  );
}
